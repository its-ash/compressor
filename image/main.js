import init, {
  compress_image,
  crop_image,
  perspective_crop,
} from "./pkg/image_tools.js";

const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const statusEl = document.getElementById("status");
const previewImg = document.getElementById("preview");
const metaEl = document.getElementById("meta");
const processBtn = document.getElementById("processBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const modeCropBtn = document.getElementById("modeCrop");
const modePerspectiveBtn = document.getElementById("modePerspective");
const cropBox = document.getElementById("cropBox");
const cropSizeEl = document.getElementById("cropSize");
const perspOverlay = document.getElementById("perspOverlay");
const perspSvg = document.getElementById("perspSvg");
const perspPolygon = document.getElementById("perspPolygon");
const perspectiveHandleElements = Array.from(document.querySelectorAll(".persp-handle"));
const perspectiveHandles = perspectiveHandleElements.reduce((acc, el) => {
  const key = el.dataset.point;
  if (key) acc[key] = el;
  return acc;
}, {});

const formatSelect = document.getElementById("formatSelect");
const qualityRow = document.getElementById("qualityRow");
const qualityInput = document.getElementById("qualityInput");
const qualityValue = document.getElementById("qualityValue");

const placeholderSvgMarkup = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-label="Placeholder preview">
  <defs>
    <linearGradient id="placeholderGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <pattern id="placeholderPattern" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="48" height="48" fill="none" stroke="#334155" stroke-width="1" />
      <rect x="0" y="0" width="16" height="16" fill="#0f172a" opacity="0.35" />
      <rect x="32" y="32" width="16" height="16" fill="#0f172a" opacity="0.35" />
    </pattern>
  </defs>
  <rect width="1280" height="720" fill="url(#placeholderGradient)" />
  <rect x="40" y="40" width="1200" height="640" fill="url(#placeholderPattern)" opacity="0.5" />
  <g fill="none" stroke="#38bdf8" stroke-width="6" opacity="0.35">
    <path d="M120 520 L320 320 L520 520" />
    <path d="M760 520 L960 320 L1160 520" />
    <circle cx="640" cy="300" r="90" />
  </g>
  <g fill="#38bdf8" opacity="0.85">
    <text x="640" y="370" text-anchor="middle" font-size="48" font-family="'Space Grotesk', 'IBM Plex Mono', monospace">Drop or browse an image</text>
    <text x="640" y="430" text-anchor="middle" font-size="24" font-family="'IBM Plex Mono', monospace" opacity="0.7">Preview updates after processing</text>
  </g>
</svg>
`.trim();

const defaultPreviewSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvgMarkup)}`;

if (previewImg && !previewImg.getAttribute("src")) {
  previewImg.src = defaultPreviewSrc;
}

if (metaEl) {
  metaEl.textContent = "Load an image to begin cropping.";
}

let wasmReadyPromise = null;
let currentBytes = null;
let originalBytes = null;
let currentDims = null;
let previewUrl = null;
let cropRect = { x: 0, y: 0, w: 1, h: 1 }; // normalized to preview image
let perspPoints = {
  tl: { x: 0, y: 0 },
  tr: { x: 1, y: 0 },
  br: { x: 1, y: 1 },
  bl: { x: 0, y: 1 },
};
let activeMode = "crop";

const ensureWasm = () => {
  if (!wasmReadyPromise) {
    wasmReadyPromise = init();
  }
  return wasmReadyPromise;
};

const prettySize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const setDownloadLabel = (value) => {
  if (!downloadBtn) return;
  if (typeof value === "number" && Number.isFinite(value)) {
    downloadBtn.textContent = `Download (${prettySize(value)})`;
    return;
  }
  if (typeof value === "string") {
    downloadBtn.textContent = value;
    return;
  }
  downloadBtn.textContent = "Download";
};

const setStatus = (message) => {
  statusEl.textContent = message || "";
};

const readFileAsBytes = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.readAsArrayBuffer(file);
  });

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const HEIC_EXTENSION = /\.hei[cf]$/i;

const isHeicFile = (file) => {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  if (type && HEIC_MIME_TYPES.has(type)) {
    return true;
  }
  return HEIC_EXTENSION.test(file.name || "");
};

const canvasToBlob = (canvas, type) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to convert canvas to blob"));
      }
    }, type);
  });

const drawSourceToPngBytes = async (source, width, height) => {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to initialise canvas context");
    ctx.drawImage(source, 0, 0, width, height);
    source.close?.();
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return new Uint8Array(await blob.arrayBuffer());
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to initialise canvas context");
  ctx.drawImage(source, 0, 0, width, height);
  source.close?.();
  const blob = await canvasToBlob(canvas, "image/png");
  return new Uint8Array(await blob.arrayBuffer());
};

const convertHeicWithImageDecoder = async (buffer, type) => {
  if (typeof ImageDecoder === "undefined") {
    return null;
  }
  try {
    const decoder = new ImageDecoder({ data: new Uint8Array(buffer), type });
    const { image } = await decoder.decode();
    const width = image.displayWidth || image.codedWidth;
    const height = image.displayHeight || image.codedHeight;
    const bytes = await drawSourceToPngBytes(image, width, height);
    decoder.close?.();
    return { bytes, dimensions: { width, height } };
  } catch (err) {
    console.warn("ImageDecoder HEIC conversion failed", err);
    return null;
  }
};

const convertHeicWithBitmap = async (buffer, type) => {
  if (typeof createImageBitmap === "undefined") {
    return null;
  }
  try {
    const blob = new Blob([buffer], { type });
    const bitmap = await createImageBitmap(blob);
    const bytes = await drawSourceToPngBytes(bitmap, bitmap.width, bitmap.height);
    return { bytes, dimensions: { width: bitmap.width, height: bitmap.height } };
  } catch (err) {
    console.warn("ImageBitmap HEIC conversion failed", err);
    return null;
  }
};

const convertHeicFile = async (file) => {
  const type = (file.type || "image/heic").toLowerCase();
  const buffer = await file.arrayBuffer();

  const viaDecoder = await convertHeicWithImageDecoder(buffer, type);
  if (viaDecoder) {
    return {
      ...viaDecoder,
      note: "Converted HEIC to PNG for editing.",
    };
  }

  const viaBitmap = await convertHeicWithBitmap(buffer, type);
  if (viaBitmap) {
    return {
      ...viaBitmap,
      note: "Converted HEIC to PNG for editing.",
    };
  }

  return null;
};

const loadImageBytes = async (file) => {
  if (!file) return null;
  if (isHeicFile(file)) {
    const converted = await convertHeicFile(file);
    if (!converted) {
      throw new Error("Unable to convert HEIC. Please try a different browser or format.");
    }
    return converted;
  }

  const bytes = await readFileAsBytes(file);
  return { bytes };
};

const extractDimensions = (bytes) =>
  new Promise((resolve, reject) => {
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image dimensions"));
    };
    img.src = url;
  });

const updatePreview = async (bytes, providedDims = null) => {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }
  const blob = new Blob([bytes]);
  previewUrl = URL.createObjectURL(blob);
  previewImg.src = previewUrl;
  const dims = providedDims ?? (await extractDimensions(bytes).catch(() => null));
  currentDims = dims;
  const dimText = dims ? `${dims.width}×${dims.height}px` : null;
  metaEl.textContent = dimText ? `${dimText} • ${prettySize(bytes.length)}` : prettySize(bytes.length);
  cancelProjectedSize();
  setDownloadLabel(bytes.length);
  updateCropOverlay();
  updatePerspectiveOverlay();
};

const setDefaultsFromDims = (dims) => {
  if (!dims) return;
  cropRect = { x: 0, y: 0, w: 1, h: 1 };
  updateCropOverlay();

  perspPoints = {
    tl: { x: 0, y: 0 },
    tr: { x: 1, y: 0 },
    br: { x: 1, y: 1 },
    bl: { x: 0, y: 1 },
  };
  updatePerspectiveOverlay();
};

const handleFile = async (file) => {
  if (!file) return;
  const heicCandidate = isHeicFile(file);
  setStatus(heicCandidate ? "Converting HEIC..." : "Loading image...");
  try {
    const loaded = await loadImageBytes(file);
    if (!loaded || !loaded.bytes) {
      throw new Error("Unable to read image bytes");
    }
    const bytes = loaded.bytes;
    originalBytes = bytes;
    currentBytes = bytes;
    let dims = loaded.dimensions || null;
    if (!dims) {
      dims = await extractDimensions(bytes);
    }
    setMode("crop", { silent: true });
    setDefaultsFromDims(dims);
    await updatePreview(bytes, dims);
    updateQualityLabel();
    const messages = [];
    if (loaded.note) messages.push(loaded.note);
    messages.push("Image ready. Choose a mode, adjust, then hit Process.");
    setStatus(messages.join(" "));
    downloadBtn.disabled = false;
    processBtn.disabled = false;
    resetBtn.disabled = false;
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err));
  }
};

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const updateQualityLabel = () => {
  if (!qualityValue || !qualityInput) return;
  qualityValue.textContent = `${qualityInput.value}%`;
};

const getOutputSettings = () => {
  const format = formatSelect?.value ?? "png";
  const sliderValue = Number(qualityInput?.value ?? 80);
  const quality = Math.max(10, Math.min(100, Math.round(Number.isFinite(sliderValue) ? sliderValue : 80)));
  return { format, quality };
};

const updateQualityVisibility = () => {
  const isJpeg = (formatSelect?.value ?? "") === "jpeg";
  if (qualityRow) {
    qualityRow.style.display = isJpeg ? "grid" : "none";
  }
  if (qualityInput) {
    qualityInput.disabled = !isJpeg;
  }
  if (qualityValue) {
    qualityValue.style.display = isJpeg ? "inline" : "none";
  }
};

let projectedSizeTimer = null;
let projectedSizeToken = 0;

const cancelProjectedSize = () => {
  projectedSizeToken += 1;
  if (projectedSizeTimer) {
    clearTimeout(projectedSizeTimer);
    projectedSizeTimer = null;
  }
};

const requestProjectedDownloadSize = () => {
  if (!currentBytes) {
    cancelProjectedSize();
    setDownloadLabel(null);
    return;
  }

  const { format, quality } = getOutputSettings();
  const token = ++projectedSizeToken;

  if (projectedSizeTimer) {
    clearTimeout(projectedSizeTimer);
  }

  setDownloadLabel("Download (estimating…)");

  projectedSizeTimer = setTimeout(async () => {
    try {
      await ensureWasm();
      const projected = compress_image(currentBytes, quality, format);
      if (projectedSizeToken !== token) {
        return;
      }
      setDownloadLabel(projected.length);
    } catch (err) {
      if (projectedSizeToken !== token) {
        return;
      }
      console.warn("Failed to estimate compressed size", err);
      setDownloadLabel(null);
    } finally {
      if (projectedSizeToken === token) {
        projectedSizeTimer = null;
      }
    }
  }, 180);
};

const handleQualityChange = () => {
  updateQualityLabel();
  requestProjectedDownloadSize();
};

const updatePerspectiveOverlay = () => {
  if (!perspOverlay || !perspSvg || !perspPolygon) return;
  if (!currentDims || activeMode !== "perspective") {
    perspOverlay.style.display = "none";
    return;
  }

  const rect = previewImg.getBoundingClientRect();
  const displayW = rect.width;
  const displayH = rect.height;
  if (!displayW || !displayH) {
    perspOverlay.style.display = "none";
    return;
  }

  perspOverlay.style.display = "block";
  perspOverlay.style.width = `${displayW}px`;
  perspOverlay.style.height = `${displayH}px`;

  perspSvg.setAttribute("width", `${displayW}`);
  perspSvg.setAttribute("height", `${displayH}`);
  perspSvg.setAttribute("viewBox", `0 0 ${displayW} ${displayH}`);

  const pointsPx = {
    tl: { x: perspPoints.tl.x * displayW, y: perspPoints.tl.y * displayH },
    tr: { x: perspPoints.tr.x * displayW, y: perspPoints.tr.y * displayH },
    br: { x: perspPoints.br.x * displayW, y: perspPoints.br.y * displayH },
    bl: { x: perspPoints.bl.x * displayW, y: perspPoints.bl.y * displayH },
  };

  const polygonPoints = `${pointsPx.tl.x},${pointsPx.tl.y} ${pointsPx.tr.x},${pointsPx.tr.y} ${pointsPx.br.x},${pointsPx.br.y} ${pointsPx.bl.x},${pointsPx.bl.y}`;
  perspPolygon.setAttribute("points", polygonPoints);

  Object.entries(perspectiveHandles).forEach(([key, el]) => {
    const pos = pointsPx[key];
    if (!el || !pos) return;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
  });
};

const attachPerspectiveInteractions = () => {
  if (!perspectiveHandleElements.length) return;

  let activeHandle = null;
  let activeElement = null;

  const stop = (event) => {
    if (activeElement && event) {
      activeElement.releasePointerCapture?.(event.pointerId);
    }
    activeHandle = null;
    activeElement = null;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", stop);
    document.removeEventListener("pointercancel", stop);
  };

  const updateFromEvent = (event) => {
    if (!currentDims || !activeHandle) return;
    const rect = previewImg.getBoundingClientRect();
    const displayW = rect.width;
    const displayH = rect.height;
    if (!displayW || !displayH) return;
    const x = clamp01((event.clientX - rect.left) / displayW);
    const y = clamp01((event.clientY - rect.top) / displayH);
    perspPoints = {
      ...perspPoints,
      [activeHandle]: { x, y },
    };
    updatePerspectiveOverlay();
  };

  const onMove = (event) => {
    if (!activeHandle) return;
    updateFromEvent(event);
  };

  const onDown = (event) => {
    if (!currentDims || activeMode !== "perspective") return;
    const key = event.target.dataset.point;
    if (!key) return;
    activeHandle = key;
    activeElement = event.target;
    event.preventDefault();
    event.target.setPointerCapture?.(event.pointerId);
    updateFromEvent(event);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
  };

  perspectiveHandleElements.forEach((element) => {
    element.addEventListener("pointerdown", onDown);
  });
};

const updateCropSizeLabel = () => {
  if (!cropSizeEl) return;
  if (!currentDims || activeMode !== "crop") {
    cropSizeEl.style.display = "none";
    cropSizeEl.textContent = "";
    return;
  }

  const width = Math.max(1, Math.round(cropRect.w * currentDims.width));
  const height = Math.max(1, Math.round(cropRect.h * currentDims.height));
  cropSizeEl.textContent = `${width}×${height}px`;
  cropSizeEl.style.display = "block";
};

const updateCropOverlay = () => {
  if (!previewImg || !cropBox) return;
  if (!currentDims || activeMode !== "crop") {
    cropBox.style.display = "none";
    updateCropSizeLabel();
    return;
  }

  const displayW = previewImg.clientWidth;
  const displayH = previewImg.clientHeight;
  if (!displayW || !displayH) {
    cropBox.style.display = "none";
    updateCropSizeLabel();
    return;
  }

  cropBox.style.display = "block";
  cropBox.style.left = `${cropRect.x * displayW}px`;
  cropBox.style.top = `${cropRect.y * displayH}px`;
  cropBox.style.width = `${cropRect.w * displayW}px`;
  cropBox.style.height = `${cropRect.h * displayH}px`;
  updateCropSizeLabel();
};

const attachCropInteractions = () => {
  if (!cropBox || !previewImg) return;

  let activeHandle = null;
  let startRect = null;
  let startClient = null;

  const stop = () => {
    activeHandle = null;
    startRect = null;
    startClient = null;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", stop);
    document.removeEventListener("pointercancel", stop);
  };

  const onMove = (event) => {
    if (!activeHandle || !startRect || !currentDims) return;
    const displayW = previewImg.clientWidth;
    const displayH = previewImg.clientHeight;
    if (!displayW || !displayH) return;

    const dx = (event.clientX - startClient.x) / displayW;
    const dy = (event.clientY - startClient.y) / displayH;

    let { x, y, w, h } = startRect;
    const minW = 4 / displayW;
    const minH = 4 / displayH;

    const applyClamp = () => {
      x = clamp01(x);
      y = clamp01(y);
      w = Math.max(minW, Math.min(1 - x, w));
      h = Math.max(minH, Math.min(1 - y, h));
    };

    switch (activeHandle) {
      case "move":
        x += dx;
        y += dy;
        x = clamp01(x);
        y = clamp01(y);
        x = Math.min(x, 1 - w);
        y = Math.min(y, 1 - h);
        break;
      case "nw":
        x += dx;
        y += dy;
        w -= dx;
        h -= dy;
        applyClamp();
        break;
      case "ne":
        y += dy;
        w += dx;
        h -= dy;
        applyClamp();
        break;
      case "sw":
        x += dx;
        w -= dx;
        h += dy;
        applyClamp();
        break;
      case "se":
        w += dx;
        h += dy;
        applyClamp();
        break;
      default:
        break;
    }

    cropRect = { x, y, w, h };
    updateCropOverlay();
    event.preventDefault();
  };

  const onDown = (event) => {
    if (!currentDims || activeMode !== "crop") return;
    const handle = event.target.dataset.handle || "move";
    activeHandle = handle;
    startRect = { ...cropRect };
    startClient = { x: event.clientX, y: event.clientY };
    event.preventDefault();
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
  };

  cropBox.addEventListener("pointerdown", onDown);
};

const updateModeButtons = () => {
  if (modeCropBtn) {
    modeCropBtn.classList.toggle("active", activeMode === "crop");
    modeCropBtn.setAttribute("aria-pressed", activeMode === "crop" ? "true" : "false");
  }
  if (modePerspectiveBtn) {
    modePerspectiveBtn.classList.toggle("active", activeMode === "perspective");
    modePerspectiveBtn.setAttribute("aria-pressed", activeMode === "perspective" ? "true" : "false");
  }
};

const setMode = (mode, options = {}) => {
  if (!mode || !["crop", "perspective", "none"].includes(mode)) return;
  const changed = activeMode !== mode;
  activeMode = mode;
  updateModeButtons();
  updateCropOverlay();
  updatePerspectiveOverlay();
  if (changed && currentBytes && !options.silent) {
    if (mode === "crop") {
      setStatus("Crop mode active. Drag the handles to adjust.");
    } else if (mode === "perspective") {
      setStatus("Perspective mode active. Move the four corners.");
    } else {
      setStatus("Overlays hidden. Select a mode to adjust again.");
    }
  }
};

const runPipeline = async () => {
  if (!currentBytes) {
    setStatus("Add an image first.");
    return;
  }

  processBtn.disabled = true;
  setStatus("Preparing WebAssembly module...");

  try {
    await ensureWasm();
    let bytes = currentBytes;

    if (activeMode === "crop") {
      if (!currentDims) {
        throw new Error("Crop needs image dimensions");
      }
      const x = Math.max(0, Math.round(cropRect.x * currentDims.width));
      const y = Math.max(0, Math.round(cropRect.y * currentDims.height));
      const w = Math.max(1, Math.round(cropRect.w * currentDims.width));
      const h = Math.max(1, Math.round(cropRect.h * currentDims.height));
      setStatus("Cropping...");
      bytes = crop_image(bytes, x, y, w, h);
    } else if (activeMode === "perspective") {
      if (!currentDims) {
        throw new Error("Perspective crop needs image dimensions");
      }
      const { width, height } = currentDims;
      const pts = new Float32Array([
        perspPoints.tl.x * width,
        perspPoints.tl.y * height,
        perspPoints.tr.x * width,
        perspPoints.tr.y * height,
        perspPoints.br.x * width,
        perspPoints.br.y * height,
        perspPoints.bl.x * width,
        perspPoints.bl.y * height,
      ]);
      setStatus("Applying perspective crop...");
      bytes = perspective_crop(bytes, pts, width, height);
    }

    const { format, quality } = getOutputSettings();

    setStatus("Compressing...");
    bytes = compress_image(bytes, quality, format);

    currentBytes = bytes;
    await updatePreview(bytes);
    setMode("none", { silent: true });
    setStatus("Done. Preview updated.");
  } catch (err) {
    console.error(err);
    setStatus(err instanceof Error ? err.message : String(err));
  } finally {
    processBtn.disabled = false;
  }
};

const downloadResult = () => {
  if (!currentBytes) return;
  const format = formatSelect?.value ?? "png";
  const blob = new Blob([currentBytes], { type: `image/${format}` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ext = format === "jpeg" ? "jpg" : format;
  a.href = url;
  a.download = `image-tools-${Date.now()}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const resetImage = async () => {
  if (!originalBytes) return;
  currentBytes = originalBytes;
  cropRect = { x: 0, y: 0, w: 1, h: 1 };
  perspPoints = {
    tl: { x: 0, y: 0 },
    tr: { x: 1, y: 0 },
    br: { x: 1, y: 1 },
    bl: { x: 0, y: 1 },
  };
  setMode("crop", { silent: true });
  await updatePreview(currentBytes);
  setStatus("Back to the original file.");
};

const bindDropzone = () => {
  const prevent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, prevent, false);
    document.body.addEventListener(eventName, prevent, false);
  });

  dropzone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files;
    handleFile(file);
  });
};

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  handleFile(file);
});

processBtn.addEventListener("click", runPipeline);
downloadBtn.addEventListener("click", downloadResult);
resetBtn.addEventListener("click", resetImage);

if (modeCropBtn) {
  modeCropBtn.addEventListener("click", (event) => {
    event.preventDefault();
    setMode("crop");
  });
}

if (modePerspectiveBtn) {
  modePerspectiveBtn.addEventListener("click", (event) => {
    event.preventDefault();
    setMode("perspective");
  });
}

if (qualityInput) {
  qualityInput.addEventListener("input", handleQualityChange);
  qualityInput.addEventListener("change", handleQualityChange);
}

if (formatSelect) {
  formatSelect.addEventListener("change", () => {
    updateQualityVisibility();
    requestProjectedDownloadSize();
  });
}

bindDropzone();
setStatus("Drop an image or browse to get started.");
processBtn.disabled = true;
downloadBtn.disabled = true;
resetBtn.disabled = true;
setDownloadLabel(null);
updateModeButtons();
updateQualityLabel();
updateQualityVisibility();
updateCropOverlay();
updatePerspectiveOverlay();
attachCropInteractions();
attachPerspectiveInteractions();

window.addEventListener("resize", () => {
  updateCropOverlay();
  updatePerspectiveOverlay();
});
previewImg.addEventListener("load", () => {
  // Ensure overlay tracks the rendered image size
  requestAnimationFrame(() => {
    updateCropOverlay();
    updatePerspectiveOverlay();
  });
});
