// Lightweight Web Crypto helpers for local encryption in the browser

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 150000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function u8(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}
function b64(buf) {
  let binary = ''
  const bytes = new Uint8Array(buf)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function encryptString(plaintext, passphrase) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(passphrase, salt)
  const enc = new TextEncoder()
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  return JSON.stringify({ v: 1, iv: b64(iv), salt: b64(salt), ct: b64(ct) })
}

export async function decryptString(payload, passphrase) {
  const { iv, salt, ct } = JSON.parse(payload || '{}')
  if (!iv || !salt || !ct) throw new Error('Invalid payload')
  const key = await deriveKey(passphrase, u8(salt))
  const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8(iv) }, key, u8(ct))
  return new TextDecoder().decode(ptBuf)
}

