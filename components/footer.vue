<script setup lang="ts">
const currentYear = new Date().getFullYear()

const tools = [
  { name: 'ZIP Compressor', href: '/zip/' },
  { name: 'Image Editor', href: '/image/' },
  { name: 'Video Studio', href: '/video/' },
  { name: 'Regex Generator', href: '/regexp/' },
  { name: 'Speed Runner', href: '/speed/' },
  { name: 'Code Sandbox', href: '/sandbox/' },
  { name: 'WebLLM Chat', href: '/webllm/' },
]

const resources = [
  { name: 'GitHub', href: 'https://github.com/its-ash/ash-tools', external: true },
  { name: 'Sitemap', href: '/sitemap.xml' },
  { name: 'Robots', href: '/robots.txt' },
]
</script>

<template>
  <footer class="bg-slate-950 border-t border-slate-700 text-slate-200 py-12 md:py-16">
    <div class="max-w-7xl mx-auto px-4 md:px-6">
      <!-- Footer Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        <!-- Brand Section -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></span>
            <h3 class="font-bold text-lg text-white">Ash Tools</h3>
          </div>
          <p class="text-sm text-slate-400 leading-relaxed">
            A collection of powerful, privacy-focused web tools built with WebAssembly. Process everything locally in your browser. No uploads, 100% private.
          </p>
        </div>

        <!-- Tools Links -->
        <div>
          <h4 class="font-semibold text-sm text-white mb-4 uppercase tracking-wide">Tools</h4>
          <ul class="space-y-2">
            <li v-for="tool in tools" :key="tool.href">
              <NuxtLink
                :to="tool.href"
                class="text-sm text-slate-400 hover:text-white hover:translate-x-1 transition-all inline-block"
              >
                {{ tool.name }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Resources Links -->
        <div>
          <h4 class="font-semibold text-sm text-white mb-4 uppercase tracking-wide">Resources</h4>
          <ul class="space-y-2">
            <li v-for="resource in resources" :key="resource.href">
              <a
                :href="resource.href"
                :target="resource.external ? '_blank' : undefined"
                :rel="resource.external ? 'noopener noreferrer' : undefined"
                class="text-sm text-slate-400 hover:text-white hover:translate-x-1 transition-all inline-block"
              >
                {{ resource.name }}
                <span v-if="resource.external" class="ml-1">↗</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-8"></div>

      <!-- Bottom Section -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <!-- Copyright -->
        <p class="text-xs text-slate-500 text-center md:text-left">
          © {{ currentYear }} Ash Tools. All rights reserved. Built with 
          <span class="text-blue-400">WebAssembly</span> • 
          <span class="text-slate-400">Privacy First</span>
        </p>

        <!-- Tech Stack -->
        <div class="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
          <span class="px-2 py-1 bg-slate-900/50 rounded-lg border border-slate-800">Nuxt 3</span>
          <span class="px-2 py-1 bg-slate-900/50 rounded-lg border border-slate-800">Tailwind</span>
          <span class="px-2 py-1 bg-slate-900/50 rounded-lg border border-slate-800">WASM</span>
          <span class="px-2 py-1 bg-slate-900/50 rounded-lg border border-slate-800">VueJS</span>
        </div>
      </div>

      <!-- Creator Section -->
      <div class="text-center text-xs text-slate-400 leading-relaxed">
        <p>
          Built with ❤️ using WebAssembly, Rust, and modern web technologies.<br>
          Created by <a href="https://its-ash.github.io/" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline transition-colors">Ashvini Jangid</a> •
          <a href="https://github.com/its-ash/ash-tools" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline transition-colors">View on GitHub</a> •
          <a href="https://ash-tools.store/" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline transition-colors">Learn More</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* Global Tailwind CSS is loaded from assets/css/main.css */
</style>
