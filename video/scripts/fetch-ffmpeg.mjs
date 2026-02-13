#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const CORE_VERSION = "0.10.0";
const FF_VERSION = "0.10.0";
const assets = [
  {
    url: `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/ffmpeg-core.js`,
    file: "ffmpeg-core.js"
  },
  {
    url: `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/ffmpeg-core.wasm`,
    file: "ffmpeg-core.wasm"
  },
  {
    url: `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/ffmpeg-core.worker.js`,
    file: "ffmpeg-core.worker.js"
  },
  {
    url: `https://unpkg.com/@ffmpeg/ffmpeg@${FF_VERSION}/dist/ffmpeg.min.js`,
    file: "ffmpeg.min.js"
  },
  {
          url: `https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/umd/814.ffmpeg.js`,
    file: "814.ffmpeg.js"
  }
];

async function downloadAsset({ url, file }) {
  process.stdout.write(`Fetching ${file}... `);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${file}: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const dest = path.join(projectRoot, file);
  await writeFile(dest, buffer);
  console.log("done");
}

(async () => {
  await mkdir(projectRoot, { recursive: true });
  for (const asset of assets) {
    await downloadAsset(asset);
  }
  console.log("FFmpeg assets downloaded. You can now load main.js without hitting the network.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
