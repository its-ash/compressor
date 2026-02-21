<script setup lang="ts">
useHead({
  title: 'Sandboxed Code Runner | Ash Tools',
  meta: [
    { name: 'description', content: 'Secure WASM sandboxed code runner. Compile and execute code locally in your browser.' },
    { name: 'keywords', content: 'wasm runner, sandbox, compiler, wasm, rust, c, c++, python, javascript, browser runtime' },
    { name: 'robots', content: 'index,follow' },
  ],
})

let scriptEl: HTMLScriptElement | null = null

onMounted(() => {
  scriptEl = document.createElement('script')
  scriptEl.type = 'module'
  scriptEl.src = `/sandbox/main.js?t=${Date.now()}`
  document.head.appendChild(scriptEl)
})

onUnmounted(() => {
  scriptEl?.remove()
  scriptEl = null
})
</script>

<template>
  <div class="min-h-[calc(100vh-48px)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
    <!-- Gradient overlays for depth -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute top-0 left-[12%] w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
      <div class="absolute top-20 right-[12%] w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"></div>
    </div>

    <main class="relative flex flex-col h-[calc(100vh-48px)]">
      <section class="flex flex-col gap-3 p-4 md:p-5 flex-1 min-h-0 bg-slate-900/40 backdrop-blur-xs">
        <!-- Toolbar -->
        <div class="flex flex-wrap items-center justify-between gap-3 md:gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <label class="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 backdrop-blur-sm">
              <span class="text-xs font-bold uppercase tracking-wide text-slate-400">Language</span>
              <select id="languageSelect" aria-label="Language" class="bg-transparent text-slate-200 border-0 font-mono text-xs outline-none">
                <option value="javascript">JavaScript</option>
                <option value="python">Python (Pyodide)</option>
                <option value="rust">Rust (WASI)</option>
                <option value="cpp">C/C++ (clang)</option>
              </select>
            </label>
            <label class="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 backdrop-blur-sm">
              <span class="text-xs font-bold uppercase tracking-wide text-slate-400">Timeout</span>
              <select id="timeoutSelect" aria-label="Timeout" class="bg-transparent text-slate-200 border-0 font-mono text-xs outline-none">
                <option value="3000">3s</option>
                <option value="5000" selected>5s</option>
                <option value="10000">10s</option>
              </select>
            </label>
          </div>

          <div class="flex items-center gap-2">
            <button id="runBtn" class="px-4 py-2 font-bold text-xs rounded-lg bg-gradient-to-r from-teal-500 to-orange-500 text-slate-950 hover:shadow-lg hover:-translate-y-0.5 transition-all">Run</button>
            <button id="stopBtn" disabled class="px-4 py-2 font-bold text-xs rounded-lg bg-slate-800/50 border border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">Stop</button>
            <div class="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-700 bg-slate-900/50 backdrop-blur-sm" aria-live="polite">
              <span class="text-xs font-bold uppercase tracking-wide text-slate-400">Runtime</span>
              <span id="runtimeStatus" class="text-xs font-mono text-slate-200">Idle</span>
            </div>
          </div>
        </div>

        <!-- Workspace grid: Editor (2fr) + Side panel (1fr) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          <!-- Code editor card -->
          <div class="md:col-span-2 flex flex-col border border-slate-700 rounded-2xl bg-slate-900/50 p-3 backdrop-blur-sm min-h-0">
            <div class="flex items-baseline justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wide text-slate-400">Code Editor</span>
              <span class="text-xs text-slate-400">CodeMirror</span>
            </div>
            <div id="codeEditor" class="flex-1 rounded-xl overflow-hidden bg-slate-950 border border-slate-800" aria-label="Code editor"></div>
          </div>

          <!-- Side panel: 5 cards stacked -->
          <div class="flex flex-col gap-3 min-h-0 overflow-y-auto">
            <!-- Execution card -->
            <div class="border border-slate-700 rounded-2xl bg-slate-900/30 p-3 backdrop-blur-sm flex-shrink-0">
              <div class="flex items-baseline justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wide text-slate-400">Execution</span>
                <span class="text-xs text-slate-400" id="timing">time: --</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <span class="block text-xs text-slate-400 mb-1">Memory</span>
                  <span class="font-mono text-slate-200" id="memory">--</span>
                </div>
                <div>
                  <span class="block text-xs text-slate-400 mb-1">Exit</span>
                  <span class="font-mono text-slate-200" id="exitCode">--</span>
                </div>
              </div>
              <div id="status" class="px-2 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/25 text-teal-400 text-xs font-bold uppercase tracking-wide">Idle</div>
            </div>

            <!-- Input card -->
            <div class="border border-slate-700 rounded-2xl bg-slate-900/30 p-3 backdrop-blur-sm flex-shrink-0">
              <div class="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Input (stdin)</div>
              <textarea id="stdinInput" placeholder="Enter input here..." class="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-teal-500/50"></textarea>
            </div>

            <!-- Console Output card -->
            <div class="border border-slate-700 rounded-2xl bg-slate-900/30 p-3 backdrop-blur-sm flex-shrink-0">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wide text-slate-400 block">Console Output</span>
                  <span class="text-xs text-slate-400">stdout / stderr</span>
                </div>
                <button id="copyConsoleBtn" class="px-2 py-1 text-xs rounded-md bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition-colors">Copy</button>
              </div>
              <pre id="consoleOutput" class="h-24 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs text-slate-200 overflow-auto whitespace-pre-wrap break-words"></pre>
            </div>

            <!-- Errors card -->
            <div class="border border-slate-700 rounded-2xl bg-slate-900/30 p-3 backdrop-blur-sm flex-shrink-0">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wide text-slate-400 block">Errors</span>
                  <span class="text-xs text-slate-400">runtime</span>
                </div>
                <button id="copyErrorBtn" class="px-2 py-1 text-xs rounded-md bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition-colors">Copy</button>
              </div>
              <pre id="errorOutput" class="h-24 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs text-red-400 overflow-auto whitespace-pre-wrap break-words"></pre>
            </div>

            <!-- Compile Logs card -->
            <div class="border border-slate-700 rounded-2xl bg-slate-900/30 p-3 backdrop-blur-sm flex-shrink-0">
              <div class="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Compile Logs</div>
              <span class="text-xs text-slate-400 block mb-2">wasm toolchain</span>
              <pre id="compileOutput" class="h-24 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs text-slate-200 overflow-auto whitespace-pre-wrap break-words"></pre>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style>
@reference "tailwindcss";

/* Only preserve any tool-specific interactive selectors if they query the DOM */
/* Currently all Sandbox layout is Tailwind; CodeMirror will be injected by main.js */
</style>
