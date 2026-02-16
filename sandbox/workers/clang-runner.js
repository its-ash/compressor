importScripts("../compilers/clang/adapter.js");
importScripts("./wasi-runtime.js");

self.onmessage = async (event) => {
  const { type, code } = event.data || {};
  if (type !== "run") return;

  try {
    if (!self.compileCToWasm) {
      throw new Error("C/C++ toolchain not loaded. Check compilers/clang/adapter.js");
    }

    self.postMessage({ type: "compile", text: "Compiling C/C++...\n" });
    const wasmBytes = await self.compileCToWasm(code, (text) => {
      self.postMessage({ type: "compile", text });
    });

    self.postMessage({ type: "compile", text: "Running WASI module...\n" });
    const result = await runWasiModule(wasmBytes);

    if (result.stdout) self.postMessage({ type: "stdout", text: result.stdout });
    if (result.stderr) self.postMessage({ type: "stderr", text: result.stderr });

    self.postMessage({ type: "result", ok: result.ok, exitCode: result.exitCode });
  } catch (err) {
    self.postMessage({ type: "stderr", text: (err && err.stack) ? err.stack + "\n" : String(err) + "\n" });
    self.postMessage({ type: "result", ok: false, exitCode: 1 });
  }
};
