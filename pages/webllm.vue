<script setup lang="ts">
useHead({
  title: 'On-Device WebLLM Studio',
  meta: [
    { name: 'description', content: 'Chat with WebLLM directly in your browser. Provide context, add prompts, and keep the entire conversation offline.' },
  ],
})

let scriptEl: HTMLScriptElement | null = null

function toggleContext() {
  if (typeof document === 'undefined') return
  const contextField = document.querySelector('.context-field') as HTMLElement | null
  if (contextField) {
    contextField.style.display = contextField.style.display === 'none' ? 'block' : 'none'
  }
}

onMounted(() => {
  scriptEl = document.createElement('script')
  scriptEl.type = 'module'
  scriptEl.src = `/webllm/main.js?t=${Date.now()}`
  document.head.appendChild(scriptEl)
  // expose toggleContext globally for inline onclick
  ;(window as never as Record<string, unknown>).toggleContext = toggleContext
})

onUnmounted(() => {
  scriptEl?.remove()
  scriptEl = null
  delete (window as never as Record<string, unknown>).toggleContext
})
</script>

<template>
  <div class="min-h-[calc(100vh-48px)] bg-slate-950 text-slate-200 flex flex-col p-2.5">
    <div class="w-full max-w-4xl mx-auto flex flex-col gap-2 min-h-[calc(100vh-68px)] pb-52">

      <!-- Header -->
      <header class="bg-slate-900/90 border border-white/8 rounded-2xl p-5 backdrop-blur-md shadow-2xl">
        <div class="mb-2">
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight -mb-2 bg-gradient-to-r from-sky-400 via-teal-400 to-orange-400 bg-clip-text text-transparent">On-Device WebLLM Studio</h1>
        </div>
        <div id="status-indicator" data-state="loading" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-slate-400">Model warming up…</div>
        <div class="progress-track h-1.5 bg-white/5 rounded-full overflow-hidden my-2" aria-label="Model download progress">
          <div id="model-progress" class="h-full w-0 bg-gradient-to-r from-sky-400 to-teal-400 transition-all duration-300"></div>
        </div>
        <small id="progress-label" class="text-slate-500 text-xs">Initializing WebLLM…</small>
      </header>

      <!-- History Panel -->
      <section class="bg-slate-900/80 border border-white/8 rounded-2xl p-4 backdrop-blur-md shadow-2xl flex-1 min-h-0">
        <label class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 block">Conversation history</label>
        <div id="history-empty" class="text-slate-500 text-sm py-5">Waiting for your first prompt.</div>
        <ul id="history-list" class="flex flex-col gap-1.5 overflow-y-auto flex-1" hidden></ul>
      </section>

      <!-- Input Panel (Fixed Bottom) -->
      <form id="prompt-form" class="fixed bottom-[5%] left-[10%] right-[10%] md:left-[15%] md:right-[15%] bg-slate-900/95 border border-white/8 rounded-2xl p-4 backdrop-blur-md shadow-2xl z-10">
        <!-- Context Field (Toggle) -->
        <div class="context-field mb-3 hidden">
          <label for="context-input" class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 block">Context</label>
          <textarea id="context-input" name="context" placeholder="e.g. You are a helpful assistant that speaks in concise checklists." class="w-full min-h-28 rounded-lg border border-white/10 bg-slate-800/80 text-slate-200 text-sm p-3 font-mono resize-vertical"></textarea>
        </div>

        <!-- Prompt -->
        <div class="mb-3">
          <label for="prompt-input" class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 block">Prompt</label>
          <textarea id="prompt-input" name="prompt" placeholder="Ask a follow-up question…" class="w-full min-h-28 rounded-lg border border-white/10 bg-slate-800/80 text-slate-200 text-sm p-3 font-mono resize-vertical"></textarea>
        </div>

        <!-- Buttons -->
        <div class="flex gap-1.5 flex-wrap mb-3">
          <button type="button" @click="toggleContext" class="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 text-sm font-semibold hover:bg-white/10 transition-colors">Add Context</button>
          <button type="submit" id="submit-btn" class="flex-1 min-w-32 px-4 py-2 bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 rounded-lg font-semibold text-sm hover:-translate-y-0.5 transition-all">Send</button>
          <button type="button" id="reset-btn" class="px-4 py-2 rounded-lg bg-red-500/15 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-colors">Reset</button>
        </div>

        <!-- Context Preview -->
        <div>
          <label class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 block">Active context preview</label>
          <div id="context-preview" class="text-xs text-slate-500 font-mono p-2.5 bg-slate-800/50 border border-white/5 rounded-lg">No context captured yet.</div>
        </div>
      </form>
    </div>
  </div>
</template>

<style>
@reference "tailwindcss";

.webllm-page .message {
  @apply flex flex-col gap-1 p-2.5 rounded-lg border border-white/5 bg-slate-800/50;
}
.webllm-page .message-header {
  @apply flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider;
}
.webllm-page .message-content {
  @apply text-sm leading-relaxed;
}
</style>

<style>
.webllm-page {
  --bg: radial-gradient(circle at 15% 20%, #0f172a, #020617 55%);
  --panel: rgba(10, 15, 35, 0.9);
  --panel-strong: rgba(10, 14, 30, 0.95);
  --border: rgba(255, 255, 255, 0.08);
  --accent: #0ea5e9;
  --accent-2: #14b8a6;
  --accent-warm: #f97316;
  --accent-warm-2: #fb923c;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --shadow: 0 35px 120px rgba(2, 6, 23, 0.8);
  color-scheme: dark;
  min-height: calc(100vh - 48px);
  background: var(--bg);
  color: var(--text);
  font-family: 'Space Grotesk', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.webllm-page * { box-sizing: border-box; }

.webllm-page .shell {
  width: min(1000px, 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: calc(100vh - 68px);
  margin: 0 auto;
}

.webllm-page header {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.webllm-page .hero h1 {
  font-size: clamp(24px, 3vw, 32px);
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  background: linear-gradient(120deg, var(--accent) 0%, var(--accent-2) 50%, var(--accent-warm));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.webllm-page main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding-bottom: 200px;
}

.webllm-page .panel {
  background: var(--panel-strong);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.webllm-page textarea {
  width: 100%;
  min-height: 120px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 12, 28, 0.8);
  color: var(--text);
  font-size: 14px;
  padding: 12px;
  font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace;
  resize: vertical;
}

.webllm-page .actions { display: flex; gap: 6px; flex-wrap: wrap; }

.webllm-page button {
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.2s ease;
}

.webllm-page .btn-primary {
  background: linear-gradient(120deg, var(--accent), var(--accent-2));
  color: #020617;
  flex: 1;
  min-width: 120px;
}

.webllm-page .btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
  border: 1px solid var(--border);
}

.webllm-page .btn-reset { background: rgba(248, 113, 113, 0.15); color: #fca5a5; }
.webllm-page button:disabled { opacity: 0.5; cursor: not-allowed; }
.webllm-page button:not(:disabled):hover { transform: translateY(-1px); }

.webllm-page .history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
}

.webllm-page .input-panel {
  position: fixed;
  bottom: 2vh;
  left: 10vw;
  right: 10vw;
  background: var(--panel-strong);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
  z-index: 10;
}

.webllm-page .message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(8, 12, 28, 0.7);
}

.webllm-page .message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.webllm-page .message-content { font-size: 13px; line-height: 1.4; }

.webllm-page .status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.05);
  font-size: 13px;
  color: var(--muted);
}

.webllm-page .progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
  margin: 8px 0;
}

.webllm-page .progress-value {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: width 0.3s ease;
}

.webllm-page .context-preview {
  font-size: 13px;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.webllm-page .empty-state { color: var(--muted); font-size: 14px; padding: 20px 0; }

.webllm-page label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  font-weight: 600;
}

@media (max-width: 900px) {
  .webllm-page header { grid-template-columns: 1fr; }
  .webllm-page main { grid-template-columns: 1fr; }
  .webllm-page .input-panel { left: 5vw; right: 5vw; }
}
</style>
