<script setup lang="ts">
useHead({
  title: 'Image Tools | Local WASM',
  meta: [
    { name: 'description', content: 'In-browser image tools: crop, perspective crop, resize, compress, optimize. Everything stays on your device.' },
    { name: 'robots', content: 'index,follow' },
  ],
})

// WASM functions
let compress_image: any = null
let crop_image: any = null
let perspective_crop: any = null

// State variables
let wasmReadyPromise: Promise<void> | null = null
let currentBytes: Uint8Array | null = null
let originalBytes: Uint8Array | null = null
let currentDims: { width: number; height: number } | null = null
let previewUrl: string | null = null
let cropRect = { x: 0, y: 0, w: 1, h: 1 }
let perspPoints = {
  tl: { x: 0, y: 0 },
  tr: { x: 1, y: 0 },
  br: { x: 1, y: 1 },
  bl: { x: 0, y: 1 },
}
let activeMode: 'crop' | 'perspective' | 'none' = 'crop'

// DOM refs
let fileInput: HTMLInputElement | null = null
let dropzone: HTMLElement | null = null
let statusEl: HTMLElement | null = null
let previewImg: HTMLImageElement | null = null
let metaEl: HTMLElement | null = null
let processBtn: HTMLButtonElement | null = null
let downloadBtn: HTMLButtonElement | null = null
let resetBtn: HTMLButtonElement | null = null
let modeCropBtn: HTMLButtonElement | null = null
let modePerspectiveBtn: HTMLButtonElement | null = null
let cropBox: HTMLElement | null = null
let cropSizeEl: HTMLElement | null = null
let perspOverlay: HTMLElement | null = null
let perspSvg: SVGSVGElement | null = null
let perspPolygon: SVGPolygonElement | null = null
let perspectiveHandleElements: Element[] = []
let perspectiveHandles: Record<string, Element> = {}
let formatSelect: HTMLSelectElement | null = null
let qualityRow: HTMLElement | null = null
let qualityInput: HTMLInputElement | null = null
let qualityValue: HTMLElement | null = null

let projectedSizeTimer: NodeJS.Timeout | null = null
let projectedSizeToken = 0

// HEIC detection constants
const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])
const HEIC_EXTENSION = /\.hei[cf]$/i

// ==================== WASM Loading ====================
const ensureWasm = async () => {
  if (!wasmReadyPromise) {
    wasmReadyPromise = (async () => {
      try {
        const module = await import('../public/image/pkg/image_tools.js')
        compress_image = module.compress_image
        crop_image = module.crop_image
        perspective_crop = module.perspective_crop
        if (module.default && typeof module.default === 'function') {
          await module.default()
        }
      } catch (error) {
        console.error('Failed to load WASM module:', error)
        throw error
      }
    })()
  }
  return wasmReadyPromise
}

// ==================== Utility Functions ====================
const prettySize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

const setDownloadLabel = (value?: number | string | null) => {
  if (!downloadBtn) return
  if (typeof value === 'number' && Number.isFinite(value)) {
    downloadBtn.textContent = `Download (${prettySize(value)})`
    return
  }
  if (typeof value === 'string') {
    downloadBtn.textContent = value
    return
  }
  downloadBtn.textContent = 'Download'
}

const setStatus = (message?: string) => {
  if (statusEl) statusEl.textContent = message || ''
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

// ==================== File Reading ====================
const readFileAsBytes = (file: File): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.readAsArrayBuffer(file)
  })

const extractDimensions = (
  bytes: Uint8Array
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const blob = new Blob([bytes])
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to read image dimensions'))
    }
    img.src = url
  })

// ==================== HEIC Handling ====================
const isHeicFile = (file: File): boolean => {
  if (!file) return false
  const type = (file.type || '').toLowerCase()
  if (type && HEIC_MIME_TYPES.has(type)) return true
  return HEIC_EXTENSION.test(file.name || '')
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to convert canvas to blob'))
      }
    }, type)
  })

const drawSourceToPngBytes = async (
  source: ImageBitmap | OffscreenCanvas | any,
  width: number,
  height: number
): Promise<Uint8Array> => {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Unable to initialise canvas context')
    ctx.drawImage(source, 0, 0, width, height)
    source.close?.()
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    return new Uint8Array(await blob.arrayBuffer())
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to initialise canvas context')
  ctx.drawImage(source, 0, 0, width, height)
  source.close?.()
  const blob = await canvasToBlob(canvas, 'image/png')
  return new Uint8Array(await blob.arrayBuffer())
}

const convertHeicWithImageDecoder = async (buffer: ArrayBuffer, type: string) => {
  if (typeof (globalThis as any).ImageDecoder === 'undefined') return null
  try {
    const decoder = new (globalThis as any).ImageDecoder({
      data: new Uint8Array(buffer),
      type,
    })
    const { image } = await decoder.decode()
    const width = image.displayWidth || image.codedWidth
    const height = image.displayHeight || image.codedHeight
    const bytes = await drawSourceToPngBytes(image, width, height)
    decoder.close?.()
    return { bytes, dimensions: { width, height } }
  } catch (err) {
    console.warn('ImageDecoder HEIC conversion failed', err)
    return null
  }
}

const convertHeicWithBitmap = async (buffer: ArrayBuffer, type: string) => {
  if (typeof createImageBitmap === 'undefined') return null
  try {
    const blob = new Blob([buffer], { type })
    const bitmap = await createImageBitmap(blob)
    const bytes = await drawSourceToPngBytes(bitmap, bitmap.width, bitmap.height)
    return { bytes, dimensions: { width: bitmap.width, height: bitmap.height } }
  } catch (err) {
    console.warn('ImageBitmap HEIC conversion failed', err)
    return null
  }
}

const convertHeicFile = async (file: File) => {
  const type = (file.type || 'image/heic').toLowerCase()
  const buffer = await file.arrayBuffer()

  const viaDecoder = await convertHeicWithImageDecoder(buffer, type)
  if (viaDecoder) {
    return { ...viaDecoder, note: 'Converted HEIC to PNG for editing.' }
  }

  const viaBitmap = await convertHeicWithBitmap(buffer, type)
  if (viaBitmap) {
    return { ...viaBitmap, note: 'Converted HEIC to PNG for editing.' }
  }

  return null
}

const loadImageBytes = async (file: File) => {
  if (!file) return null
  if (isHeicFile(file)) {
    const converted = await convertHeicFile(file)
    if (!converted) {
      throw new Error('Unable to convert HEIC. Please try a different browser or format.')
    }
    return converted
  }
  const bytes = await readFileAsBytes(file)
  return { bytes }
}

// ==================== Preview & Display ====================
const updatePreview = async (bytes: Uint8Array, providedDims?: any) => {
  if (previewUrl) URL.revokeObjectURL(previewUrl)
  const blob = new Blob([bytes])
  previewUrl = URL.createObjectURL(blob)
  if (previewImg) previewImg.src = previewUrl
  const dims = providedDims ?? (await extractDimensions(bytes).catch(() => null))
  currentDims = dims
  const dimText = dims ? `${dims.width}×${dims.height}px` : null
  if (metaEl) {
    metaEl.textContent = dimText
      ? `${dimText} • ${prettySize(bytes.length)}`
      : prettySize(bytes.length)
  }
  cancelProjectedSize()
  setDownloadLabel(bytes.length)
  updateCropOverlay()
  updatePerspectiveOverlay()
}

const setDefaultsFromDims = (dims: any) => {
  if (!dims) return
  cropRect = { x: 0, y: 0, w: 1, h: 1 }
  perspPoints = { tl: { x: 0, y: 0 }, tr: { x: 1, y: 0 }, br: { x: 1, y: 1 }, bl: { x: 0, y: 1 } }
  updateCropOverlay()
  updatePerspectiveOverlay()
}

const handleFile = async (file: File) => {
  if (!file) return
  const heicCandidate = isHeicFile(file)
  setStatus(heicCandidate ? 'Converting HEIC...' : 'Loading image...')
  try {
    const loaded = await loadImageBytes(file)
    if (!loaded || !loaded.bytes) throw new Error('Unable to read image bytes')
    const bytes = loaded.bytes
    originalBytes = bytes
    currentBytes = bytes
    let dims = loaded.dimensions || null
    if (!dims) dims = await extractDimensions(bytes)
    setMode('crop', { silent: true })
    setDefaultsFromDims(dims)
    await updatePreview(bytes, dims)
    updateQualityLabel()
    const messages = []
    if (loaded.note) messages.push(loaded.note)
    messages.push('Image ready. Choose a mode, adjust, then hit Process.')
    setStatus(messages.join(' '))
    if (downloadBtn) downloadBtn.disabled = false
    if (processBtn) processBtn.disabled = false
    if (resetBtn) resetBtn.disabled = false
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err))
  }
}

// ==================== Quality & Format ====================
const updateQualityLabel = () => {
  if (!qualityValue || !qualityInput) return
  qualityValue.textContent = `${qualityInput.value}%`
}

const getOutputSettings = () => {
  const format = formatSelect?.value ?? 'png'
  const sliderValue = Number(qualityInput?.value ?? 80)
  const quality = Math.max(10, Math.min(100, Math.round(Number.isFinite(sliderValue) ? sliderValue : 80)))
  return { format, quality }
}

const updateQualityVisibility = () => {
  const isJpeg = (formatSelect?.value ?? '') === 'jpeg'
  if (qualityRow) qualityRow.style.display = isJpeg ? 'grid' : 'none'
  if (qualityInput) qualityInput.disabled = !isJpeg
  if (qualityValue) qualityValue.style.display = isJpeg ? 'inline' : 'none'
}

const handleQualityChange = () => {
  updateQualityLabel()
  requestProjectedDownloadSize()
}

// ==================== Projected Size ====================
const cancelProjectedSize = () => {
  projectedSizeToken += 1
  if (projectedSizeTimer) {
    clearTimeout(projectedSizeTimer)
    projectedSizeTimer = null
  }
}

const requestProjectedDownloadSize = () => {
  if (!currentBytes) {
    cancelProjectedSize()
    setDownloadLabel(null)
    return
  }
  const { format, quality } = getOutputSettings()
  const token = ++projectedSizeToken
  if (projectedSizeTimer) clearTimeout(projectedSizeTimer)
  setDownloadLabel('Download (estimating…)')
  projectedSizeTimer = setTimeout(async () => {
    try {
      await ensureWasm()
      if (!compress_image) throw new Error('WASM not loaded')
      const projected = compress_image(currentBytes!, quality, format)
      if (projectedSizeToken !== token) return
      setDownloadLabel(projected.length)
    } catch (err) {
      if (projectedSizeToken !== token) return
      console.warn('Failed to estimate compressed size', err)
      setDownloadLabel(null)
    } finally {
      if (projectedSizeToken === token) projectedSizeTimer = null
    }
  }, 180)
}

// ==================== Crop Overlay ====================
const updateCropSizeLabel = () => {
  if (!cropSizeEl) return
  if (!currentDims || activeMode !== 'crop') {
    cropSizeEl.style.display = 'none'
    cropSizeEl.textContent = ''
    return
  }
  const width = Math.max(1, Math.round(cropRect.w * currentDims.width))
  const height = Math.max(1, Math.round(cropRect.h * currentDims.height))
  cropSizeEl.textContent = `${width}×${height}px`
  cropSizeEl.style.display = 'block'
}

const updateCropOverlay = () => {
  if (!previewImg || !cropBox) return
  if (!currentDims || activeMode !== 'crop') {
    cropBox.style.display = 'none'
    updateCropSizeLabel()
    return
  }
  const displayW = previewImg.clientWidth
  const displayH = previewImg.clientHeight
  if (!displayW || !displayH) {
    cropBox.style.display = 'none'
    updateCropSizeLabel()
    return
  }
  cropBox.style.display = 'block'
  cropBox.style.left = `${cropRect.x * displayW}px`
  cropBox.style.top = `${cropRect.y * displayH}px`
  cropBox.style.width = `${cropRect.w * displayW}px`
  cropBox.style.height = `${cropRect.h * displayH}px`
  updateCropSizeLabel()
}

const attachCropInteractions = () => {
  if (!cropBox || !previewImg) return
  let activeHandle: string | null = null
  let startRect: any = null
  let startClient: any = null

  const stop = () => {
    activeHandle = null
    startRect = null
    startClient = null
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', stop)
    document.removeEventListener('pointercancel', stop)
  }

  const onMove = (event: PointerEvent) => {
    if (!activeHandle || !startRect || !currentDims) return
    const displayW = previewImg!.clientWidth
    const displayH = previewImg!.clientHeight
    if (!displayW || !displayH) return
    const dx = (event.clientX - startClient.x) / displayW
    const dy = (event.clientY - startClient.y) / displayH
    let { x, y, w, h } = startRect
    const minW = 4 / displayW
    const minH = 4 / displayH
    const applyClamp = () => {
      x = clamp01(x)
      y = clamp01(y)
      w = Math.max(minW, Math.min(1 - x, w))
      h = Math.max(minH, Math.min(1 - y, h))
    }
    switch (activeHandle) {
      case 'move':
        x += dx
        y += dy
        x = clamp01(x)
        y = clamp01(y)
        x = Math.min(x, 1 - w)
        y = Math.min(y, 1 - h)
        break
      case 'nw':
        x += dx
        y += dy
        w -= dx
        h -= dy
        applyClamp()
        break
      case 'ne':
        y += dy
        w += dx
        h -= dy
        applyClamp()
        break
      case 'sw':
        x += dx
        w -= dx
        h += dy
        applyClamp()
        break
      case 'se':
        w += dx
        h += dy
        applyClamp()
        break
    }
    cropRect = { x, y, w, h }
    updateCropOverlay()
    event.preventDefault()
  }

  const onDown = (event: PointerEvent) => {
    if (!currentDims || activeMode !== 'crop') return
    const target = event.target as HTMLElement
    if (!target.dataset.handle && target !== cropBox) return
    activeHandle = target.dataset.handle || 'move'
    startRect = { ...cropRect }
    startClient = { x: event.clientX, y: event.clientY }
    event.preventDefault()
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', stop)
    document.addEventListener('pointercancel', stop)
  }

  cropBox.addEventListener('pointerdown', onDown as EventListener)
}

// ==================== Perspective Overlay ====================
const updatePerspectiveOverlay = () => {
  if (!perspOverlay || !perspSvg || !perspPolygon) return
  if (!currentDims || activeMode !== 'perspective') {
    perspOverlay.style.display = 'none'
    return
  }
  const rect = previewImg!.getBoundingClientRect()
  const displayW = rect.width
  const displayH = rect.height
  if (!displayW || !displayH) {
    perspOverlay.style.display = 'none'
    return
  }
  perspOverlay.style.display = 'block'
  perspOverlay.style.width = `${displayW}px`
  perspOverlay.style.height = `${displayH}px`
  perspSvg.setAttribute('width', `${displayW}`)
  perspSvg.setAttribute('height', `${displayH}`)
  perspSvg.setAttribute('viewBox', `0 0 ${displayW} ${displayH}`)
  const pointsPx = {
    tl: { x: perspPoints.tl.x * displayW, y: perspPoints.tl.y * displayH },
    tr: { x: perspPoints.tr.x * displayW, y: perspPoints.tr.y * displayH },
    br: { x: perspPoints.br.x * displayW, y: perspPoints.br.y * displayH },
    bl: { x: perspPoints.bl.x * displayW, y: perspPoints.bl.y * displayH },
  }
  const polygonPoints = `${pointsPx.tl.x},${pointsPx.tl.y} ${pointsPx.tr.x},${pointsPx.tr.y} ${pointsPx.br.x},${pointsPx.br.y} ${pointsPx.bl.x},${pointsPx.bl.y}`
  perspPolygon.setAttribute('points', polygonPoints)
  Object.entries(perspectiveHandles).forEach(([key, el]) => {
    const pos = pointsPx[key as keyof typeof pointsPx]
    if (!el || !pos) return
    const htmlEl = el as HTMLElement
    htmlEl.style.left = `${pos.x}px`
    htmlEl.style.top = `${pos.y}px`
  })
}

const attachPerspectiveInteractions = () => {
  if (!perspectiveHandleElements.length) return
  let activeHandle: string | null = null
  let activeElement: Element | null = null

  const stop = (event?: PointerEvent) => {
    if (activeElement && event) {
      (activeElement as HTMLElement).releasePointerCapture?.(event.pointerId)
    }
    activeHandle = null
    activeElement = null
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', stop)
    document.removeEventListener('pointercancel', stop)
  }

  const updateFromEvent = (event: PointerEvent) => {
    if (!currentDims || !activeHandle) return
    const rect = previewImg!.getBoundingClientRect()
    const displayW = rect.width
    const displayH = rect.height
    if (!displayW || !displayH) return
    const x = clamp01((event.clientX - rect.left) / displayW)
    const y = clamp01((event.clientY - rect.top) / displayH)
    perspPoints = { ...perspPoints, [activeHandle]: { x, y } }
    updatePerspectiveOverlay()
  }

  const onMove = (event: PointerEvent) => {
    if (!activeHandle) return
    updateFromEvent(event)
  }

  const onDown = (event: PointerEvent) => {
    if (!currentDims || activeMode !== 'perspective') return
    const key = (event.target as HTMLElement).dataset.point
    if (!key) return
    activeHandle = key
    activeElement = event.target as Element
    event.preventDefault()
    ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
    updateFromEvent(event)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', stop)
    document.addEventListener('pointercancel', stop)
  }

  perspectiveHandleElements.forEach((element) => {
    element.addEventListener('pointerdown', onDown as EventListener)
  })
}

// ==================== Mode Management ====================
const updateModeButtons = () => {
  if (modeCropBtn) {
    modeCropBtn.classList.toggle('active', activeMode === 'crop')
    modeCropBtn.setAttribute('aria-pressed', activeMode === 'crop' ? 'true' : 'false')
  }
  if (modePerspectiveBtn) {
    modePerspectiveBtn.classList.toggle('active', activeMode === 'perspective')
    modePerspectiveBtn.setAttribute('aria-pressed', activeMode === 'perspective' ? 'true' : 'false')
  }
}

const setMode = (mode: 'crop' | 'perspective' | 'none', options: any = {}) => {
  if (!mode || !['crop', 'perspective', 'none'].includes(mode)) return
  const changed = activeMode !== mode
  activeMode = mode
  updateModeButtons()
  updateCropOverlay()
  updatePerspectiveOverlay()
  if (changed && currentBytes && !options.silent) {
    if (mode === 'crop') {
      setStatus('Crop mode active. Drag the handles to adjust.')
    } else if (mode === 'perspective') {
      setStatus('Perspective mode active. Move the four corners.')
    } else {
      setStatus('Overlays hidden. Select a mode to adjust again.')
    }
  }
}

// ==================== Processing ====================
const runPipeline = async () => {
  if (!currentBytes) {
    setStatus('Add an image first.')
    return
  }
  if (processBtn) processBtn.disabled = true
  setStatus('Preparing WebAssembly module...')
  try {
    await ensureWasm()
    let bytes = currentBytes
    if (activeMode === 'crop') {
      if (!currentDims) throw new Error('Crop needs image dimensions')
      const x = Math.max(0, Math.round(cropRect.x * currentDims.width))
      const y = Math.max(0, Math.round(cropRect.y * currentDims.height))
      const w = Math.max(1, Math.round(cropRect.w * currentDims.width))
      const h = Math.max(1, Math.round(cropRect.h * currentDims.height))
      setStatus('Cropping...')
      bytes = crop_image(bytes, x, y, w, h)
    } else if (activeMode === 'perspective') {
      if (!currentDims) throw new Error('Perspective crop needs image dimensions')
      const { width, height } = currentDims
      const pts = new Float32Array([
        perspPoints.tl.x * width,
        perspPoints.tl.y * height,
        perspPoints.tr.x * width,
        perspPoints.tr.y * height,
        perspPoints.br.x * width,
        perspPoints.br.y * height,
        perspPoints.bl.x * width,
        perspPoints.bl.y * height,
      ])
      setStatus('Applying perspective crop...')
      bytes = perspective_crop(bytes, pts, width, height)
    }
    const { format, quality } = getOutputSettings()
    setStatus('Compressing...')
    bytes = compress_image(bytes, quality, format)
    currentBytes = bytes
    await updatePreview(bytes)
    setMode('none', { silent: true })
    setStatus('Done. Preview updated.')
  } catch (err) {
    console.error(err)
    setStatus(err instanceof Error ? err.message : String(err))
  } finally {
    if (processBtn) processBtn.disabled = false
  }
}

const downloadResult = () => {
  if (!currentBytes) return
  const format = formatSelect?.value ?? 'png'
  const blob = new Blob([currentBytes], { type: `image/${format}` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const ext = format === 'jpeg' ? 'jpg' : format
  a.href = url
  a.download = `image-tools-${Date.now()}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const resetImage = async () => {
  if (!originalBytes) return
  currentBytes = originalBytes
  cropRect = { x: 0, y: 0, w: 1, h: 1 }
  perspPoints = { tl: { x: 0, y: 0 }, tr: { x: 1, y: 0 }, br: { x: 1, y: 1 }, bl: { x: 0, y: 1 } }
  setMode('crop', { silent: true })
  await updatePreview(currentBytes)
  setStatus('Back to the original file.')
}

// ==================== Dropzone ====================
const bindDropzone = () => {
  if (!dropzone) return
  const prevent = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }
  ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropzone!.addEventListener(eventName, prevent, false)
    document.body.addEventListener(eventName, prevent, false)
  })
  dropzone.addEventListener('drop', (event: DragEvent) => {
    const [file] = event.dataTransfer?.files || []
    if (file) handleFile(file)
  })
  dropzone.addEventListener('click', () => {
    if (fileInput) fileInput.click()
  })
}

// ==================== Initialization ====================
const initializeTooling = () => {
  fileInput = document.getElementById('fileInput') as HTMLInputElement
  dropzone = document.getElementById('dropzone')
  statusEl = document.getElementById('status')
  previewImg = document.getElementById('preview') as HTMLImageElement
  metaEl = document.getElementById('meta')
  processBtn = document.getElementById('processBtn') as HTMLButtonElement
  downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement
  resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
  modeCropBtn = document.getElementById('modeCrop') as HTMLButtonElement
  modePerspectiveBtn = document.getElementById('modePerspective') as HTMLButtonElement
  cropBox = document.getElementById('cropBox')
  cropSizeEl = document.getElementById('cropSize')
  perspOverlay = document.getElementById('perspOverlay')
  perspSvg = document.getElementById('perspSvg') as SVGSVGElement
  perspPolygon = document.getElementById('perspPolygon') as SVGPolygonElement
  perspectiveHandleElements = Array.from(document.querySelectorAll('.persp-handle'))
  perspectiveHandles = perspectiveHandleElements.reduce(
    (acc, el) => {
      const key = el.getAttribute('data-point')
      if (key) acc[key] = el
      return acc
    },
    {} as Record<string, Element>
  )
  formatSelect = document.getElementById('formatSelect') as HTMLSelectElement
  qualityRow = document.getElementById('qualityRow')
  qualityInput = document.getElementById('qualityInput') as HTMLInputElement
  qualityValue = document.getElementById('qualityValue')

  if (fileInput) {
    fileInput.addEventListener('change', (event: Event) => {
      const [file] = (event.target as HTMLInputElement).files || []
      if (file) handleFile(file)
    })
  }

  if (processBtn) processBtn.addEventListener('click', runPipeline)
  if (downloadBtn) downloadBtn.addEventListener('click', downloadResult)
  if (resetBtn) resetBtn.addEventListener('click', resetImage)

  if (modeCropBtn) {
    modeCropBtn.addEventListener('click', (event: Event) => {
      event.preventDefault()
      setMode('crop')
    })
  }

  if (modePerspectiveBtn) {
    modePerspectiveBtn.addEventListener('click', (event: Event) => {
      event.preventDefault()
      setMode('perspective')
    })
  }

  if (qualityInput) {
    qualityInput.addEventListener('input', handleQualityChange)
    qualityInput.addEventListener('change', handleQualityChange)
  }

  if (formatSelect) {
    formatSelect.addEventListener('change', () => {
      updateQualityVisibility()
      requestProjectedDownloadSize()
    })
  }

  bindDropzone()
  setStatus('Drop an image or browse to get started.')
  if (processBtn) processBtn.disabled = true
  if (downloadBtn) downloadBtn.disabled = true
  if (resetBtn) resetBtn.disabled = true
  setDownloadLabel(null)
  updateModeButtons()
  updateQualityLabel()
  updateQualityVisibility()
  updateCropOverlay()
  updatePerspectiveOverlay()
  attachCropInteractions()
  attachPerspectiveInteractions()

  window.addEventListener('resize', () => {
    updateCropOverlay()
    updatePerspectiveOverlay()
  })

  if (previewImg) {
    previewImg.addEventListener('load', () => {
      requestAnimationFrame(() => {
        updateCropOverlay()
        updatePerspectiveOverlay()
      })
    })
  }
}

onMounted(async () => {
  await nextTick()
  initializeTooling()
})
</script>

<template>
  <div class="min-h-[calc(100vh-48px)] bg-slate-950 text-slate-200 flex flex-col">
    <!-- Main Workspace -->
    <section class="flex-1 p-6 overflow-y-auto">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Preview Card (Left on desktop) -->
          <div class="lg:order-1">
            <div class="bg-slate-900/80 border border-white/8 rounded-xl p-6 backdrop-blur-md h-full">
              <div class="preview-stage mb-4 border border-white/10 rounded-lg overflow-hidden bg-black/40" id="previewStage">
                <img id="preview" alt="Preview" class="w-full h-auto" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'%3E%3Crect width='1280' height='720' fill='%231e293b'/%3E%3Ctext x='640' y='360' text-anchor='middle' fill='%2338bdf8' font-size='48' font-family='monospace'%3EDrop or browse an image%3C/text%3E%3C/svg%3E" />
                <!-- Crop Box (tool-specific markup) -->
                <div id="cropBox" class="crop-box">
                  <div id="cropSize" class="crop-size" aria-live="polite"></div>
                  <span class="handle nw" data-handle="nw"></span>
                  <span class="handle ne" data-handle="ne"></span>
                  <span class="handle sw" data-handle="sw"></span>
                  <span class="handle se" data-handle="se"></span>
                </div>
                <!-- Perspective Overlay (tool-specific SVG) -->
                <div id="perspOverlay" class="persp-overlay">
                  <svg id="perspSvg" class="persp-svg" xmlns="http://www.w3.org/2000/svg">
                    <polygon id="perspPolygon" class="persp-polygon"></polygon>
                  </svg>
                  <span class="persp-handle" data-point="tl"></span>
                  <span class="persp-handle" data-point="tr"></span>
                  <span class="persp-handle" data-point="br"></span>
                  <span class="persp-handle" data-point="bl"></span>
                </div>
              </div>
              <div class="text-slate-400 text-sm mb-3">Use the crop box or adjust the four perspective points to refine the selection.</div>
              <div id="meta" class="font-mono text-xs text-slate-500"></div>
            </div>
          </div>

          <!-- Controls (Right on desktop) -->
          <div class="lg:order-2">
            <div class="space-y-4">
              <!-- Upload Dropzone -->
              <label id="dropzone" class="block border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-xl p-6 bg-cyan-500/5 cursor-pointer transition-all hover:-translate-y-0.5">
                <div class="mb-3">
                  <div class="font-semibold text-base mb-1">Drop an image or browse</div>
                  <div class="text-slate-400 text-sm">PNG, JPEG, WebP, HEIC. Process stays local.</div>
                </div>
                <span class="inline-block px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors">Browse</span>
              </label>
              <input id="fileInput" type="file" accept="image/*,.heic,.heif" class="hidden" />

              <!-- Mode Switch -->
              <div class="flex gap-2">
                <button id="modeCrop" data-mode="crop" class="px-4 py-2 rounded-lg font-semibold text-sm active:bg-cyan-500/20 active:text-cyan-300 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors active">Crop</button>
                <button id="modePerspective" data-mode="perspective" class="px-4 py-2 rounded-lg font-semibold text-sm bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">Perspective Crop</button>
              </div>

              <!-- Process & Download -->
              <div class="space-y-3">
                <div class="flex flex-col gap-2">
                  <button id="processBtn" class="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 rounded-lg font-bold text-sm hover:-translate-y-0.5 transition-all hover:shadow-lg">Process</button>
                  <button id="downloadBtn" class="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 rounded-lg font-bold text-sm hover:-translate-y-0.5 transition-all hover:shadow-lg">Download</button>
                  <button id="resetBtn" class="w-full px-4 py-2.5 border border-white/20 text-slate-300 rounded-lg font-semibold text-sm hover:bg-white/5 transition-colors">Reset</button>
                </div>

                <!-- Compression Settings -->
                <div class="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                  <div id="qualityRow" class="flex items-center gap-4">
                    <label for="qualityInput" class="text-sm font-semibold text-slate-300 whitespace-nowrap">Compression</label>
                    <input id="qualityInput" type="range" min="10" max="100" value="80" class="flex-1 h-2 bg-white/10 rounded-full cursor-pointer">
                    <span id="qualityValue" class="font-mono text-xs text-slate-400 min-w-12">80%</span>
                  </div>
                  <div class="flex items-center gap-4">
                    <label for="formatSelect" class="text-sm font-semibold text-slate-300">Output</label>
                    <div class="relative flex-1">
                      <select id="formatSelect" class="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-200 text-sm font-medium appearance-none pr-8 cursor-pointer hover:bg-slate-800 transition-colors">
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                        <option value="webp" selected>WebP</option>
                      </select>
                      <svg class="absolute right-2 top-2.5 w-5 h-5 text-slate-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                    </div>
                  </div>
                  <div id="status" class="font-mono text-xs text-slate-500 min-h-5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Tool-specific interactive selectors - preserved from original */
#previewStage {
  position: relative;
  max-width: 100%;
  height: auto;
}

.crop-box {
  position: absolute;
  top: 0;
  left: 0;
  border: 2px solid rgba(34, 211, 238, 0.6);
  background: rgba(34, 211, 238, 0.05);
  cursor: move;
  display: none;
  z-index: 10;
}

.crop-box.active {
  display: block;
}

.crop-size {
  position: absolute;
  top: -24px;
  left: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #22d3ee;
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 20;
}

.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #22d3ee;
  border: 2px solid rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  cursor: pointer;
  z-index: 15;
}

.handle.nw { top: -6px; left: -6px; cursor: nwse-resize; }
.handle.ne { top: -6px; right: -6px; cursor: nesw-resize; }
.handle.sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
.handle.se { bottom: -6px; right: -6px; cursor: nwse-resize; }

.persp-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: none;
  z-index: 10;
}

.persp-overlay.active {
  display: block;
}

.persp-svg {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.persp-polygon {
  fill: none;
  stroke: rgba(34, 211, 238, 0.7);
  stroke-width: 2;
  pointer-events: none;
}

.persp-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #22d3ee;
  border: 2px solid rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  cursor: pointer;
  z-index: 20;
  transform: translate(-50%, -50%);
}
</style>
