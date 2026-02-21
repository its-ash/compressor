<script setup lang="ts">
useHead({
  title: 'JS Speed Runner | Ash Tools',
  meta: [
    { name: 'description', content: 'Free online JavaScript benchmark runner. Test execution speed and memory allocation locally in your browser. Visualize performance with charts.' },
    { name: 'keywords', content: 'javascript benchmark, js speed test, js performance tool, memory profiler, heap size checker, online js runner' },
    { name: 'robots', content: 'index,follow' },
    { property: 'og:title', content: 'JS Speed Runner | Ash Tools' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  link: [{ rel: 'canonical', href: 'https://ash-tools.store/speed/' }],
})

let scriptEl: HTMLScriptElement | null = null

onMounted(() => {
  scriptEl = document.createElement('script')
  scriptEl.type = 'module'
  scriptEl.src = `/speed/main.js?t=${Date.now()}`
  document.head.appendChild(scriptEl)
})

onUnmounted(() => {
  scriptEl?.remove()
  scriptEl = null
})
</script>

<template>
  <div class="min-h-[calc(100vh-48px)] bg-slate-950 text-slate-200 flex justify-center p-3.5">
    <div class="w-full max-w-3xl flex flex-col gap-3.5">

      <!-- Hero Header -->
      <header class="bg-slate-900/90 border border-white/10 rounded-xl p-4 backdrop-blur-md shadow-lg flex justify-between items-baseline gap-3 flex-wrap md:flex-nowrap">
        <div>
          <p class="text-xs uppercase tracking-widest text-slate-500 font-semibold">Local only</p>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight -mt-1">Test case runner.</h1>
          <p class="text-slate-400 text-sm leading-relaxed mt-1">Paste code, run it, and see elapsed time plus heap usage (when supported by the browser).</p>
        </div>
        <div id="stats" class="font-mono text-xs text-slate-500 text-right whitespace-nowrap">—</div>
      </header>

      <!-- Code & Controls Panel -->
      <section class="bg-slate-900/90 border border-white/10 rounded-xl p-4 backdrop-blur-md shadow-lg flex flex-col gap-3">
        
        <!-- Code Editor -->
        <label class="flex flex-col gap-2">
          <span class="text-xs uppercase tracking-widest text-slate-500 font-semibold">Code (Ctrl/Cmd + Enter to run)</span>
          <div id="codeEditor" class="w-full min-h-64 rounded-lg border border-white/10 bg-white/2 overflow-hidden" aria-label="JavaScript code editor"></div>
        </label>

        <!-- Run Button & Result -->
        <div class="flex items-center gap-3 flex-wrap">
          <button id="runBtn" class="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 rounded-lg font-bold text-sm hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            <span id="runLabel">Run 500x</span>
            <span id="runSpinner" class="w-4 h-4 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin hidden" aria-hidden="true"></span>
          </button>
          <div id="result" class="flex-1 min-h-8 px-3 py-2 border border-dashed border-white/10 rounded-lg bg-white/2 font-mono text-xs text-slate-200" aria-live="polite">Result: —</div>
        </div>

        <!-- Chart -->
        <div class="mt-2 p-3 border border-white/10 rounded-lg bg-white/2">
          <div class="flex justify-between items-baseline mb-2 text-xs text-slate-500 font-semibold">
            <span class="uppercase tracking-widest">Summary (ms)</span>
            <div class="flex gap-2.5 items-center">
              <span id="chartCaption" class="font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-xs">—</span>
              <span id="chartTime" class="font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-xs">avg —</span>
              <span id="chartHeap" class="font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-xs">heap Δ —</span>
            </div>
          </div>
          <canvas id="chart" width="640" height="180" class="w-full h-44 bg-black/20 rounded-lg border border-white/10" aria-label="Timing summary"></canvas>
        </div>
      </section>
    </div>
  </div>
</template>

<style>
@reference "tailwindcss";
</style>

<style>
.speed-page {
  --bg: #0b1220;
  --panel: rgba(15, 23, 42, 0.9);
  --accent: #22d3ee;
  --accent-2: #8b5cf6;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --border: rgba(255, 255, 255, 0.12);
  --shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
  color-scheme: dark light;
  min-height: calc(100vh - 48px);
  background:
    radial-gradient(circle at 16% 22%, rgba(34, 211, 238, 0.16), transparent 36%),
    radial-gradient(circle at 80% 10%, rgba(139, 92, 246, 0.14), transparent 34%),
    var(--bg);
  color: var(--text);
  font-family: 'Space Grotesk', system-ui, sans-serif;
  display: flex;
  justify-content: center;
  padding: 32px 14px;
}

@media (prefers-color-scheme: light) {
  .speed-page {
    --bg: #f5f7fb;
    --panel: rgba(255, 255, 255, 0.96);
    --accent: #0891b2;
    --accent-2: #7c3aed;
    --text: #0f172a;
    --muted: #475569;
    --border: rgba(15, 23, 42, 0.12);
    --shadow: 0 16px 50px rgba(15, 23, 42, 0.14);
  }
}

.speed-page * { box-sizing: border-box; }

.speed-page .shell {
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.speed-page .hero {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.speed-page .hero h1 { margin: 6px 0 4px; letter-spacing: -0.02em; }
.speed-page .eyebrow { text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; color: var(--muted); margin: 0; }
.speed-page .lede { margin: 0; color: var(--muted); }

.speed-page .stats {
  font-family: 'IBM Plex Mono', monospace;
  color: var(--muted);
  font-size: 13px;
  text-align: right;
  min-width: 150px;
}

.speed-page .panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.speed-page .field { display: flex; flex-direction: column; gap: 8px; }

.speed-page .label {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 12px;
  color: var(--muted);
}

.speed-page .code-editor {
  width: 100%;
  min-height: 260px;
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
}

.speed-page .actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.speed-page .action-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(120deg, var(--accent), var(--accent-2));
  color: #0b1220;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  transition: transform 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  font-size: 14px;
}

.speed-page .action-btn:hover:not(:disabled) { transform: translateY(-1px); }
.speed-page .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.speed-page .spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #0b1220;
  animation: spin 0.8s linear infinite;
  display: none;
}

@keyframes spin { to { transform: rotate(360deg); } }

.speed-page .result {
  flex: 1;
  min-height: 34px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px dashed var(--border);
  background: rgba(255, 255, 255, 0.02);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  color: var(--text);
}

.speed-page .chart-wrap {
  margin-top: 6px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}

.speed-page .chart-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--muted);
}

.speed-page .chart-meta { display: flex; gap: 10px; align-items: center; }

.speed-page .caption {
  font-family: 'IBM Plex Mono', monospace;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  font-size: 12px;
}

.speed-page canvas#chart {
  width: 100%;
  height: 180px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  border: 1px solid var(--border);
}
</style>
