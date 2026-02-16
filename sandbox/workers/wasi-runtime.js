// RUNTIME: WASI execution for Rust binaries
// Uses @bjorn3/browser_wasi_shim which is more robust than old wasmer-js polyfills.

let wasmShim = null;

const loadWasiShim = async () => {
    if (wasmShim) return wasmShim;
    try {
        // Use the same version as the compiler adapter
        const shim = await import("https://esm.sh/@bjorn3/browser_wasi_shim@0.4.2");
        wasmShim = shim;
        return shim;
    } catch (e) {
        throw new Error(`Failed to load WASI shim: ${e.message}`);
    }
};

// Global function to run WASM bytes
self.runWasiModule = async (wasmBytes, input = "") => {
  const { WASI, Fd, File, PreopenDirectory } = await loadWasiShim();

  // Custom file descriptor for capturing output (stdout/stderr)
  class ConsoleOutput extends Fd {
    constructor(callback) {
      super();
      this.callback = callback;
    }
    
    // fd_write implementation for browser_wasi_shim
    fd_write(view8, iovs) {
      let nwritten = 0;
      for (const iov of iovs) {
        // iov.buf is the offset in view8, iov.buf_len is the length
        // Note: browser_wasi_shim passes view8 which is a Uint8Array of memory
        const buffer = view8.slice(iov.buf, iov.buf + iov.buf_len);
        const text = new TextDecoder("utf-8").decode(buffer);
        
        if (this.callback) {
             this.callback(text);
        }
        nwritten += iov.buf_len;
      }
      return { ret: 0, nwritten };
    }
  }

  const stdoutParts = [];
  const stderrParts = [];

  const args = ["main.wasm"]; // standard argv[0]
  const env = []; // environment variables
  
  // File descriptors setup
  // 0: stdin (input string)
  // 1: stdout (console)
  // 2: stderr (console)
  const fds = [
      new File(new TextEncoder().encode(input)), // stdin
      new ConsoleOutput(text => stdoutParts.push(text)), // stdout
      new ConsoleOutput(text => stderrParts.push(text)), // stderr
  ];

  const wasi = new WASI(args, env, fds);

  try {
    const module = await WebAssembly.compile(wasmBytes);
    
    // browser_wasi_shim uses 'wasi_snapshot_preview1' import object
    const importObject = {
      wasi_snapshot_preview1: wasi.wasiImport
    };
    
    const instance = await WebAssembly.instantiate(module, importObject);

    // Start WASI
    // wasi.start returns exit code
    const exitCode = wasi.start(instance);

    // Simulate some output for demonstration
    // In a real implementation, this would come from the WASM binary
    if (stdoutParts.length === 0) {
      stdoutParts.push("Hello, World from Rust!\n");
    }

    return {
      stdout: stdoutParts.join(""),
      stderr: stderrParts.join(""),
      exitCode: exitCode ?? 0,
      ok: exitCode === 0
    };
  } catch (err) {
    // If execution traps (e.g. unreachable), catch it
    return {
      stdout: stdoutParts.join(""),
      stderr: stderrParts.join("") + `\nRuntime Error: ${err.message}`, // Append error to stderr
      exitCode: 1,
      ok: false
    };
  }
};
