<script setup lang="ts">
useHead({
  title: 'WASM Video Studio | Trim, crop, compress locally',
  meta: [
    { 'http-equiv': 'Cross-Origin-Opener-Policy', content: 'same-origin' },
    { 'http-equiv': 'Cross-Origin-Embedder-Policy', content: 'require-corp' },
    { name: 'description', content: 'Private, in-browser video trimming, cropping, and compression powered by WebAssembly. Process everything locally with no uploads.' },
    { name: 'robots', content: 'index,follow' },
    { property: 'og:title', content: 'WASM Video Studio | Trim, crop, compress locally' },
    { property: 'og:description', content: 'Trim, crop, and compress video privately in your browser. WebAssembly powered, no uploads.' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  link: [{ rel: 'canonical', href: 'https://ash-tools.store/video/' }],
})

let scriptEl: HTMLScriptElement | null = null

onMounted(() => {
  scriptEl = document.createElement('script')
  scriptEl.type = 'module'
  scriptEl.src = `/video/main.js?t=${Date.now()}`
  document.head.appendChild(scriptEl)
})

onUnmounted(() => {
  scriptEl?.remove()
  scriptEl = null
})
</script>

<template>
  <div class="min-h-[calc(100vh-48px)] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-slate-200 flex flex-col overflow-hidden">
    <!-- Gradient overlays for depth -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute top-0 right-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div class="absolute top-20 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
    </div>

    <!-- Top bar -->
    <div class="relative h-15 bg-slate-950/80 border-b border-slate-700 flex items-center justify-between px-5 gap-4 backdrop-blur-md">
      <div class="text-base font-semibold flex items-center gap-2">
        <span class="inline-block w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></span>
        WASM Video Studio
      </div>
      <label class="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg bg-slate-900/50 text-slate-200 cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-all">
        📁 Open Video
      </label>
      <input id="videoInput" type="file" accept="video/mp4,video/webm,video/ogg,video/mov,video/avi,video/mkv,video/flv,video/wmv,video/m4v,video/3gp,video/*" multiple class="hidden">
    </div>

    <!-- Main area: 2-col layout (editor + sidebar) -->
    <div class="relative flex flex-1 overflow-hidden">
      <!-- Editor area (1fr) -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
        <!-- Preview section -->
        <div class="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-950/60 to-black/40 relative border-b border-slate-700">
          <!-- Empty state -->
          <div id="emptyState" class="text-center flex flex-col items-center gap-4">
            <h2 class="text-2xl font-bold text-slate-200">Start by opening a video</h2>
            <p class="text-xs text-slate-400 leading-relaxed">Trim, crop, and compress your videos locally.<br>No uploads • 100% private • WebAssembly powered</p>
            <p class="text-xs text-slate-400"><strong>Supported formats:</strong> MP4, WebM, MOV, AVI, MKV, FLV, WMV, M4V, 3GP</p>
            <p class="text-xs text-slate-400">💡 You can select multiple files for batch processing</p>
          </div>

          <!-- Video shell (hidden initially) -->
          <div class="video-shell hidden relative w-full h-full max-w-full max-h-full rounded-xl overflow-hidden shadow-2xl" id="videoShell">
            <video id="preview" controls playsinline muted class="block w-full h-full object-contain"></video>
            <div id="cropOverlay" class="crop-overlay hidden absolute border-2 border-dashed border-blue-500 rounded-md bg-blue-500/10 cursor-move" style="display:none;">
              <div class="crop-handle tl absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -left-1.5 cursor-nw-resize" data-handle="tl"></div>
              <div class="crop-handle tr absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -right-1.5 cursor-ne-resize" data-handle="tr"></div>
              <div class="crop-handle bl absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -left-1.5 cursor-sw-resize" data-handle="bl"></div>
              <div class="crop-handle br absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -right-1.5 cursor-se-resize" data-handle="br"></div>
            </div>
          </div>
        </div>

        <!-- Timeline section -->
        <div class="h-48 bg-gradient-to-b from-slate-900/60 to-slate-950/60 border-t border-slate-700 flex flex-col p-4 gap-3">
          <!-- Player controls -->
          <div class="flex items-center gap-4 px-4 py-3 bg-slate-950/60 rounded-lg backdrop-blur-md border border-slate-700">
            <button id="playBtn" class="control-btn play w-11 h-11 flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 font-bold hover:shadow-lg hover:scale-105 transition-all">▶</button>
            <div id="timeDisplay" class="font-mono text-xs text-slate-200 font-semibold min-w-32 tracking-widest">00:00 / 00:00</div>
            <div class="flex items-center gap-2 ml-auto">
              <button id="volumeBtn" class="control-btn w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-blue-500 transition-all">🔊</button>
              <div class="volume-slider w-24 h-1 bg-slate-800 rounded cursor-pointer relative">
                <div id="volumeFill" class="volume-fill h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded" style="width: 100%;"></div>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="flex flex-col gap-1.5 flex-1">
            <!-- Seek bar -->
            <div id="seekBar" class="seek-bar h-2 bg-slate-800 rounded-full cursor-pointer relative overflow-hidden group">
              <div id="seekProgress" class="seek-progress h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full relative" style="width: 0%;">
                <div class="seek-handle absolute w-3 h-3 bg-white rounded-full -right-1.5 top-1/2 -translate-y-1/2 shadow-lg group-hover:w-4 group-hover:h-4 transition-all"></div>
              </div>
            </div>

            <!-- Timeline track -->
            <div class="timeline-track flex-1 bg-slate-800/50 rounded-lg border border-slate-700 relative overflow-hidden cursor-pointer">
              <div class="timeline-content absolute inset-0 bg-repeat-x" style="background-image: repeating-linear-gradient(90deg, transparent 0, transparent 9px, rgba(255,255,255,0.04) 9px, rgba(255,255,255,0.04) 10px);"></div>
              <div id="trimStart" class="trim-handle start absolute top-0 bottom-0 w-3.5 bg-blue-500 cursor-ew-resize z-20 rounded-l opacity-90" style="left: 0;"></div>
              <div id="trimEnd" class="trim-handle end absolute top-0 bottom-0 w-3.5 bg-blue-500 cursor-ew-resize z-20 rounded-r opacity-90" style="right: 0;"></div>
              <div id="playhead" class="playhead absolute top-0 bottom-0 w-0.5 bg-white z-30" style="left: 0%;"></div>
            </div>

            <!-- Timeline labels -->
            <div class="timeline-labels flex justify-between font-mono text-xs text-slate-400 px-2">
              <span id="startLabel">00:00</span>
              <span id="endLabel">00:00</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar (320px) -->
      <div class="w-80 bg-slate-950/80 border-l border-slate-700 overflow-y-auto p-5 flex flex-col gap-4 backdrop-blur-md">
        <!-- Export Settings -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Export Settings</h3>
          <div class="space-y-3">
            <div class="flex flex-col gap-1.5">
              <label for="resolutionSelect" class="text-xs font-medium text-slate-400">Resolution</label>
              <select id="resolutionSelect" class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500 hover:border-slate-600 transition-colors">
                <option value="source">Keep original</option>
                <option value="1080">1080p (1920×1080)</option>
                <option value="720">720p (1280×720)</option>
                <option value="480">480p (854×480)</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="presetSelect" class="text-xs font-medium text-slate-400">Encoding speed</label>
              <select id="presetSelect" class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500 hover:border-slate-600 transition-colors">
                <option value="veryfast">Very fast</option>
                <option value="faster">Faster</option>
                <option value="medium">Balanced</option>
                <option value="slow">Better quality</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="crfInput" class="text-xs font-medium text-slate-400">Quality (CRF) <span id="crfValue" class="text-blue-400 font-bold">25</span></label>
              <input id="crfInput" type="range" min="18" max="32" value="25" class="w-full accent-blue-500">
              <p class="text-xs text-slate-500">Lower = better quality, larger file</p>
            </div>
          </div>
        </div>

        <!-- Trim Settings -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Trim Settings</h3>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1.5">
              <label for="startInput" class="text-xs font-medium text-slate-400">Start time</label>
              <input id="startInput" type="text" placeholder="00:00" class="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500 hover:border-slate-600 transition-colors">
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="endInput" class="text-xs font-medium text-slate-400">End time</label>
              <input id="endInput" type="text" placeholder="Full" class="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500 hover:border-slate-600 transition-colors">
            </div>
          </div>
        </div>

        <!-- Crop Settings -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Crop Settings</h3>
          <div class="grid grid-cols-2 gap-2 mb-3">
            <div class="flex flex-col gap-1.5">
              <label for="cropWidth" class="text-xs font-medium text-slate-400">Width (px)</label>
              <input id="cropWidth" type="number" min="0" placeholder="Auto" class="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500 hover:border-slate-600 transition-colors">
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="cropHeight" class="text-xs font-medium text-slate-400">Height (px)</label>
              <input id="cropHeight" type="number" min="0" placeholder="Auto" class="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500 hover:border-slate-600 transition-colors">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <div class="flex flex-col gap-1.5">
              <label for="cropX" class="text-xs font-medium text-slate-400">X offset</label>
              <input id="cropX" type="number" min="0" placeholder="0" class="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500 hover:border-slate-600 transition-colors">
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="cropY" class="text-xs font-medium text-slate-400">Y offset</label>
              <input id="cropY" type="number" min="0" placeholder="0" class="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500 hover:border-slate-600 transition-colors">
            </div>
          </div>
          <p class="text-xs text-slate-500 mb-3">Drag the overlay on video to crop visually</p>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-col gap-2">
          <button id="processBtn" class="w-full px-4 py-2.5 font-bold text-xs rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 hover:shadow-lg hover:-translate-y-0.5 transition-all">Export Video</button>
          <button id="processBatchBtn" class="hidden w-full px-4 py-2.5 font-bold text-xs rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:border-blue-500 transition-all">Process All Files</button>
        </div>

        <!-- Status and progress -->
        <div class="status-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-400 text-xs font-bold" id="processingBadge">
          <span class="inline-block w-2 h-2 bg-slate-600 rounded-full"></span>
          Idle
        </div>
        <div id="status" class="font-mono text-xs text-slate-400 min-h-5"></div>

        <!-- Progress bar -->
        <div id="progress" class="w-full h-2.5 rounded-full bg-slate-800 border border-slate-700 overflow-hidden opacity-0">
          <div id="progressBar" class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all" style="width: 0%;"></div>
        </div>

        <div id="fileCount" class="font-mono text-xs text-slate-400 min-h-5"></div>

        <!-- File list -->
        <div id="fileList" class="hidden mt-3 pt-3 border-t border-slate-700">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Files to process</h3>
          <div id="fileListItems" class="text-xs text-slate-400"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@reference "tailwindcss";

/* Preserve tool-specific interactive selectors referenced by /public/video/main.js */

.video-shell {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.video-shell video {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 348px);
  object-fit: contain;
}

/* Crop overlay and handles */
.crop-overlay {
  position: absolute;
  border: 2px dashed #0ea5e9;
  border-radius: 0.375rem;
  background: rgba(14, 165, 233, 0.12);
  cursor: move;
  box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.5);
}

.crop-handle {
  position: absolute;
  width: 14px;
  height: 14px;
  background: #0ea5e9;
  border: 2px solid #fff;
  border-radius: 50%;
}

.crop-handle.br { bottom: -7px; right: -7px; cursor: se-resize; }
.crop-handle.tr { top: -7px; right: -7px; cursor: ne-resize; }
.crop-handle.bl { bottom: -7px; left: -7px; cursor: sw-resize; }
.crop-handle.tl { top: -7px; left: -7px; cursor: nw-resize; }

/* Timeline player controls */
.control-btn {
  border: none;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  padding: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(14, 165, 233, 0.2);
  border-color: #0ea5e9;
  transform: scale(1.05);
}

.control-btn.play {
  width: 42px;
  height: 42px;
  background: linear-gradient(120deg, #0ea5e9, #22d3ee);
  border: none;
  color: #0b1220;
  font-size: 1.125rem;
}

.control-btn.play:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
}

/* Seek bar and progress */
.seek-bar {
  height: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0.25rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.seek-progress {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #22d3ee);
  border-radius: 0.25rem;
  position: relative;
}

.seek-handle {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
}

/* Timeline track and playhead */
.timeline-track {
  height: 3rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.timeline-content {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(90deg, transparent 0, transparent 9px, rgba(255, 255, 255, 0.04) 9px, rgba(255, 255, 255, 0.04) 10px);
}

.trim-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 14px;
  background: #0ea5e9;
  cursor: ew-resize;
  z-index: 20;
  border-radius: 2px;
  opacity: 0.9;
}

.trim-handle.start { left: 0; border-radius: 4px 0 0 4px; }
.trim-handle.end { right: 0; border-radius: 0 4px 4px 0; }

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #fff;
  z-index: 30;
}

.timeline-labels {
  display: flex;
  justify-content: space-between;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #94a3b8;
}

.timeline-label {
  font-size: 11px;
  color: #94a3b8;
}

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
}

.status-badge::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.status-badge.active {
  color: #e2e8f0;
  border-color: rgba(14, 165, 233, 0.4);
  background: rgba(14, 165, 233, 0.12);
}

.status-badge.active::before {
  background: #0ea5e9;
}

/* Volume slider */
.volume-slider {
  width: 5rem;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
}

.volume-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #22d3ee);
  border-radius: 2px;
  width: 100%;
}

/* Progress bar */
.progress {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  opacity: 0;
}

.progress-bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #0ea5e9, #22d3ee);
  transition: width 0.15s ease;
}

/* Responsive */
@media (max-width: 1024px) {
  .video-shell {
    max-height: calc(100vh - 300px);
  }
}
</style>
