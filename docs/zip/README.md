# WASM ZIP Compressor

Client-side ZIP creation powered by Rust + `wasm-bindgen`. Files never leave the browser; Rust builds the archive in memory and streams the `.zip` back for download.

## Build

Requires Rust and `wasm-pack`.

```sh
cd compressor
cargo install wasm-pack # if you do not have it yet
wasm-pack build --target web --out-dir pkg
```

This produces `pkg/compressor.js` and `pkg/compressor_bg.wasm`, which the browser demo imports.

## Run the demo

A static file server is needed so the browser can fetch the `.wasm` file (no backend logic is involved).

```sh
cd compressor
python3 -m http.server 8000
# then open http://localhost:8000/web/
```

Pick files in the UI, click **Build zip with WebAssembly**, and the download will begin once compression completes.

## API (Rust -> JS)

`zip_files(names: Array, contents: Array) -> Uint8Array`

- `names`: array of plain file names (no paths).
- `contents`: array of `Uint8Array` buffers matching `names`.

The function returns a `Uint8Array` containing the ZIP bytes, ready to wrap in a `Blob` on the JS side.
