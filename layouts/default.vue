<template>
  <div class="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
    <Header />
    <main class="flex-1">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<style>
/* Global Tailwind CSS is loaded from assets/css/main.css */
</style>
