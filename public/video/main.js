import initWasm, {
	analyze_video_header,
	build_processing_params,
	format_file_size,
	format_timestamp,
	get_recommended_format,
	parse_timestamp,
	validate_crop,
	validate_trim,
	validate_video_batch,
	validate_video_file,
} from "./pkg/video_wasm.js";

let wasmReadyPromise = null;
const ensureWasm = () => {
	if (!wasmReadyPromise) {
		wasmReadyPromise = initWasm();
	}
	return wasmReadyPromise;
};

let ffmpegInstance = null;
let ffmpegPromise = null;
let ffmpegFetchFile = null;
let ffmpegScriptPromise = null;

const loadFfmpegGlobal = () => {
	if (!ffmpegScriptPromise) {
		ffmpegScriptPromise = new Promise((resolve, reject) => {
			if (globalThis.FFmpegWASM?.FFmpeg) {
				resolve(globalThis.FFmpegWASM);
				return;
			}
			const script = document.createElement("script");
			script.src = "./ffmpeg.min.js";
			script.async = true;
			script.onload = () => {
				if (globalThis.FFmpegWASM?.FFmpeg) {
					resolve(globalThis.FFmpegWASM);
				} else {
					reject(new Error("FFmpeg global script loaded without exports"));
				}
			};
			script.onerror = () => reject(new Error("Failed to load FFmpeg script"));
			document.head.appendChild(script);
		});
	}
	return ffmpegScriptPromise;
};

const loadFfmpegModule = async () => {
	const mod = await loadFfmpegGlobal();
	if (mod?.FFmpeg) return mod;
	throw new Error("FFmpeg module missing FFmpeg export");
};

const ensureFFmpeg = async () => {
	if (ffmpegInstance) return ffmpegInstance;
	if (!ffmpegPromise) {
		ffmpegPromise = (async () => {
			const { FFmpeg } = await loadFfmpegModule();
			setProcessingBadge("Loading engine…", true);
			const instance = new FFmpeg();
			instance.on("log", ({ message }) => console.debug("[ffmpeg]", message));
			instance.on("progress", ({ ratio = 0 }) => {
				const pct = Number.isFinite(ratio) ? ratio : 0;
				updateProgress(10 + pct * 80, `FFmpeg ${(pct * 100).toFixed(0)}%`);
			});
			await instance.load({
				coreURL: "./ffmpeg-core.js",
				wasmURL: "./ffmpeg-core.wasm",
				workerURL: "./ffmpeg-core.worker.js",
			});
			ffmpegFetchFile = async (file) => new Uint8Array(await file.arrayBuffer());
			ffmpegInstance = instance;
			setProcessingBadge("Ready", false);
			return instance;
		})().catch((err) => {
			ffmpegPromise = null;
			setProcessingBadge("Error", false);
			throw err;
		});
	}
	return ffmpegPromise;
};

const videoInput = document.getElementById("videoInput");
const preview = document.getElementById("preview");
const emptyState = document.getElementById("emptyState");
const videoShell = document.getElementById("videoShell");
const statusEl = document.getElementById("status");
const processingBadge = document.getElementById("processingBadge");
const progressEl = document.getElementById("progress");
const progressBar = document.getElementById("progressBar");
const fileCountEl = document.getElementById("fileCount");
const fileList = document.getElementById("fileList");
const fileListItems = document.getElementById("fileListItems");
const processBtn = document.getElementById("processBtn");
const processBatchBtn = document.getElementById("processBatchBtn");
const seekBar = document.getElementById("seekBar");
const seekProgress = document.getElementById("seekProgress");
const playBtn = document.getElementById("playBtn");
const timeDisplay = document.getElementById("timeDisplay");
const volumeBtn = document.getElementById("volumeBtn");
const volumeSlider = document.querySelector(".volume-slider");
const volumeFill = document.getElementById("volumeFill");
const timelineTrack = document.querySelector(".timeline-track");
const timelineContent = document.querySelector(".timeline-content");
const trimStartHandle = document.getElementById("trimStart");
const trimEndHandle = document.getElementById("trimEnd");
const playhead = document.getElementById("playhead");
const startLabel = document.getElementById("startLabel");
const endLabel = document.getElementById("endLabel");
const startInput = document.getElementById("startInput");
const endInput = document.getElementById("endInput");
const resolutionSelect = document.getElementById("resolutionSelect");
const presetSelect = document.getElementById("presetSelect");
const crfInput = document.getElementById("crfInput");
const crfValue = document.getElementById("crfValue");
const cropWidthInput = document.getElementById("cropWidth");
const cropHeightInput = document.getElementById("cropHeight");
const cropXInput = document.getElementById("cropX");
const cropYInput = document.getElementById("cropY");
const cropOverlay = document.getElementById("cropOverlay");
const cropHandles = Array.from(document.querySelectorAll(".crop-handle"));

const state = {
	files: [],
	activeIndex: -1,
	objectUrl: null,
	duration: 0,
	width: 0,
	height: 0,
	trimStart: 0,
	trimEnd: 0,
	trimRatioStart: 0,
	trimRatioEnd: 1,
};

const cropState = {
	x: 0,
	y: 0,
	width: 0,
	height: 0,
	ratioX: 0,
	ratioY: 0,
	ratioWidth: 1,
	ratioHeight: 1,
};

let isProcessing = false;
let activeTrimDrag = null;
let activeCropDrag = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const setStatus = (message, isError = false) => {
	if (!message) {
		statusEl.textContent = "";
		setProcessingBadge(isProcessing ? "Processing…" : "Idle", isProcessing);
		return;
	}
	const prefix = isError ? "Error" : "Status";
	statusEl.innerHTML = `<strong>${prefix}:</strong> ${message}`;
	setProcessingBadge(isError ? "Error" : "Active", true);
};

const updateProgress = (percent, label = "") => {
	const pct = clamp(percent, 0, 100);
	progressEl.style.opacity = 1;
	progressBar.style.width = `${pct}%`;
	progressBar.textContent = label || `${Math.round(pct)}%`;
};

const resetProgress = () => {
	progressEl.style.opacity = 0;
	progressBar.style.width = "0%";
	progressBar.textContent = "";
};

const setProcessingBadge = (text, isActive = false) => {
	if (!processingBadge) return;
	processingBadge.textContent = text;
	processingBadge.classList.toggle("active", isActive);
};

const toggleProcessing = (disabled) => {
	processBtn.disabled = disabled;
	processBatchBtn.disabled = disabled;
	videoInput.disabled = disabled;
	isProcessing = disabled;
	setProcessingBadge(disabled ? "Processing…" : "Idle", disabled);
};

const sanitizeFilename = (name) => {
	const base = name.split(".").slice(0, -1).join(".") || name;
	return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
};

const getMimeForExt = (ext) => {
	if (ext === "webm") return "video/webm";
	if (ext === "ogg" || ext === "ogv") return "video/ogg";
	return "video/mp4";
};

const downloadBlob = (uint8, filename, mime) => {
	const blob = new Blob([uint8], { type: mime });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const formatSeconds = (seconds) => {
	try {
		return format_timestamp(seconds || 0);
	} catch (err) {
		console.warn("format_seconds fallback", err);
		return `${seconds.toFixed(2)}s`;
	}
};

const parseSeconds = (value) => {
	if (!value) return 0;
	try {
		return parse_timestamp(value);
	} catch {
		return Number(value) || 0;
	}
};

const getRenderedVideoRect = () => {
	const videoRect = preview.getBoundingClientRect();
	if (!state.width || !state.height) return videoRect;
	const intrinsicAspect = state.width / state.height;
	const elementAspect = videoRect.width / videoRect.height;
	let width = videoRect.width;
	let height = videoRect.height;
	let offsetX = 0;
	let offsetY = 0;

	if (elementAspect > intrinsicAspect) {
		width = videoRect.height * intrinsicAspect;
		offsetX = (videoRect.width - width) / 2;
	} else if (elementAspect < intrinsicAspect) {
		height = videoRect.width / intrinsicAspect;
		offsetY = (videoRect.height - height) / 2;
	}

	return {
		left: videoRect.left + offsetX,
		top: videoRect.top + offsetY,
		width,
		height,
	};
};

const clientToIntrinsic = (clientX, clientY) => {
	const rect = getRenderedVideoRect();
	const relX = clamp(clientX - rect.left, 0, rect.width);
	const relY = clamp(clientY - rect.top, 0, rect.height);
	const x = (relX / rect.width) * state.width;
	const y = (relY / rect.height) * state.height;
	return { x, y };
};

const updateVolumeUI = () => {
	const volume = preview.muted ? 0 : preview.volume;
	volumeFill.style.width = `${volume * 100}%`;
	volumeBtn.textContent = preview.muted || volume === 0 ? "🔇" : "🔊";
};

const updatePlayState = () => {
	playBtn.textContent = preview.paused ? "▶" : "❚❚";
};

const updateTimeDisplay = () => {
	const current = formatSeconds(preview.currentTime || 0);
	const duration = formatSeconds(state.duration || 0);
	timeDisplay.textContent = `${current} / ${duration}`;
};

const updateSeekUI = () => {
	if (!state.duration) {
		seekProgress.style.width = "0%";
		playhead.style.left = "0%";
		return;
	}
	const ratio = clamp(preview.currentTime / state.duration, 0, 1);
	seekProgress.style.width = `${ratio * 100}%`;
	playhead.style.left = `${ratio * 100}%`;
};

const syncTrimInputs = () => {
	startInput.value = formatSeconds(state.trimStart);
	endInput.value = formatSeconds(state.trimEnd);
	startLabel.textContent = startInput.value;
	endLabel.textContent = endInput.value;
};

const updateTrimRatios = () => {
	if (!state.duration) return;
	state.trimRatioStart = clamp(state.trimStart / state.duration, 0, 1);
	state.trimRatioEnd = clamp(state.trimEnd / state.duration, 0, 1);
};

const updateTrimUI = () => {
	if (!state.duration) return;
	const startPct = (state.trimStart / state.duration) * 100;
	const endPct = (state.trimEnd / state.duration) * 100;
	const handleOffset = 5; // keep handles inside the track even at edges
	trimStartHandle.style.left = `calc(${startPct}% - ${handleOffset}px)`;
	trimStartHandle.style.right = "auto";
	trimEndHandle.style.left = `calc(${endPct}% - ${handleOffset}px)`;
	trimEndHandle.style.right = "auto";
	timelineContent.style.left = `${startPct}%`;
	timelineContent.style.right = `${100 - endPct}%`;
	syncTrimInputs();
};

const syncCropInputsFromState = () => {
	cropWidthInput.value = Math.round(cropState.width);
	cropHeightInput.value = Math.round(cropState.height);
	cropXInput.value = Math.round(cropState.x);
	cropYInput.value = Math.round(cropState.y);
};

const updateCropRatios = () => {
	if (!state.width || !state.height) return;
	cropState.ratioX = clamp(cropState.x / state.width, 0, 1);
	cropState.ratioY = clamp(cropState.y / state.height, 0, 1);
	cropState.ratioWidth = clamp(cropState.width / state.width, 0, 1);
	cropState.ratioHeight = clamp(cropState.height / state.height, 0, 1);
};

const updateCropOverlay = () => {
	if (!state.width || !state.height) {
		cropOverlay.style.display = "none";
		return;
	}
	const renderRect = getRenderedVideoRect();
	const shellRect = videoShell.getBoundingClientRect();
	const scaleX = renderRect.width / state.width;
	const scaleY = renderRect.height / state.height;
	const left = renderRect.left - shellRect.left + cropState.x * scaleX;
	const top = renderRect.top - shellRect.top + cropState.y * scaleY;
	cropOverlay.style.display = "block";
	cropOverlay.style.left = `${left}px`;
	cropOverlay.style.top = `${top}px`;
	cropOverlay.style.width = `${cropState.width * scaleX}px`;
	cropOverlay.style.height = `${cropState.height * scaleY}px`;
};

const applyCropState = (patch) => {
	if (!state.width || !state.height) return;
	const next = {
		x: clamp(patch.x ?? cropState.x, 0, state.width),
		y: clamp(patch.y ?? cropState.y, 0, state.height),
		width: clamp(patch.width ?? cropState.width, 64, state.width),
		height: clamp(patch.height ?? cropState.height, 64, state.height),
	};
	next.width = Math.min(next.width, state.width - next.x);
	next.height = Math.min(next.height, state.height - next.y);

	const validated = validate_crop(
		Math.round(next.x),
		Math.round(next.y),
		Math.round(next.width),
		Math.round(next.height),
		state.width,
		state.height
	);

	if (!validated.is_valid) {
		if (validated.error) {
			setStatus(validated.error, true);
		}
		return;
	}

	cropState.x = validated.x;
	cropState.y = validated.y;
	cropState.width = validated.width;
	cropState.height = validated.height;
	updateCropRatios();
	syncCropInputsFromState();
	updateCropOverlay();
};

const initCropState = () => {
	cropState.x = 0;
	cropState.y = 0;
	cropState.width = state.width;
	cropState.height = state.height;
	updateCropRatios();
	syncCropInputsFromState();
	updateCropOverlay();
};

const cropIsActive = (metaWidth = state.width, metaHeight = state.height) => {
	if (!metaWidth || !metaHeight) return false;
	return !(
		Math.round(cropState.x) === 0 &&
		Math.round(cropState.y) === 0 &&
		Math.round(cropState.width) >= metaWidth &&
		Math.round(cropState.height) >= metaHeight
	);
};

const deriveCropForMeta = (meta, useRatios) => {
	if (!meta.width || !meta.height) return null;
	if (!cropIsActive()) return null;
	if (!useRatios) {
		return validate_crop(
			Math.round(cropState.x),
			Math.round(cropState.y),
			Math.round(cropState.width),
			Math.round(cropState.height),
			meta.width,
			meta.height
		);
	}
	const x = Math.round(cropState.ratioX * meta.width);
	const y = Math.round(cropState.ratioY * meta.height);
	const width = Math.round(cropState.ratioWidth * meta.width);
	const height = Math.round(cropState.ratioHeight * meta.height);
	return validate_crop(x, y, width, height, meta.width, meta.height);
};

const deriveTrimForDuration = (duration, useRatios) => {
	if (!duration || duration <= 0) return null;
	let start = state.trimStart;
	let end = state.trimEnd;
	if (useRatios) {
		start = duration * state.trimRatioStart;
		end = duration * state.trimRatioEnd;
	}
	start = clamp(start, 0, Math.max(duration - 0.1, 0));
	end = clamp(end, start + 0.1, duration);
	return validate_trim(start, end, duration);
};

const resolveScaleTarget = (meta) => {
	if (!meta.width || !meta.height) return { width: undefined, height: undefined };
	const choice = resolutionSelect.value;
	if (choice === "source") return { width: undefined, height: undefined };
	const targetHeight = Number(choice);
	if (!targetHeight) return { width: undefined, height: undefined };
	let height = Math.min(targetHeight, meta.height);
	height -= height % 2;
	if (height < 2) height = 2;
	let width = Math.round(height * (meta.width / meta.height));
	width -= width % 2;
	width = Math.min(width, meta.width - (meta.width % 2));
	if (width < 2) width = 2;
	if (width === meta.width && height === meta.height) {
		return { width: undefined, height: undefined };
	}
	return { width, height };
};

const determineOutputExt = (info) => {
	const ext = (info?.extension || "mp4").toLowerCase();
	const codec = info?.estimated_codec || "";
	const hasAv1 = /av1/i.test(codec);
	const hasVp9 = /vp9/i.test(codec) || ["webm", "mkv"].includes(ext);
	const hasH264 = /h\.264|h264/i.test(codec) || ["mp4", "mov", "m4v", "avi"].includes(ext);
	return get_recommended_format(hasH264, hasVp9, hasAv1);
};

const renderFileList = () => {
	if (!state.files.length) {
		fileList.style.display = "none";
		processBatchBtn.style.display = "none";
		fileCountEl.textContent = "No videos selected.";
		fileListItems.innerHTML = "";
		return;
	}

	const totalSize = state.files.reduce((sum, entry) => sum + entry.file.size, 0);
	fileCountEl.textContent = `${state.files.length} video${state.files.length === 1 ? "" : "s"} • ${format_file_size(totalSize)}`;

	fileList.style.display = state.files.length > 1 ? "block" : "none";
	processBatchBtn.style.display = state.files.length > 1 ? "block" : "none";

	fileListItems.innerHTML = state.files
		.map((entry, index) => {
			const active = index === state.activeIndex ? "data-active=\"true\"" : "";
			return `<button type="button" data-index="${index}" ${active}>${entry.file.name}</button>`;
		})
		.join("");

	Array.from(fileListItems.querySelectorAll("button")).forEach((btn) => {
		btn.addEventListener("click", () => {
			const idx = Number(btn.dataset.index);
			if (!Number.isNaN(idx)) {
				selectFile(idx);
			}
		});
	});
};

const summarizeBatch = () => {
	if (!state.files.length) return;
	const batch = validate_video_batch(state.files.map((entry) => entry.info));
	if (batch.unsupported > 0) {
		setStatus(`${batch.unsupported} file${batch.unsupported === 1 ? "" : "s"} may be unsupported.`, true);
	} else {
		setStatus(`Ready to process ${batch.total} video${batch.total === 1 ? "" : "s"}.`);
	}
};

const clearObjectUrl = () => {
	if (state.objectUrl) {
		URL.revokeObjectURL(state.objectUrl);
		state.objectUrl = null;
	}
};

const loadVideo = (file) =>
	new Promise((resolve, reject) => {
		clearObjectUrl();
		const url = URL.createObjectURL(file);
		state.objectUrl = url;
		preview.src = url;
		preview.load();

		const onLoaded = () => {
			preview.removeEventListener("loadedmetadata", onLoaded);
			preview.removeEventListener("error", onError);
			state.duration = preview.duration || 0;
			state.width = preview.videoWidth || 0;
			state.height = preview.videoHeight || 0;
			state.trimStart = 0;
			state.trimEnd = state.duration;
			state.trimRatioStart = 0;
			state.trimRatioEnd = 1;
			updateTimeDisplay();
			updateSeekUI();
			updateTrimUI();
			initCropState();
			resolve();
		};

		const onError = () => {
			preview.removeEventListener("loadedmetadata", onLoaded);
			preview.removeEventListener("error", onError);
			reject(new Error("Unable to load video metadata"));
		};

		preview.addEventListener("loadedmetadata", onLoaded);
		preview.addEventListener("error", onError);
	});

const selectFile = async (index) => {
	if (index < 0 || index >= state.files.length) return;
	await ensureWasm();
	state.activeIndex = index;
	renderFileList();
	const entry = state.files[index];
	videoShell.style.display = "block";
	emptyState.style.display = "none";
	setStatus(`Loading ${entry.file.name}…`);
	try {
		await loadVideo(entry.file);
		setStatus(`Loaded ${entry.file.name}`);
	} catch (err) {
		console.error(err);
		setStatus(err.message || "Failed to load video", true);
	}
};

const analyzeFile = async (file) => {
	const basic = validate_video_file(file.name, file.size, file.type || "");
	try {
		const headerBytes = new Uint8Array(await file.slice(0, 2048).arrayBuffer());
		return { file, info: analyze_video_header(file.name, headerBytes), header: headerBytes };
	} catch (err) {
		console.warn("Header analysis failed", err);
		return { file, info: basic };
	}
};

const handleFileChange = async (event) => {
	const files = Array.from(event.target.files || []);
	if (!files.length) {
		setStatus("No files selected.");
		return;
	}
	await ensureWasm();
	resetProgress();
	setStatus("Analyzing files…");
	const analyzed = [];
	for (let i = 0; i < files.length; i += 1) {
		const entry = await analyzeFile(files[i]);
		analyzed.push(entry);
	}
	state.files = analyzed;
	renderFileList();
	summarizeBatch();
	selectFile(0);
};

const handleSeek = (event) => {
	if (!state.duration) return;
	const rect = seekBar.getBoundingClientRect();
	const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
	preview.currentTime = ratio * state.duration;
	updateSeekUI();
};

const startTrimDrag = (handle, event) => {
	if (!state.duration) return;
	event.preventDefault();
	activeTrimDrag = { handle };
	window.addEventListener("pointermove", onTrimDrag);
	window.addEventListener("pointerup", stopTrimDrag, { once: true });
};

const onTrimDrag = (event) => {
	if (!activeTrimDrag || !state.duration) return;
	const rect = timelineTrack.getBoundingClientRect();
	const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
	const time = ratio * state.duration;
	if (activeTrimDrag.handle === "start") {
		state.trimStart = Math.min(time, state.trimEnd - 0.1);
	} else {
		state.trimEnd = Math.max(time, state.trimStart + 0.1);
	}
	updateTrimRatios();
	updateTrimUI();
};

const stopTrimDrag = () => {
	activeTrimDrag = null;
	window.removeEventListener("pointermove", onTrimDrag);
};

const startCropDrag = (mode, event) => {
	if (!state.width || !state.height) return;
	event.preventDefault();
	const pointer = clientToIntrinsic(event.clientX, event.clientY);
	activeCropDrag = {
		mode,
		pointerStart: pointer,
		cropStart: { ...cropState },
	};
	window.addEventListener("pointermove", onCropDragMove);
	window.addEventListener("pointerup", stopCropDrag, { once: true });
};

const onCropDragMove = (event) => {
	if (!activeCropDrag) return;
	event.preventDefault();
	const pointer = clientToIntrinsic(event.clientX, event.clientY);
	const start = activeCropDrag.cropStart;
	const minSize = 64;
	const next = { ...start };

	if (activeCropDrag.mode === "move") {
		const dx = pointer.x - activeCropDrag.pointerStart.x;
		const dy = pointer.y - activeCropDrag.pointerStart.y;
		next.x = clamp(start.x + dx, 0, state.width - start.width);
		next.y = clamp(start.y + dy, 0, state.height - start.height);
	} else {
		let left = start.x;
		let right = start.x + start.width;
		let top = start.y;
		let bottom = start.y + start.height;

		if (activeCropDrag.mode.includes("t")) {
			top = clamp(pointer.y, 0, bottom - minSize);
		}
		if (activeCropDrag.mode.includes("b")) {
			bottom = clamp(pointer.y, top + minSize, state.height);
		}
		if (activeCropDrag.mode.includes("l")) {
			left = clamp(pointer.x, 0, right - minSize);
		}
		if (activeCropDrag.mode.includes("r")) {
			right = clamp(pointer.x, left + minSize, state.width);
		}

		next.x = left;
		next.y = top;
		next.width = Math.max(minSize, right - left);
		next.height = Math.max(minSize, bottom - top);
	}

	applyCropState(next);
};

const stopCropDrag = () => {
	activeCropDrag = null;
	window.removeEventListener("pointermove", onCropDragMove);
};

const getProcessingPlan = (meta, useRatios) => {
	const trim = deriveTrimForDuration(meta.duration, useRatios);
	if (trim && !trim.is_valid) {
		throw new Error(trim.error || "Trim settings invalid");
	}
	const crop = deriveCropForMeta(meta, useRatios);
	if (crop && !crop.is_valid) {
		throw new Error(crop.error || "Crop settings invalid");
	}
	const scale = resolveScaleTarget(meta);
	const scaleWidth = Number.isFinite(scale.width) ? scale.width : undefined;
	const scaleHeight = Number.isFinite(scale.height) ? scale.height : undefined;
	const params = build_processing_params(
		trim?.is_valid ? trim : null,
		crop?.is_valid ? crop : null,
		scaleWidth,
		scaleHeight
	);
	if (!params.is_valid) {
		throw new Error(params.errors?.join("; ") || "Processing parameters invalid");
	}
	return { trim, crop, scale, filters: params.ffmpeg_filters };
};

const exportWithFFmpeg = async (entry, meta, useRatios = false) => {
	const ffmpeg = await ensureFFmpeg();
	const plan = getProcessingPlan(meta, useRatios);
	updateProgress(15, "Encoding…");
	setProcessingBadge("Encoding…", true);
	const inputExt = entry.info?.extension || entry.file.name.split(".").pop() || "mp4";
	const inputName = `input-${Date.now()}-${sanitizeFilename(entry.file.name) || "video"}.${inputExt}`;
	await ffmpeg.writeFile(inputName, await ffmpegFetchFile(entry.file));

	const outputExt = determineOutputExt(entry.info);
	const outputName = `output-${sanitizeFilename(entry.file.name) || "video"}.${outputExt}`;
	const args = ["-y", "-i", inputName];

	if (plan.trim?.is_valid) {
		args.push("-ss", plan.trim.start_time.toFixed(3));
		args.push("-to", plan.trim.end_time.toFixed(3));
	}

	if (plan.filters && plan.filters !== "null") {
		args.push("-vf", plan.filters);
	}

	if (outputExt === "webm") {
		args.push("-c:v", "libvpx-vp9");
	} else {
		args.push("-c:v", "libx264");
		args.push("-movflags", "+faststart");
	}

	args.push("-preset", presetSelect.value || "medium");
	args.push("-crf", String(crfInput.value || 25));
	args.push("-c:a", "copy");
	args.push(outputName);

	setStatus(`Encoding ${entry.file.name}…`);

	await ffmpeg.exec(args);
	const data = await ffmpeg.readFile(outputName);
	downloadBlob(data, outputName, getMimeForExt(outputExt));
	await ffmpeg.deleteFile(inputName);
	await ffmpeg.deleteFile(outputName);
	setStatus(`Exported ${outputName}`);
	updateProgress(100, "Done");
	setProcessingBadge("Ready", false);
};

const probeMetadata = (file) =>
	new Promise((resolve, reject) => {
		const tempUrl = URL.createObjectURL(file);
		const video = document.createElement("video");
		video.preload = "metadata";
		video.src = tempUrl;
		video.muted = true;
		const cleanup = () => {
			URL.revokeObjectURL(tempUrl);
			video.src = "";
		};
		video.addEventListener("loadedmetadata", () => {
			const data = {
				duration: video.duration || 0,
				width: video.videoWidth || 0,
				height: video.videoHeight || 0,
			};
			cleanup();
			resolve(data);
		});
		video.addEventListener("error", () => {
			cleanup();
			reject(new Error("Unable to read video metadata"));
		});
	});

const processActiveFile = async () => {
	if (isProcessing) return;
	const entry = state.files[state.activeIndex];
	if (!entry) {
		setStatus("Select a video first.", true);
		return;
	}
	toggleProcessing(true);
	resetProgress();
	try {
		await exportWithFFmpeg(entry, {
			duration: state.duration,
			width: state.width,
			height: state.height,
		});
	} catch (err) {
		console.error(err);
		setStatus(err.message || "Failed to export", true);
	} finally {
		toggleProcessing(false);
		setTimeout(resetProgress, 700);
	}
};

const processBatch = async () => {
	if (isProcessing || state.files.length === 0) return;
	toggleProcessing(true);
	resetProgress();
	try {
		for (let i = 0; i < state.files.length; i += 1) {
			const entry = state.files[i];
			setStatus(`Processing ${entry.file.name} (${i + 1}/${state.files.length})`);
			let meta;
			if (i === state.activeIndex) {
				meta = { duration: state.duration, width: state.width, height: state.height };
			} else {
				meta = await probeMetadata(entry.file);
			}
			await exportWithFFmpeg(entry, meta, true);
		}
		setStatus("Batch export completed.");
	} catch (err) {
		console.error(err);
		setStatus(err.message || "Batch processing failed", true);
	} finally {
		toggleProcessing(false);
		setTimeout(resetProgress, 700);
	}
};

const handleTrimInputChange = () => {
	if (!state.duration) return;
	const start = parseSeconds(startInput.value);
	const end = parseSeconds(endInput.value || formatSeconds(state.duration));
	const validated = validate_trim(start, end, state.duration);
	if (!validated.is_valid) {
		setStatus(validated.error || "Invalid trim values", true);
		syncTrimInputs();
		return;
	}
	state.trimStart = validated.start_time;
	state.trimEnd = validated.end_time;
	updateTrimRatios();
	updateTrimUI();
};

const handleCropInputChange = () => {
	if (!state.width || !state.height) return;
	const next = {
		width: Number(cropWidthInput.value) || state.width,
		height: Number(cropHeightInput.value) || state.height,
		x: Number(cropXInput.value) || 0,
		y: Number(cropYInput.value) || 0,
	};
	applyCropState(next);
};

const handleVolumeInput = (event) => {
	const rect = volumeSlider.getBoundingClientRect();
	const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
	preview.volume = ratio;
	if (ratio > 0) preview.muted = false;
	updateVolumeUI();
};

preview.addEventListener("play", updatePlayState);
preview.addEventListener("pause", updatePlayState);
preview.addEventListener("timeupdate", () => {
	updateSeekUI();
	updateTimeDisplay();
});
preview.addEventListener("ended", () => {
	preview.currentTime = state.trimStart;
	preview.pause();
});

playBtn.addEventListener("click", () => {
	if (!state.duration) return;
	if (preview.paused) {
		preview.play().catch((err) => setStatus(err.message || "Cannot play", true));
	} else {
		preview.pause();
	}
});

volumeBtn.addEventListener("click", () => {
	preview.muted = !preview.muted;
	updateVolumeUI();
});

volumeSlider.addEventListener("click", handleVolumeInput);

seekBar.addEventListener("click", handleSeek);

trimStartHandle.addEventListener("pointerdown", (event) => startTrimDrag("start", event));
trimEndHandle.addEventListener("pointerdown", (event) => startTrimDrag("end", event));

cropOverlay.addEventListener("pointerdown", (event) => {
	if (event.target.classList.contains("crop-handle")) return;
	startCropDrag("move", event);
});
cropHandles.forEach((handle) => {
	handle.addEventListener("pointerdown", (event) => {
		startCropDrag(handle.dataset.handle || "move", event);
	});
});

startInput.addEventListener("change", handleTrimInputChange);
endInput.addEventListener("change", handleTrimInputChange);

[cropWidthInput, cropHeightInput, cropXInput, cropYInput].forEach((input) => {
	input.addEventListener("change", handleCropInputChange);
});

crfInput.addEventListener("input", () => {
	crfValue.textContent = crfInput.value;
});

processBtn.addEventListener("click", processActiveFile);
processBatchBtn.addEventListener("click", processBatch);
videoInput.addEventListener("change", handleFileChange);

window.addEventListener("resize", () => {
	requestAnimationFrame(updateCropOverlay);
});

const bootstrap = async () => {
	setStatus("Awaiting videos.");
	resetProgress();
	videoShell.style.display = "none";
	cropOverlay.style.display = "none";
	try {
		await ensureWasm();
	} catch (err) {
		setStatus(err.message || "Failed to initialize WASM", true);
	}
	updateVolumeUI();
};

bootstrap();
