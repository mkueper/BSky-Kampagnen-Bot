const GLOBAL_SCOPE = typeof window !== 'undefined'
  ? window
  : (typeof globalThis === 'object' ? globalThis : null)

function getBridge () {
  const bridge = GLOBAL_SCOPE?.bskyTemp
  if (!bridge || typeof bridge !== 'object') return null
  const { write, read, delete: del, cleanup, getDirectory } = bridge
  if (typeof write !== 'function' || typeof read !== 'function') return null
  if (typeof del !== 'function' || typeof cleanup !== 'function') return null
  if (typeof getDirectory !== 'function') return null
  return bridge
}

export function isTempStorageAvailable () {
  return Boolean(getBridge())
}

async function writeBuffer (buffer, { fileName } = {}) {
  const bridge = getBridge()
  if (!bridge || !buffer) return null
  const payload = { buffer, fileName: fileName || 'upload.bin' }
  try {
    const result = await bridge.write(payload)
    return result?.tempId || null
  } catch (error) {
    console.warn('Temp storage write failed', error)
    return null
  }
}

export async function saveFromFile (file) {
  if (!file || typeof file.arrayBuffer !== 'function') return null
  const buffer = await file.arrayBuffer()
  return writeBuffer(buffer, { fileName: file.name })
}

export async function saveFromBlob (blob, { fileName = 'upload.bin' } = {}) {
  if (!blob || typeof blob.arrayBuffer !== 'function') return null
  const buffer = await blob.arrayBuffer()
  return writeBuffer(buffer, { fileName })
}

export async function readToBlob (tempId, { type = 'application/octet-stream' } = {}) {
  const bridge = getBridge()
  if (!bridge || !tempId) return null
  try {
    const buffer = await bridge.read({ tempId })
    if (!buffer) return null
    return new Blob([buffer], { type })
  } catch (error) {
    console.warn('Temp storage read failed', error)
    return null
  }
}

export async function deleteTempEntry (tempId) {
  const bridge = getBridge()
  if (!bridge || !tempId) return false
  try {
    const result = await bridge.delete({ tempId })
    return Boolean(result?.success)
  } catch (error) {
    console.warn('Temp storage delete failed', error)
    return false
  }
}

export async function cleanupTempStorage ({ maxAgeMs } = {}) {
  const bridge = getBridge()
  if (!bridge) return { removed: 0 }
  try {
    const result = await bridge.cleanup({ maxAgeMs })
    return { removed: result?.removed ?? 0 }
  } catch (error) {
    console.warn('Temp storage cleanup failed', error)
    return { removed: 0 }
  }
}

export async function getTempDirectory () {
  const bridge = getBridge()
  if (!bridge) return null
  try {
    return await bridge.getDirectory()
  } catch (error) {
    console.warn('Temp storage getDirectory failed', error)
    return null
  }
}
