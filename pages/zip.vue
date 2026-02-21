<script setup lang="ts">
useHead({
  title: 'Free File Compress | Local ZIP in your browser',
  meta: [
    { name: 'description', content: 'Free, private, in-browser ZIP compressor. Select folders or files and create archives locally on your device. No uploads, works offline.' },
    { name: 'robots', content: 'index,follow' },
    { property: 'og:title', content: 'Free File Compress | Local ZIP in your browser' },
    { property: 'og:description', content: 'Zip folders and files privately in your browser. Nothing leaves your device.' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  link: [{ rel: 'canonical', href: 'https://ash-tools.store/zip/' }],
})

let scriptEl: HTMLScriptElement | null = null

onMounted(() => {
  scriptEl = document.createElement('script')
  scriptEl.type = 'module'
  scriptEl.src = `/zip/main.js?t=${Date.now()}`
  document.head.appendChild(scriptEl)
})

onUnmounted(() => {
  scriptEl?.remove()
  scriptEl = null
})
</script>

<template>
  <div class="min-h-[calc(100vh-48px)] bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-4 p-8">

    <main class="w-full max-w-2xl bg-slate-900/80 border border-white/8 rounded-2xl p-7 backdrop-blur-md">
      <section class="flex flex-col gap-3">
        <!-- Header -->
        <div class="inline-flex items-center gap-2 uppercase tracking-wide text-xs text-slate-500 before:content-[''] before:w-4 before:h-0.5 before:bg-gradient-to-r before:from-violet-500 before:to-cyan-400 before:rounded">
          Local only
        </div>
        <h1 class="text-4xl font-bold tracking-tight leading-tight">Zip folders right in the browser.</h1>
        <p class="text-slate-400 leading-relaxed max-w-prose text-sm">Free File Compress keeps every byte on your device. Choose a folder or files, hit create, and get a ready-to-share ZIP instantly.</p>

        <!-- Dropzones -->
        <label class="border border-dashed border-white/10 rounded-xl p-5 bg-gradient-to-br from-violet-500/8 to-cyan-400/5 cursor-pointer hover:border-violet-500/50 transition-all duration-150 hover:-translate-y-0.5 flex justify-between items-center gap-2">
          <div>
            <div class="font-semibold text-sm">Choose a folder to compress</div>
            <div class="text-slate-500 text-xs">Nested files are preserved. Nothing is uploaded.</div>
          </div>
          <span class="text-violet-500 font-semibold text-xs whitespace-nowrap">Browse folder</span>
        </label>
        <input id="folderInput" type="file" webkitdirectory multiple class="hidden">

        <label class="border border-dashed border-white/10 rounded-xl p-5 bg-gradient-to-br from-violet-500/8 to-cyan-400/5 cursor-pointer hover:border-violet-500/50 transition-all duration-150 hover:-translate-y-0.5 flex justify-between items-center gap-2">
          <div>
            <div class="font-semibold text-sm">Or add individual files</div>
            <div class="text-slate-500 text-xs">Mix with folders if you like.</div>
          </div>
          <span class="text-violet-500 font-semibold text-xs whitespace-nowrap">Browse files</span>
        </label>
        <input id="fileInput" type="file" multiple class="hidden">

        <!-- Buttons -->
        <button id="compressBtn" class="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">Create ZIP</button>
        <button id="installBtn" class="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hidden">Install app</button>

        <!-- Status & Progress -->
        <div id="status" class="font-mono text-xs text-slate-500 min-h-5"></div>
        <div id="progress" class="w-full h-2.5 rounded-full bg-white/5 border border-white/10 overflow-hidden opacity-0">
          <div id="progressBar" class="h-full w-0 bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-150"></div>
        </div>
        <div id="fileCount" class="font-mono text-xs text-slate-500 min-h-5"></div>

        <!-- Feature Pills -->
        <div class="flex flex-wrap gap-2.5" aria-label="Key benefits">
          <div class="border border-white/10 text-slate-200 px-3 py-2 rounded-full text-xs bg-gradient-to-r from-violet-500/10 to-cyan-400/5">100% local processing</div>
          <div class="border border-white/10 text-slate-200 px-3 py-2 rounded-full text-xs bg-gradient-to-r from-violet-500/10 to-cyan-400/5">Folder structure preserved</div>
          <div class="border border-white/10 text-slate-200 px-3 py-2 rounded-full text-xs bg-gradient-to-r from-violet-500/10 to-cyan-400/5">Works offline (PWA)</div>
          <div class="border border-white/10 text-slate-200 px-3 py-2 rounded-full text-xs bg-gradient-to-r from-violet-500/10 to-cyan-400/5">No size sent to servers</div>
        </div>
      </section>
    </main>

    <footer class="text-slate-500 text-xs text-center">
      Built by <a href="https://its-ash.github.io/" target="_blank" rel="noreferrer" class="text-violet-500 no-underline font-semibold hover:underline">Ashvini Jangid</a>
    </footer>
  </div>
</template>

<style>
@reference "tailwindcss";
</style>
