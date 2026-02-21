<script setup lang="ts">
useHead({
  title: 'Regex Generator | Ash Tools',
  meta: [
    { name: 'description', content: 'Free online Regex Generator tool. Create optimized Regular Expressions from examples instantly. Powered by Rust and WebAssembly, runs fully offline in your browser.' },
    { name: 'keywords', content: 'regex generator, regular expression tool, rust regex, webassembly regex, offline regex tool, pattern matching, grex online' },
    { name: 'robots', content: 'index,follow' },
    { property: 'og:title', content: 'Regex Generator | Ash Tools' },
    { property: 'og:description', content: 'Generate optimized Regular Expressions from examples. Process text offline with Rust + WASM.' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  link: [{ rel: 'canonical', href: 'https://ash-tools.store/regexp/' }],
})

let scriptEl: HTMLScriptElement | null = null

onMounted(() => {
  scriptEl = document.createElement('script')
  scriptEl.type = 'module'
  scriptEl.src = `/regexp/main.js?t=${Date.now()}`
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
      <header class="bg-slate-900/90 border border-white/10 rounded-xl p-4 backdrop-blur-md shadow-lg">
        <p class="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Local only</p>
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight -mt-0.5 mb-2">Regex Generator</h1>
        <p class="text-slate-400 text-sm leading-relaxed">Generate optimized Regular Expressions from examples. Enter text and the parts you want to match.</p>
      </header>

      <!-- Input & Controls -->
      <section class="bg-slate-900/90 border border-white/10 rounded-xl p-5 backdrop-blur-md shadow-lg flex flex-col gap-4">
        
        <!-- Two-Column Input -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label class="flex flex-col gap-2">
            <span class="text-xs uppercase tracking-widest text-slate-500 font-semibold">Input Text (Source)</span>
            <textarea id="inputText" placeholder="Paste your source text here..." class="w-full min-h-48 p-3 bg-white/2 border border-white/10 rounded-lg text-slate-200 font-mono text-sm resize-vertical focus:outline-none focus:border-pink-500/50 transition-colors"></textarea>
          </label>

          <label class="flex flex-col gap-2">
            <span class="text-xs uppercase tracking-widest text-slate-500 font-semibold">Desired Matches (Output)</span>
            <textarea id="targetText" placeholder="Paste the exact strings you want to match from the input (one per line)..." class="w-full min-h-48 p-3 bg-white/2 border border-white/10 rounded-lg text-slate-200 font-mono text-sm resize-vertical focus:outline-none focus:border-pink-500/50 transition-colors"></textarea>
          </label>
        </div>

        <!-- Generate Button -->
        <div class="flex justify-end">
          <button id="generateBtn" class="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-lg font-bold text-sm hover:-translate-y-0.5 transition-all hover:shadow-lg">Generate Regex</button>
        </div>

        <!-- Output -->
        <div id="resultBox" class="bg-white/2 p-5 rounded-lg border border-white/10 hidden">
          <h3 class="text-sm uppercase tracking-wider font-bold text-pink-400 mb-4">Generated Regex</h3>
          <div id="regexOutput" class="min-h-auto p-5 text-pink-400 font-mono text-base bg-black/20 rounded-lg border border-white/5 mb-4"></div>

          <p class="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2.5">Preview matches in Input Text:</p>
          <div id="preview" class="font-mono text-xs text-slate-300 whitespace-pre-wrap bg-black/20 p-3 rounded-lg border border-white/5 max-h-60 overflow-y-auto"></div>
        </div>
      </section>
    </div>
  </div>
</template>

<style>
@reference "tailwindcss";
</style>

<style>
.regexp-page {
  --bg: #0b1220;
  --panel: rgba(15, 23, 42, 0.9);
  --accent: #ec4899;
  --accent-2: #f472b6;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --border: rgba(255, 255, 255, 0.12);
  --shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
  color-scheme: dark light;
  min-height: calc(100vh - 48px);
  background:
    radial-gradient(circle at 16% 22%, rgba(236, 72, 153, 0.16), transparent 36%),
    radial-gradient(circle at 80% 10%, rgba(244, 114, 182, 0.14), transparent 34%),
    var(--bg);
  color: var(--text);
  font-family: 'Space Grotesk', system-ui, sans-serif;
  display: flex;
  justify-content: center;
  padding: 32px 14px;
}

@media (prefers-color-scheme: light) {
  .regexp-page {
    --bg: #f5f7fb;
    --panel: rgba(255, 255, 255, 0.96);
    --accent: #db2777;
    --accent-2: #e879f9;
    --text: #0f172a;
    --muted: #475569;
    --border: rgba(15, 23, 42, 0.12);
    --shadow: 0 16px 50px rgba(15, 23, 42, 0.14);
  }
}

.regexp-page * { box-sizing: border-box; }

.regexp-page .shell { width: min(960px, 100%); display: flex; flex-direction: column; gap: 14px; }

.regexp-page .hero {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 16px;
}

.regexp-page .hero h1 { margin: 6px 0 4px; letter-spacing: -0.02em; }
.regexp-page .eyebrow { text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; color: var(--muted); margin: 0; }
.regexp-page .lede { margin: 0; color: var(--muted); }

.regexp-page .panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.regexp-page .inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

@media (max-width: 768px) {
  .regexp-page .inputs-grid { grid-template-columns: 1fr; }
}

.regexp-page .field { display: flex; flex-direction: column; gap: 8px; }

.regexp-page .label {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.regexp-page textarea {
  width: 100%;
  min-height: 200px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
  resize: vertical;
  line-height: 1.5;
  transition: border-color 0.2s;
}

.regexp-page textarea:focus { outline: none; border-color: var(--accent); }

.regexp-page .actions { display: flex; justify-content: flex-end; }

.regexp-page button {
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(120deg, var(--accent), var(--accent-2));
  color: white;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  transition: transform 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-family: inherit;
}

.regexp-page button:hover { transform: translateY(-1px); }

.regexp-page .output-box {
  background: rgba(255, 255, 255, 0.02);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.regexp-page .output-box h3 { margin: 0 0 16px; font-size: 16px; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; }

.regexp-page .preview-box {
  white-space: pre-wrap;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
}

.regexp-page .match {
  background-color: rgba(236, 72, 153, 0.25);
  border-bottom: 2px solid var(--accent);
  border-radius: 2px;
  color: var(--text);
}
</style>
