import init, { zip_files } from "../pkg/compressor.js";

const folderInput = document.getElementById("folderInput");
const fileInput = document.getElementById("fileInput");
const compressBtn = document.getElementById("compressBtn");
const statusEl = document.getElementById("status");
const fileCountEl = document.getElementById("fileCount");
const progressEl = document.getElementById("progress");
const progressBar = document.getElementById("progressBar");
const installBtn = document.getElementById("installBtn");

let deferredPrompt = null;

let wasmReadyPromise = null;

const sanitizePath = (value) => {
  const trimmed = value.replace(/^[/\\]+/, "");
  if (!trimmed) return "file";
  return trimmed;
};

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

const hideInstallBtn = () => {
  installBtn.style.display = "none";
  installBtn.disabled = false;
};

const showInstallBtn = () => {
  installBtn.style.display = "block";
};

const collectSelectedFiles = () => {
  const files = [
    ...(folderInput?.files ? Array.from(folderInput.files) : []),
    ...(fileInput?.files ? Array.from(fileInput.files) : []),
  ];

  const deduped = new Map();
  files.forEach((file) => {
    const key = file.webkitRelativePath || file.name;
    if (!deduped.has(key)) {
      deduped.set(key, file);
    }
  });
  return Array.from(deduped.values());
};

const renderFiles = () => {
  const files = collectSelectedFiles();
  if (!files.length) {
    fileCountEl.textContent = "No files selected.";
    return;
  }
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  fileCountEl.textContent = `${files.length} file${files.length === 1 ? "" : "s"} selected • ${prettySize(totalSize)} total`;
};

const readFileAsUint8 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
  reader.onload = () => resolve(new Uint8Array(reader.result));
  reader.readAsArrayBuffer(file);
});

const ensureWasm = () => {
  if (!wasmReadyPromise) {
    wasmReadyPromise = init();
  }
  return wasmReadyPromise;
};

const downloadZip = (bytes) => {
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const filename = `bundle-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return filename;
};

const handleCompress = async () => {
  const files = collectSelectedFiles();
  if (!files.length) {
    setStatus("Add one or more files first.");
    return;
  }

  compressBtn.disabled = true;
  setStatus("Preparing WebAssembly module...");
  resetProgress();

  try {
    await ensureWasm();

    const buffers = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      setStatus(`Reading files (${i + 1}/${files.length})`);
      setProgress(Math.round(((i + 0.5) / files.length) * 60), `Reading ${i + 1}/${files.length}`);
      buffers.push(await readFileAsUint8(file));
    }
    const names = files.map((f) => sanitizePath(f.webkitRelativePath || f.name));

    setStatus("Compressing with WebAssembly...");
    setProgress(80, "Compressing...");
    const zipped = zip_files(names, buffers);

    const filename = downloadZip(zipped);
    setStatus(`Done. Downloaded ${filename}.`);
    setProgress(100, "Done");
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    compressBtn.disabled = false;
    setTimeout(resetProgress, 500);
  }
};

folderInput.addEventListener("change", () => {
  renderFiles();
  setStatus("");
});

fileInput.addEventListener("change", () => {
  renderFiles();
  setStatus("");
});

compressBtn.addEventListener("click", handleCompress);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  showInstallBtn();
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  installBtn.disabled = true;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (choice.outcome === "accepted") {
    hideInstallBtn();
    setStatus("App installed. Launch it from your home screen.");
  } else {
    installBtn.disabled = false;
  }
});

window.addEventListener("appinstalled", () => {
  hideInstallBtn();
  setStatus("App installed. Ready offline.");
});

renderFiles();
setStatus("Awaiting files.");
hideInstallBtn();
