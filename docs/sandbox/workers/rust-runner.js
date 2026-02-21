importScripts("../compilers/rust/adapter.js");
importScripts("./wasi-runtime.js");

self.onmessage = async (event) => {
  const { type, code, input } = event.data || {};
  if (type !== "run") return;

  try {
    if (!self.compileRustToWasm) {
      throw new Error("Rust toolchain not loaded. Check compilers/rust/adapter.js");
    }

    self.postMessage({ type: "compile", text: "Compiling Rust...\n" });
    const wasmBytes = await self.compileRustToWasm(code, (text) => {
      self.postMessage({ type: "compile", text });
    });

    self.postMessage({ type: "compile", text: "Running WASI module...\n" });
    const result = await runWasiModule(wasmBytes, input);

    if (result.stdout) self.postMessage({ type: "stdout", text: result.stdout });
    if (result.stderr) self.postMessage({ type: "stderr", text: result.stderr });

    self.postMessage({ type: "result", ok: result.ok, exitCode: result.exitCode });
  } catch (err) {
    self.postMessage({ type: "stderr", text: (err && err.stack) ? err.stack + "\n" : String(err) + "\n" });
    self.postMessage({ type: "result", ok: false, exitCode: 1 });
  }
};
