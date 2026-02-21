<script setup lang="ts">
useHead({
  title: 'tools | Free Online Tools',
  meta: [
    { name: 'description', content: 'Free online tools for video compression, file zipping, AI chat, and code execution. Process everything locally in your browser - no uploads, works offline, complete privacy.' },
    { name: 'keywords', content: 'free tools, video compressor, file zipper, online tools, web tools, compression, zip files, video editor, AI chat, code sandbox, rust execution, javascript runner, local processing, offline tools, privacy tools' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://ash-tools.store/' },
    { property: 'og:title', content: 'tools | Free Online Tools' },
    { property: 'og:description', content: 'Free online tools for video compression, file zipping, AI chat, and code execution. Everything processed locally in your browser.' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'robots', content: 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1' },
  ],
  link: [{ rel: 'canonical', href: 'https://ash-tools.store/' }],
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-16 pb-20">

    <!-- Hero -->
    <header class="text-center mb-16">
      <h1 class="text-7xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-500 bg-clip-text text-transparent leading-tight">
        tools
      </h1>
      <p class="text-xl text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
        Free, private, and powerful tools that work entirely in your browser. No uploads, no data sharing, complete privacy.
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <span class="px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-semibold">100% Local Processing</span>
        <span class="px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-semibold">No Uploads Required</span>
        <span class="px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-semibold">Works Offline</span>
        <span class="px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-semibold">WebAssembly Powered</span>
      </div>
    </header>

    <!-- Grid -->
    <main class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">

      <!-- Video -->
      <NuxtLink to="/video" class="group flex flex-col gap-4 p-6 rounded-xl border border-slate-700 bg-slate-900/50 hover:border-sky-500/50 hover:bg-slate-900/80 transition-all hover:shadow-lg hover:shadow-sky-500/10">
        <div class="w-16 h-16 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-4xl">🎬</div>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white">Video Studio</h2>
          <p class="text-sm text-slate-400 leading-relaxed mt-2">Professional video editing tools powered by WebAssembly. Trim, crop, compress, and process videos locally in your browser.</p>
        </div>
        <ul class="text-xs text-slate-400 space-y-1">
          <li>✓ Trim &amp; crop videos</li>
          <li>✓ Multiple format support</li>
          <li>✓ Batch processing</li>
          <li>✓ FFmpeg integration</li>
        </ul>
        <button class="mt-auto px-4 py-2.5 rounded-lg font-bold text-sm text-slate-950 bg-gradient-to-r from-sky-400 to-cyan-400 hover:shadow-lg hover:shadow-sky-500/40 transition-all hover:-translate-y-0.5">Open Video Studio →</button>
      </NuxtLink>

      <!-- Image -->
      <NuxtLink to="/image" class="group flex flex-col gap-4 p-6 rounded-xl border border-slate-700 bg-slate-900/50 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
        <div class="w-16 h-16 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-4xl">🖼️</div>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white">Image Editor</h2>
          <p class="text-sm text-slate-400 leading-relaxed mt-2">Crop, warp, compress, and optimise images with Rust + WebAssembly. Everything stays on your device, including HEIC imports.</p>
        </div>
        <ul class="text-xs text-slate-400 space-y-1">
          <li>✓ Interactive crop &amp; perspective</li>
          <li>✓ PNG, JPEG, WebP, HEIC</li>
          <li>✓ Local compression previews</li>
          <li>✓ Offline-first workflow</li>
        </ul>
        <button class="mt-auto px-4 py-2.5 rounded-lg font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:shadow-lg hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5">Open Image Editor →</button>
      </NuxtLink>

      <!-- ZIP -->
      <NuxtLink to="/zip" class="group flex flex-col gap-4 p-6 rounded-xl border border-slate-700 bg-slate-900/50 hover:border-violet-500/50 hover:bg-slate-900/80 transition-all hover:shadow-lg hover:shadow-violet-500/10">
        <div class="w-16 h-16 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-4xl">📦</div>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white">File Compressor</h2>
          <p class="text-sm text-slate-400 leading-relaxed mt-2">Create ZIP archives from your files and folders. Compress multiple items into organized archives with drag-and-drop simplicity.</p>
        </div>
        <ul class="text-xs text-slate-400 space-y-1">
          <li>✓ ZIP archive creation</li>
          <li>✓ Folder compression</li>
          <li>✓ Drag &amp; drop interface</li>
          <li>✓ Batch file processing</li>
        </ul>
        <button class="mt-auto px-4 py-2.5 rounded-lg font-bold text-sm text-white bg-gradient-to-r from-violet-500 to-purple-400 hover:shadow-lg hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5">Open File Compressor →</button>
      </NuxtLink>

      <!-- WebLLM -->
      <NuxtLink to="/webllm" class="group flex flex-col gap-4 p-6 rounded-xl border border-slate-700 bg-slate-900/50 hover:border-orange-500/50 hover:bg-slate-900/80 transition-all hover:shadow-lg hover:shadow-orange-500/10">
        <div class="w-16 h-16 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-4xl">🧠</div>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white">WebLLM Studio</h2>
          <p class="text-sm text-slate-400 leading-relaxed mt-2">Pair custom context with prompts and chat with WebLLM fully offline. Rust &amp; WebGPU keep every token on your device.</p>
        </div>
        <ul class="text-xs text-slate-400 space-y-1">
          <li>✓ Context + prompt workflow</li>
          <li>✓ Local WebGPU inference</li>
          <li>✓ Rust-managed history</li>
          <li>✓ PWA ready</li>
        </ul>
        <button class="mt-auto px-4 py-2.5 rounded-lg font-bold text-sm text-slate-950 bg-gradient-to-r from-orange-400 to-amber-400 hover:shadow-lg hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5">Open WebLLM Studio →</button>
      </NuxtLink>

      <!-- Speed -->
      <NuxtLink to="/speed" class="group flex flex-col gap-4 p-6 rounded-xl border border-slate-700 bg-slate-900/50 hover:border-yellow-500/50 hover:bg-slate-900/80 transition-all hover:shadow-lg hover:shadow-yellow-500/10">
        <div class="w-16 h-16 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-4xl">⚡</div>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white">Speed Runner</h2>
          <p class="text-sm text-slate-400 leading-relaxed mt-2">Benchmark JavaScript code execution and memory usage. Run snippets in an isolated worker with visual performance graphs.</p>
        </div>
        <ul class="text-xs text-slate-400 space-y-1">
          <li>✓ Execution time analysis</li>
          <li>✓ Heap memory tracking (Chrome)</li>
          <li>✓ Visual performance charts</li>
          <li>✓ Worker-based isolation</li>
        </ul>
        <button class="mt-auto px-4 py-2.5 rounded-lg font-bold text-sm text-slate-950 bg-gradient-to-r from-yellow-400 to-amber-300 hover:shadow-lg hover:shadow-yellow-500/40 transition-all hover:-translate-y-0.5">Open Speed Runner →</button>
      </NuxtLink>

      <!-- Regex -->
      <NuxtLink to="/regexp" class="group flex flex-col gap-4 p-6 rounded-xl border border-slate-700 bg-slate-900/50 hover:border-pink-500/50 hover:bg-slate-900/80 transition-all hover:shadow-lg hover:shadow-pink-500/10">
        <div class="w-16 h-16 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-mono font-bold text-pink-400 text-xl">.*</div>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white">Regex Generator</h2>
          <p class="text-sm text-slate-400 leading-relaxed mt-2">Generate optimized Regular Expressions from examples. Match patterns instantly with WASM-powered engine.</p>
        </div>
        <ul class="text-xs text-slate-400 space-y-1">
          <li>✓ Example-based generation</li>
          <li>✓ Rust/Grex powered</li>
          <li>✓ Instant preview</li>
          <li>✓ Offline processing</li>
        </ul>
        <button class="mt-auto px-4 py-2.5 rounded-lg font-bold text-sm text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:shadow-lg hover:shadow-pink-500/40 transition-all hover:-translate-y-0.5">Open Regex Tool →</button>
      </NuxtLink>

      <!-- Sandbox -->
      <NuxtLink to="/sandbox" class="group flex flex-col gap-4 p-6 rounded-xl border border-slate-700 bg-slate-900/50 hover:border-indigo-500/50 hover:bg-slate-900/80 transition-all hover:shadow-lg hover:shadow-indigo-500/10">
        <div class="w-16 h-16 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-4xl">🧪</div>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white">Code Sandbox</h2>
          <p class="text-sm text-slate-400 leading-relaxed mt-2">Run and test code in multiple languages with WebAssembly. Execute Rust, JavaScript, Python, and C++ in an isolated browser environment.</p>
        </div>
        <ul class="text-xs text-slate-400 space-y-1">
          <li>✓ Multi-language support</li>
          <li>✓ WASI runtime execution</li>
          <li>✓ Stdin input support</li>
          <li>✓ Copy output to clipboard</li>
        </ul>
        <button class="mt-auto px-4 py-2.5 rounded-lg font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-lg hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5">Open Code Sandbox →</button>
      </NuxtLink>

    </main>

  </div>
</template>
