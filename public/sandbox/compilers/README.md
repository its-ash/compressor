Sandbox compiler adapters

Place in-browser toolchains in these folders and expose a global object:
- compilers/clang -> self.clangWasmToolchain.compile(source, log)
- compilers/rust -> self.rustWasmToolchain.compile(source, log)

Rust toolchain build output is expected at:
- compilers/rust/dist/rustc_wasm.js
- compilers/rust/dist/rustc_wasm_bg.wasm

The compile function must return { wasmBytes } where wasmBytes is a Uint8Array or ArrayBuffer.
