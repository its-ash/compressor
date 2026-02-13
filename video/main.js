import init, {
  validate_trim,
  validate_crop,
  generate_ffmpeg_filters,
  build_processing_params,
  format_timestamp,
  parse_timestamp,
  calculate_crop_with_aspect_ratio
} from "./pkg/video_wasm.js";

// Access FFmpeg constructor from global scope (loaded via script tag)
const ffmpegNamespace = window.FFmpegWASM ?? window.FFmpeg;
if (!ffmpegNamespace) {
  throw new Error("FFmpeg WASM bundle is missing. Ensure ffmpeg.min.js is loaded before main.js.");
}

const FfmpegClass = ffmpegNamespace.FFmpeg ?? ffmpegNamespace.default;
if (typeof FfmpegClass !== "function") {
  throw new Error("FFmpeg constructor not found on the global namespace.");
}

// Minimal fetchFile replacement for the browser runtime
const fetchFile = async (source) => {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (ArrayBuffer.isView(source)) {
    const { buffer, byteOffset, byteLength } = source;
    return new Uint8Array(buffer.slice(byteOffset, byteOffset + byteLength));
  }
  if (source instanceof Blob) {
    return new Uint8Array(await source.arrayBuffer());
  }
  if (typeof source === "string") {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  throw new Error("Unsupported data type passed to fetchFile");
};

const FF_VERSION = "0.12.10";
const CORE_URL = new URL(`./ffmpeg-core.js?v=${FF_VERSION}`, document.baseURI).href;
const WASM_URL = new URL(`./ffmpeg-core.wasm?v=${FF_VERSION}`, document.baseURI).href;
const WORKER_URL = new URL(`./ffmpeg-core.worker.js?v=${FF_VERSION}`, document.baseURI).href;

const ffmpeg = new FfmpegClass();

const handleFfmpegLog = (event) => {
  const message = typeof event === "string" ? event : event?.message;
  if (message) {
    console.log(`[ffmpeg] ${message}`);
  }
};

const handleFfmpegProgress = (payload) => {
  const ratioValue = typeof payload === "number"
    ? payload
    : Number(payload?.ratio ?? payload?.progress ?? 0);
  if (Number.isFinite(ratioValue) && ratioValue > 0 && ratioValue <= 1) {
    setProgress(ratioValue * 100, `${Math.round(ratioValue * 100)}%`);
  }
};

if (typeof ffmpeg.on === "function") {
  ffmpeg.on("log", handleFfmpegLog);
  ffmpeg.on("progress", handleFfmpegProgress);
}

// Initialize WASM module
let wasmReady = false;
init().then(() => {
  wasmReady = true;
  console.log("✅ Rust WASM module loaded");
}).catch(err => {
  console.error("❌ Failed to load Rust WASM:", err);
});

// DOM elements
const videoInput = document.getElementById("videoInput");
const processBtn = document.getElementById("processBtn");
const processBatchBtn = document.getElementById("processBatchBtn");
const statusEl = document.getElementById("status");
const fileCountEl = document.getElementById("fileCount");
const progressEl = document.getElementById("progress");
const progressBar = document.getElementById("progressBar");
const resolutionSelect = document.getElementById("resolutionSelect");
const presetSelect = document.getElementById("presetSelect");
const crfInput = document.getElementById("crfInput");
const crfValue = document.getElementById("crfValue");
const startInput = document.getElementById("startInput");
const endInput = document.getElementById("endInput");
const startLabel = document.getElementById("startLabel");
const endLabel = document.getElementById("endLabel");
const cropWidthInput = document.getElementById("cropWidth");
const cropHeightInput = document.getElementById("cropHeight");
const cropXInput = document.getElementById("cropX");
const cropYInput = document.getElementById("cropY");
const preview = document.getElementById("preview");
const videoShell = document.getElementById("videoShell");
const cropOverlay = document.getElementById("cropOverlay");
const emptyState = document.getElementById("emptyState");
const playBtn = document.getElementById("playBtn");
const timeDisplay = document.getElementById("timeDisplay");
const trimStart = document.getElementById("trimStart");
const trimEnd = document.getElementById("trimEnd");
const playhead = document.getElementById("playhead");
const fileList = document.getElementById("fileList");
const fileListItems = document.getElementById("fileListItems");

// State
let ffmpegReady = false;
let activePreviewUrl = null;
let videoDuration = 0;
let cropState = { x: 0, y: 0, w: 100, h: 100 };
let pointerState = null;
let trimState = { start: 0, end: 100 };
let isDraggingTrim = null;
let isPlaying = false;
let currentFiles = [];
let currentFileIndex = 0;

// FFmpeg instance is created above so we can keep a single worker alive

// Initialize FFmpeg
async function ensureFfmpeg() {
  if (ffmpegReady) return;
  setStatus("Loading FFmpeg (~25 MB)...");
  await ffmpeg.load({
    coreURL: CORE_URL,
    wasmURL: WASM_URL,
    workerURL: WORKER_URL,
  });
  ffmpegReady = true;
  setStatus("FFmpeg loaded.");
}

// Utility functions
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const prettySize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const setStatus = (message) => {
  statusEl.innerHTML = message ? `<strong>Status:</strong> ${message}` : "";
};

const setProgress = (percent, label = "") => {
  const pct = Math.max(0, Math.min(100, percent));
  progressEl.style.opacity = 1;
  progressBar.style.width = `${pct}%`;
  progressBar.textContent = label || `${pct}%`;
};

const resetProgress = () => {
  progressEl.style.opacity = 0;
  progressBar.style.width = "0%";
  progressBar.textContent = "";
};

const parseTimecode = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p) || p < 0)) return null;
  let seconds = 0;
  for (let i = 0; i < parts.length; i += 1) {
    seconds = seconds * 60 + parts[i];
  }
  return seconds;
};

const toTimecode = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts = hrs > 0 ? [hrs, mins, secs] : [mins, secs];
  return parts.map((p) => p.toString().padStart(2, "0")).join(":");
};

const updateTimeDisplay = () => {
  const current = preview.currentTime || 0;
  const duration = videoDuration || 0;
  timeDisplay.textContent = `${toTimecode(current)} / ${toTimecode(duration)}`;
  
  if (duration > 0) {
    const percent = (current / duration) * 100;
    const seekProgress = document.getElementById("seekProgress");
    if (seekProgress) seekProgress.style.width = `${percent}%`;
    playhead.style.left = `${percent}%`;
  }
};

const updateTrimHandles = () => {
  trimStart.style.left = `${trimState.start}%`;
  trimEnd.style.left = `${trimState.end}%`;
  
  const startSec = (trimState.start / 100) * videoDuration;
  const endSec = (trimState.end / 100) * videoDuration;
  
  startLabel.textContent = toTimecode(startSec);
  endLabel.textContent = toTimecode(endSec);
  
  startInput.value = toTimecode(startSec);
  endInput.value = trimState.end >= 99.5 ? "" : toTimecode(endSec);
  
  // Update timeline content width
  const timelineContent = document.querySelector(".timeline-content");
  if (timelineContent) {
    timelineContent.style.left = `${trimState.start}%`;
    timelineContent.style.right = `${100 - trimState.end}%`;
  }
};

const applyCropOverlay = () => {
  const shellRect = videoShell.getBoundingClientRect();
  if (!shellRect.width || !shellRect.height) return;
  const { x, y, w, h } = cropState;
  cropOverlay.style.left = `${x}%`;
  cropOverlay.style.top = `${y}%`;
  cropOverlay.style.width = `${w}%`;
  cropOverlay.style.height = `${h}%`;

  if (preview.videoWidth && preview.videoHeight) {
    const pxW = Math.round((w / 100) * preview.videoWidth);
    const pxH = Math.round((h / 100) * preview.videoHeight);
    const pxX = Math.round((x / 100) * preview.videoWidth);
    const pxY = Math.round((y / 100) * preview.videoHeight);
    cropWidthInput.value = pxW;
    cropHeightInput.value = pxH;
    cropXInput.value = pxX;
    cropYInput.value = pxY;
  }
};

const safeUnlink = async (path) => {
  if (!ffmpegReady) return;
  try {
    await ffmpeg.deleteFile(path);
  } catch (err) {
    // File might not exist; ignore.
  }
};

// File handling
const renderFileInfo = async () => {
  const files = Array.from(videoInput?.files || []);
  
  if (files.length === 0) {
    fileCountEl.textContent = "No videos selected.";
    if (activePreviewUrl) {
      URL.revokeObjectURL(activePreviewUrl);
      activePreviewUrl = null;
    }
    preview.style.display = "none";
    preview.removeAttribute("src");
    videoShell.style.display = "none";
    cropOverlay.style.display = "none";
    emptyState.style.display = "flex";
    if (fileList) fileList.style.display = "none";
    if (processBatchBtn) processBatchBtn.style.display = "none";
    currentFiles = [];
    currentFileIndex = 0;
    return;
  }

  // Store files for processing
  currentFiles = files.map(file => ({ file, name: file.name, size: file.size }));
  
  // Show batch processing UI if multiple files
  if (currentFiles.length > 1 && processBatchBtn && fileList && fileListItems) {
    processBatchBtn.style.display = "block";
    fileList.style.display = "block";
    
    let listHTML = `<p style="margin-bottom: 8px;"><strong>${currentFiles.length} files ready:</strong></p>`;
    currentFiles.forEach((info) => {
      listHTML += `<div style="padding: 4px 0; border-bottom: 1px solid var(--border);">
        🎬 ${info.name} (${prettySize(info.size)})
      </div>`;
    });
    fileListItems.innerHTML = listHTML;
    
    const totalSize = currentFiles.reduce((sum, f) => sum + f.size, 0);
    fileCountEl.textContent = `${currentFiles.length} files • ${prettySize(totalSize)}`;
  } else {
    if (processBatchBtn) processBatchBtn.style.display = "none";
    if (fileList) fileList.style.display = "none";
    fileCountEl.textContent = `${currentFiles[0].name} • ${prettySize(currentFiles[0].size)}`;
  }
  
  // Load first file for preview
  loadFilePreview(0);
};

const loadFilePreview = (index) => {
  if (index < 0 || index >= currentFiles.length) return;
  
  currentFileIndex = index;
  const file = currentFiles[index].file;
  
  if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
  activePreviewUrl = URL.createObjectURL(file);
  preview.src = activePreviewUrl;
  preview.style.display = "block";
  videoShell.style.display = "block";
  emptyState.style.display = "none";
};

// Video processing
const handleProcess = async () => {
  if (currentFiles.length === 0) {
    setStatus("Add a video to begin.");
    return;
  }

  const file = currentFiles[currentFileIndex].file;
  await processVideo(file, currentFileIndex);
};

const handleBatchProcess = async () => {
  if (currentFiles.length === 0) {
    setStatus("Add videos to begin.");
    return;
  }

  processBtn.disabled = true;
  if (processBatchBtn) processBatchBtn.disabled = true;
  
  for (let i = 0; i < currentFiles.length; i++) {
    setStatus(`Processing file ${i + 1} of ${currentFiles.length}...`);
    await processVideo(currentFiles[i].file, i);
    
    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  setStatus(`Batch complete! Processed ${currentFiles.length} files.`);
  processBtn.disabled = false;
  if (processBatchBtn) processBatchBtn.disabled = false;
  setTimeout(resetProgress, 2000);
};

const processVideo = async (file, index) => {
  const startSec = parseTimecode(startInput.value);
  const endSec = parseTimecode(endInput.value);
  const videoDuration = preview.duration || 0;
  
  // Validate trim parameters using Rust WASM
  if (wasmReady && startSec !== null && endSec !== null) {
    const trimValidation = validate_trim(startSec, endSec, videoDuration);
    if (!trimValidation.is_valid) {
      setStatus(`Trim error: ${trimValidation.error}`);
      return;
    }
  } else if (startSec !== null && endSec !== null && endSec <= startSec) {
    setStatus("Trim end must be after trim start.");
    return;
  }

  const naturalW = preview.videoWidth || 0;
  const naturalH = preview.videoHeight || 0;
  let cropPx = null;
  
  if (naturalW && naturalH && (cropState.w < 99 || cropState.h < 99)) {
    const rawW = Math.max(1, Math.round((cropState.w / 100) * naturalW));
    const rawH = Math.max(1, Math.round((cropState.h / 100) * naturalH));
    const rawX = Math.max(0, Math.round((cropState.x / 100) * naturalW));
    const rawY = Math.max(0, Math.round((cropState.y / 100) * naturalH));
    
    // Validate crop parameters using Rust WASM
    if (wasmReady) {
      const cropValidation = validate_crop(rawX, rawY, rawW, rawH, naturalW, naturalH);
      if (!cropValidation.is_valid) {
        setStatus(`Crop error: ${cropValidation.error}`);
        return;
      }
      // Use validated dimensions from Rust (ensures even numbers for H.264)
      cropPx = {
        w: cropValidation.width,
        h: cropValidation.height,
        x: cropValidation.x,
        y: cropValidation.y
      };
    } else {
      // Fallback without Rust validation
      cropPx = {
        w: rawW % 2 === 0 ? rawW : rawW - 1,
        h: rawH % 2 === 0 ? rawH : rawH - 1,
        x: rawX,
        y: rawY
      };
    }
  }

  processBtn.disabled = true;
  resetProgress();
  setStatus("Preparing WebAssembly pipeline...");

  try {
    await ensureFfmpeg();

    const inputName = `input_${index}.mp4`;
    const outputName = `output_${index}.mp4`;
    await safeUnlink(inputName);
    await safeUnlink(outputName);

    setStatus("Loading file into memory...");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Determine scale dimensions
    const scaleMap = {
      "1080": [1920, 1080],
      "720": [1280, 720],
      "480": [854, 480],
    };
    const resChoice = resolutionSelect.value;
    const scaleW = (resChoice !== "source" && scaleMap[resChoice]) ? scaleMap[resChoice][0] : null;
    const scaleH = (resChoice !== "source" && scaleMap[resChoice]) ? scaleMap[resChoice][1] : null;

    // Generate FFmpeg filters using Rust WASM
    let filterString = "";
    if (wasmReady && (cropPx || scaleW)) {
      const cropJs = cropPx ? {
        x: cropPx.x,
        y: cropPx.y,
        width: cropPx.w,
        height: cropPx.h,
        is_valid: true,
        error: null
      } : null;
      
      filterString = generate_ffmpeg_filters(cropJs, scaleW, scaleH);
      console.log(`🦀 Rust-generated filters: ${filterString}`);
    } else {
      // Fallback: manually build filters
      const filters = [];
      if (cropPx) {
        filters.push(`crop=${cropPx.w}:${cropPx.h}:${cropPx.x}:${cropPx.y}`);
      }
      if (scaleW && scaleH) {
        filters.push(`scale=${scaleW}:${scaleH}`);
      }
      filterString = filters.length ? filters.join(",") : "null";
    }

    const vfArgs = (filterString && filterString !== "null") ? ["-vf", filterString] : [];

    const args = [
      ...(startSec !== null ? ["-ss", toTimecode(startSec)] : []),
      "-i",
      inputName,
      ...(endSec !== null ? ["-to", toTimecode(endSec)] : []),
      ...vfArgs,
      "-c:v",
      "libx264",
      "-preset",
      presetSelect.value,
      "-crf",
      crfInput.value,
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "faststart",
      outputName,
    ];

    setStatus("Encoding with FFmpeg...");
    setProgress(10, "Encoding...");
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const outputBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const url = URL.createObjectURL(new Blob([outputBuffer], { type: "video/mp4" }));
    
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const filename = `${baseName}-compressed-${Date.now()}.mp4`;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    // Update preview with processed video (only for single file)
    if (currentFiles.length === 1) {
      if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
      activePreviewUrl = url;
      preview.src = url;
      preview.load();
    }

    setStatus(`✓ Saved ${filename}`);
    setProgress(100, "Done");
    
    // Cleanup
    await safeUnlink(inputName);
    await safeUnlink(outputName);
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    if (currentFiles.length === 1) {
      processBtn.disabled = false;
    }
    if (currentFiles.length > 1 && index === currentFiles.length - 1) {
      setTimeout(resetProgress, 800);
    }
  }
};

// Event listeners
videoInput.addEventListener("change", () => {
  renderFileInfo();
  setStatus("");
});

preview.addEventListener("loadedmetadata", () => {
  videoDuration = Number.isFinite(preview.duration) ? preview.duration : 0;
  trimState = { start: 0, end: 100 };
  updateTrimHandles();
  cropState = { x: 0, y: 0, w: 100, h: 100 };
  cropOverlay.style.display = "block";
  applyCropOverlay();
  updateTimeDisplay();
});

preview.addEventListener("timeupdate", updateTimeDisplay);

preview.addEventListener("play", () => {
  isPlaying = true;
  playBtn.textContent = "⏸";
});

preview.addEventListener("pause", () => {
  isPlaying = false;
  playBtn.textContent = "▶";
});

playBtn.addEventListener("click", () => {
  if (!preview.src) return;
  if (isPlaying) {
    preview.pause();
  } else {
    preview.play();
  }
});

// Seek bar interaction
const seekBar = document.getElementById("seekBar");
if (seekBar) {
  seekBar.addEventListener("click", (e) => {
    if (!videoDuration) return;
    const rect = seekBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    preview.currentTime = percent * videoDuration;
  });
}

// Volume control
const volumeBtn = document.getElementById("volumeBtn");
const volumeSlider = document.querySelector(".volume-slider");
const volumeFill = document.getElementById("volumeFill");

if (volumeSlider && volumeFill) {
  volumeSlider.addEventListener("click", (e) => {
    const rect = volumeSlider.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    preview.volume = Math.max(0, Math.min(1, percent));
    volumeFill.style.width = `${percent * 100}%`;
  });
}

if (volumeBtn) {
  volumeBtn.addEventListener("click", () => {
    preview.muted = !preview.muted;
    volumeBtn.textContent = preview.muted ? "🔇" : "🔊";
  });
}

crfInput.addEventListener("input", () => {
  crfValue.textContent = crfInput.value;
});

startInput.addEventListener("change", () => {
  const sec = clamp(parseTimecode(startInput.value) ?? 0, 0, videoDuration);
  trimState.start = (sec / videoDuration) * 100;
  updateTrimHandles();
});

endInput.addEventListener("change", () => {
  const sec = parseTimecode(endInput.value);
  if (sec !== null) {
    trimState.end = Math.min((sec / videoDuration) * 100, 100);
    updateTrimHandles();
  }
});

processBtn.addEventListener("click", handleProcess);
if (processBatchBtn) {
  processBatchBtn.addEventListener("click", handleBatchProcess);
}

// Timeline trim handles
trimStart.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  isDraggingTrim = "start";
  window.addEventListener("pointermove", onTrimDrag);
  window.addEventListener("pointerup", stopTrimDrag, { once: true });
});

trimEnd.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  isDraggingTrim = "end";
  window.addEventListener("pointermove", onTrimDrag);
  window.addEventListener("pointerup", stopTrimDrag, { once: true });
});

function onTrimDrag(e) {
  if (!isDraggingTrim) return;
  const track = trimStart.parentElement;
  const rect = track.getBoundingClientRect();
  const percent = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
  
  if (isDraggingTrim === "start") {
    trimState.start = Math.min(percent, trimState.end - 1);
  } else {
    trimState.end = Math.max(percent, trimState.start + 1);
  }
  
  updateTrimHandles();
}

function stopTrimDrag() {
  window.removeEventListener("pointermove", onTrimDrag);
  isDraggingTrim = null;
}

// Crop overlay interactions
function startCropDrag(event, mode) {
  event.preventDefault();
  const shellRect = videoShell.getBoundingClientRect();
  pointerState = {
    mode,
    startX: event.clientX,
    startY: event.clientY,
    rect: { ...cropState },
    shellW: shellRect.width,
    shellH: shellRect.height,
  };
  window.addEventListener("pointermove", onCropPointerMove);
  window.addEventListener("pointerup", stopCropDrag, { once: true });
}

function onCropPointerMove(event) {
  if (!pointerState) return;
  const dxPct = ((event.clientX - pointerState.startX) / pointerState.shellW) * 100;
  const dyPct = ((event.clientY - pointerState.startY) / pointerState.shellH) * 100;
  const next = { ...pointerState.rect };

  if (pointerState.mode === "move") {
    next.x = clamp(pointerState.rect.x + dxPct, 0, 100 - pointerState.rect.w);
    next.y = clamp(pointerState.rect.y + dyPct, 0, 100 - pointerState.rect.h);
  } else {
    const { mode } = pointerState;
    if (mode.includes("l")) {
      next.x = clamp(pointerState.rect.x + dxPct, 0, pointerState.rect.x + pointerState.rect.w - 5);
      next.w = clamp(pointerState.rect.w - dxPct, 5, 100 - next.x);
    }
    if (mode.includes("r")) {
      next.w = clamp(pointerState.rect.w + dxPct, 5, 100 - pointerState.rect.x);
    }
    if (mode.includes("t")) {
      next.y = clamp(pointerState.rect.y + dyPct, 0, pointerState.rect.y + pointerState.rect.h - 5);
      next.h = clamp(pointerState.rect.h - dyPct, 5, 100 - next.y);
    }
    if (mode.includes("b")) {
      next.h = clamp(pointerState.rect.h + dyPct, 5, 100 - pointerState.rect.y);
    }
  }

  cropState = next;
  applyCropOverlay();
}

function stopCropDrag() {
  window.removeEventListener("pointermove", onCropPointerMove);
  pointerState = null;
}

cropOverlay.addEventListener("pointerdown", (event) => {
  const handle = event.target.dataset?.handle;
  startCropDrag(event, handle ? handle : "move");
});

// Initialize
renderFileInfo();
setStatus("");
