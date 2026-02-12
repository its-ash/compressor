# WASM Video Studio

🎬 **Private, in-browser video editor powered by WebAssembly and Rust**

Trim, crop, and compress videos entirely in your browser. No uploads, 100% private, works offline.

## Features

✨ **Core Capabilities**
- ✂️ **Video Trimming** - Select start and end points with visual timeline (Rust-validated)
- 🖼️ **Video Cropping** - Drag and resize crop overlay for precise framing (Rust-validated)
- 🗜️ **Smart Compression** - H.264/AAC encoding with adjustable quality (CRF)
- 📦 **Batch Processing** - Process multiple videos in one go
- 🎨 **Resolution Scaling** - Export at 1080p, 720p, 480p, or keep original

🔒 **Privacy & Performance**
- 🌐 **100% Local Processing** - Videos never leave your device
- 🦀 **Rust WebAssembly** - Fast validation for crop/trim parameters, metadata extraction
- ⚡ **FFmpeg.wasm** - Full video encoding in the browser
- 📴 **PWA Support** - Works offline once loaded
- 🎯 **No Server Required** - Static hosting, no backend needed

🎥 **Supported Formats**
- **Input**: MP4, WebM, MOV, AVI, MKV, FLV, WMV, M4V, 3GP, MPEG, MPG
- **Output**: MP4 (H.264 + AAC, browser-compatible)

## Quick Start

### Prerequisites
- Rust toolchain ([rustup.rs](https://rustup.rs))
- wasm-pack (`cargo install wasm-pack`)
- Python 3 (for local server) or any static file server

### Installation

```bash
# Clone or navigate to the video directory
cd /path/to/compressor/video

# Build the Rust WASM module
wasm-pack build --target web --out-dir pkg

# Start local development server
python3 -m http.server 8080

# Or use npm if you prefer
npm install
npm start
```

### Open in Browser
Navigate to `http://localhost:8080` and start editing!

## Usage

1. **Open Video** - Click "📁 Open Video" and select one or more video files
2. **Adjust Settings** - Configure trim points, crop area, resolution, and quality
3. **Trim** - Drag the blue handles on the timeline to set start/end points
4. **Crop** - Drag the overlay corners on the video preview to crop
5. **Export** - Click "Export Video" (or "Process All Files" for batch)
6. **Download** - Video(s) automatically download when complete

### Keyboard Shortcuts
- **Space** - Play/Pause preview
- **Left/Right Arrows** - Seek backward/forward
- **M** - Mute/Unmute

## Architecture

```
┌─────────────────────────────────────────────┐
│           Browser (Client-side)             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐     ┌─────────────────┐  │
│  │  HTML/CSS   │◄────┤   main.js       │  │
│  │  (UI Layer)  │     │ (App Logic)     │  │
│  └──────────────┘     └────────┬────────┘  │
│                                 │           │
│  ┌──────────────┐     ┌────────▼────────┐  │
│  │ Rust WASM   │◄────┤  FFmpeg.wasm    │  │
│  │ (Metadata)   │     │ (Video Encode)  │  │
│  └──────────────┘     └─────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │       Service Worker (Cache)        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Tech Stack
- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3
- **Video Processing**: [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) v0.11.6 (served locally)
- **FFmpeg Core**: Local files (v0.11.0) in `lib/` - All files served locally for maximum performance
- **Metadata/Validation**: Rust + wasm-bindgen
- **PWA**: Service Worker + Web App Manifest
- **Hosting**: Static files (works on GitHub Pages, Netlify, Vercel, etc.)

## Project Structure

```
video/
├── index.html           # Main UI
├── main.js              # Application logic
├── manifest.webmanifest # PWA configuration
├── sw.js                # Service worker (offline support)
├── package.json         # npm scripts
├── Cargo.toml           # Rust dependencies
├── src/
│   └── lib.rs          # Rust WASM source
├── pkg/                # Compiled WASM output
│   ├── video_wasm.js
│   └── video_wasm_bg.wasm
├── lib/                # FFmpeg files (all local, ~24MB total)
│   ├── ffmpeg.min.js          # FFmpeg main library (22KB)
│   ├── ffmpeg-worker.js       # FFmpeg worker (103KB)
│   ├── ffmpeg-core.js         # FFmpeg core (104KB)
│   ├── ffmpeg-core.wasm       # FFmpeg WASM binary (23MB)
│   └── ffmpeg-core.worker.js  # FFmpeg core worker (3.5KB)
└── icons/              # App icons
    ├── icon-192.svg
    └── icon-512.svg
```

## Building from Source

### Rust WASM Module
```bash
# Install wasm-pack if not already installed
cargo install wasm-pack

# Build with optimization
wasm-pack build --target web --out-dir pkg --release

# Output: pkg/video_wasm.js, pkg/video_wasm_bg.wasm
```

### Rust Functions Exposed to JS

**File Validation:**
- `validate_video_file(name, size, type)` - Check if file is supported
- `validate_video_batch(files)` - Batch validation
- `analyze_video_header(name, bytes)` - Detect format from file headers
- `is_web_compatible(extension)` - Check browser playback support

**Crop & Trim Processing:**
- `validate_trim(start, end, duration)` - Validate trim parameters with boundary checks
- `validate_crop(x, y, w, h, videoW, videoH)` - Validate crop region, ensures even dimensions for H.264
- `calculate_crop_with_aspect_ratio(w, h, aspectNum, aspectDen)` - Calculate optimal crop maintaining aspect ratio
- `generate_ffmpeg_filters(crop, scaleW, scaleH)` - Generate FFmpeg filter string for video processing
- `build_processing_params(trim, crop, scaleW, scaleH)` - Build complete validated processing parameters

**Utilities:**
- `format_file_size(bytes)` - Human-readable size formatting
- `format_timestamp(seconds)` - Convert seconds to HH:MM:SS.mmm
- `parse_timestamp(timestamp)` - Parse timestamp string to seconds

## Configuration

### Encoding Presets
- **Very fast** - Faster encoding, larger file
- **Faster** - Balanced speed
- **Balanced** - Good quality/size ratio (recommended)
- **Better quality** - Slower, smaller file

### Quality (CRF)
- **18-23** - High quality, larger file
- **24-26** - Good balance (default: 25)
- **27-32** - Smaller file, visible compression

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Basic editing | ✅ 90+ | ✅ 88+ | ✅ 15+ | ✅ 90+ |
| SharedArrayBuffer | ✅ | ✅ | ✅ | ✅ |
| WebAssembly | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |

**Note**: For optimal performance, enable SharedArrayBuffer by serving with:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Deployment

### GitHub Pages
```bash
# Push video/ directory to gh-pages branch
git subtree push --prefix video origin gh-pages
```

### Netlify/Vercel
Just point the root directory to `video/` and deploy!

### Self-hosted
Copy all files to your web server. No build step required (WASM pre-compiled).

**Important**: Include the `lib/` directory with all FFmpeg files (~24MB total).

**Files required:**
- `lib/ffmpeg.min.js` - FFmpeg main library
- `lib/ffmpeg-worker.js` - FFmpeg worker
- `lib/ffmpeg-core.js` - FFmpeg core JavaScript
- `lib/ffmpeg-core.wasm` - FFmpeg WASM binary (23MB)
- `lib/ffmpeg-core.worker.js` - FFmpeg core worker

## Performance Tips

1. **Fully Local** - All FFmpeg files (~24 MB total) are served locally for best performance
2. **Offline Support** - Service worker caches everything including 23MB WASM for offline use
3. **First Load** - Initial download is ~24MB, then cached permanently
4. **Large Files** - Processing 1GB+ videos may slow down - consider splitting
5. **Memory** - Browser needs ~2-3x the video size in RAM
6. **Encoding Speed** - Use "Very fast" preset for quick previews

## Contributing

Found a bug or want a feature? Contributions welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - feel free to use in your own projects!

## Credits

- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) - Browser video processing
- [wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/) - Rust ↔ JS bindings
- [WebAssembly](https://webassembly.org/) - Fast, secure binary format

## Roadmap

- [ ] Audio trimming/mixing
- [ ] Filters (brightness, contrast, saturation)
- [ ] GIF export
- [ ] Video concatenation
- [ ] Watermark support
- [ ] Multi-track timeline
- [ ] Transitions between clips

---

**Made with 🦀 Rust and ⚡ WebAssembly**

No servers, no uploads, no tracking. Your videos stay yours.
