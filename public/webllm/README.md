# WebLLM Studio

This tool wraps WebLLM’s browser runtime with a Rust-powered conversation manager. By default it downloads models from Hugging Face, but you can host the artifacts locally to avoid blocked networks or speed up development.

## Building the Wasm package

```bash
cd webllm
npm install
npm run build   # runs wasm-pack build --target web --out-dir pkg
```

Serve the folder with any static server (example: `python3 -m http.server 8000`).

## Local model hosting

This build expects the weights to live directly in `webllm/Llama-3.2-1B-Instruct-q4f32_1-MLC/` (matching the Hugging Face folder layout). Steps:

1. Create the folder `webllm/Llama-3.2-1B-Instruct-q4f32_1-MLC/`.
2. Download the snapshot. Example with the Hugging Face CLI:
   ```bash
   huggingface-cli download \
     mlc-ai/Llama-3.2-1B-Instruct-q4f32_1-MLC \
     --include "*.json" "*.bin" "*.metal" \
     --local-dir webllm/Llama-3.2-1B-Instruct-q4f32_1-MLC \
     --local-dir-use-symlinks False
   ```
   You can also download the files manually and keep the exact filenames (for example: `mlc-chat-config.json`, `ndarray-cache.json`, `params_shard_0.bin`, etc.).
   
   **Alternatively, run the included Python script:**
   ```bash
   cd webllm
   python3 download_model.py
   ```

3. Start the dev server. Any request for `https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f32_1-MLC/resolve/main/<file>` is first mapped to `./Llama-3.2-1B-Instruct-q4f32_1-MLC/<file>`. If the file is present locally it is used, otherwise the runtime falls back to the authenticated mirror fetch.

> **Note:** the local folder is ignored by Git so large weights never end up in source control.

## Service worker

`webllm/sw.js` precaches the static shell (HTML, JS, wasm) but intentionally skips the model directory. Large model artifacts are streamed directly from your filesystem or remote mirrors.
