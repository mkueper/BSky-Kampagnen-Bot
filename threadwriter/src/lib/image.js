export async function compressImage(file, {
  targetBytes = 900 * 1024,
  maxWidth = 2048,
  maxHeight = 2048,
  preferType = 'image/webp',
} = {}) {
  // Only process non-GIF raster images
  const srcType = (file.type || '').toLowerCase()
  if (!srcType || srcType === 'image/gif') {
    return { blob: file, type: file.type || 'application/octet-stream' }
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = dataUrl
  })

  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  const scale = Math.min(1, maxWidth / srcW, maxHeight / srcH)
  const dstW = Math.max(1, Math.round(srcW * scale))
  const dstH = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = dstW
  canvas.height = dstH
  const ctx = canvas.getContext('2d', { alpha: true })
  ctx.drawImage(img, 0, 0, dstW, dstH)

  // Try multiple qualities/types until under targetBytes
  const tryTypes = [preferType, 'image/jpeg', 'image/png']
  const qualities = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]

  for (const type of tryTypes) {
    for (const q of qualities) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, q))
      if (!blob) continue
      if (blob.size <= targetBytes) {
        return { blob, type }
      }
    }
  }

  // Fallback: last produced blob with lowest quality of JPEG
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.35))
  return { blob: blob || file, type: 'image/jpeg' }
}

