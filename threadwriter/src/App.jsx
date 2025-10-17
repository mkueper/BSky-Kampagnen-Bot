import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSegments, BLUESKY_LIMIT } from './lib/segment.js'
import GifPicker from './components/GifPicker.jsx'
import { compressImage } from './lib/image.js'
import { BlueskyClient } from './lib/bskyClient.js'

export default function App() {
  const [identifier, setIdentifier] = useState(() => {
    try { return localStorage.getItem('tw_identifier') ?? (import.meta.env.VITE_TW_IDENTIFIER || '') } catch { return '' }
  })
  const [password, setPassword] = useState(() => {
    try { return localStorage.getItem('tw_password') ?? (import.meta.env.VITE_TW_PASSWORD || '') } catch { return '' }
  })
  const [remember, setRemember] = useState(() => {
    try { return localStorage.getItem('tw_remember') === '1' } catch { return false }
  })
  const [source, setSource] = useState('')
  const [appendNumbering, setAppendNumbering] = useState(true)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState([]) // per segment status
  const [error, setError] = useState('')
  const [pendingMedia, setPendingMedia] = useState({}) // { [index]: [{ file, url, alt }] }
  const [mediaTargetIndex, setMediaTargetIndex] = useState(null)
  const fileInputRef = useRef(null)

  const MAX_MEDIA_PER_SKEET = 4
  const MAX_BYTES = 8 * 1024 * 1024
  const UPLOAD_TARGET_BYTES = Number(import.meta.env.VITE_TW_UPLOAD_TARGET_BYTES || (900 * 1024))
  const UPLOAD_HEADROOM = Math.max(0.5, Math.min(1, Number(import.meta.env.VITE_TW_UPLOAD_HEADROOM || 0.97)))
  const ALLOWED_MIMES = ['image/jpeg','image/png','image/webp','image/gif']
  const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY || ''
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const [gifTargetIndex, setGifTargetIndex] = useState(null)

  const segments = useMemo(() => buildSegments(source, { appendNumbering, limit: BLUESKY_LIMIT }), [source, appendNumbering])

  const counts = useMemo(() => segments.map((t) => t.length), [segments])
  const exceeds = useMemo(() => segments.map((t) => t.length > BLUESKY_LIMIT), [segments])

  const segmentHasContent = useMemo(() => segments.map((t, i) => (t.trim().length > 0) || (Array.isArray(pendingMedia[i]) && pendingMedia[i].length > 0)), [segments, pendingMedia])
  const canSend = identifier && password && segments.length > 0 && exceeds.every((x) => !x) && segmentHasContent.every(Boolean)

  // Persist credentials if desired
  useEffect(() => {
    try {
      if (remember) {
        localStorage.setItem('tw_identifier', identifier || '')
        localStorage.setItem('tw_password', password || '')
        localStorage.setItem('tw_remember', '1')
      } else {
        localStorage.removeItem('tw_identifier')
        localStorage.removeItem('tw_password')
        localStorage.setItem('tw_remember', '0')
      }
    } catch {}
  }, [identifier, password, remember])

  async function handlePost() {
    setError('')
    setStatus(segments.map(() => ({ state: 'pending' })))
    setSending(true)
    try {
      const client = new BlueskyClient()
      await client.login(identifier.trim(), password.trim())

      let root = null
      let parent = null
      for (let i = 0; i < segments.length; i++) {
        setStatus((s) => s.map((it, idx) => (idx === i ? { state: 'posting' } : it)))
        try {
          // Optional: upload media for this segment
          let embed = undefined
          const media = Array.isArray(pendingMedia[i]) ? pendingMedia[i] : []
          if (media.length > 0) {
            const uploaded = []
            for (let m = 0; m < media.length; m++) {
              const item = media[m]
              setStatus((s) => s.map((it, idx) => (idx === i ? { state: 'posting', info: `Medien hochladen ${m+1}/${media.length}` } : it)))
              const file = item.file
              const isGif = (file.type || '').toLowerCase() === 'image/gif'
              let uploadBlob = file
              let encoding = file.type || 'image/jpeg'
              // Compress non-GIF images to a target size similar to the official app behavior
              if (!isGif) {
                try {
                  const c = await compressImage(file, { targetBytes: Math.floor(UPLOAD_TARGET_BYTES * UPLOAD_HEADROOM), maxWidth: 2048, maxHeight: 2048, preferType: 'image/webp' })
                  uploadBlob = c.blob
                  encoding = c.type || encoding
                } catch {}
              }

              // Try upload, if size rejected, attempt a smaller quality pass
              let up
              try {
                up = await client.agent.uploadBlob(uploadBlob, { encoding })
              } catch (e) {
                // Retry one step lower quality for non-GIF
                if (!isGif) {
                  try {
                    const c2 = await compressImage(file, { targetBytes: Math.floor(Math.max(UPLOAD_TARGET_BYTES * 0.8 * UPLOAD_HEADROOM, 400 * 1024)), maxWidth: 1920, maxHeight: 1920, preferType: 'image/webp' })
                    uploadBlob = c2.blob
                    encoding = c2.type || encoding
                    up = await client.agent.uploadBlob(uploadBlob, { encoding })
                  } catch (err2) {
                    throw err2
                  }
                } else {
                  throw e
                }
              }
              const blob = up?.data?.blob || up?.blob || up?.data
              uploaded.push({ blob, alt: item.alt || '' })
            }
            embed = {
              $type: 'app.bsky.embed.images',
              images: uploaded.map((u) => ({ image: u.blob, alt: u.alt || '' }))
            }
          }

          const res = await client.agent.post({
            text: segments[i],
            reply: root && parent ? { root, parent } : undefined,
            embed
          })
          const ref = { uri: res.uri, cid: res.cid }
          if (!root) root = ref
          parent = ref
          setStatus((s) => s.map((it, idx) => (idx === i ? { state: 'ok', uri: ref.uri } : it)))
        } catch (e) {
          setStatus((s) => s.map((it, idx) => (idx === i ? { state: 'error', message: e?.message || String(e) } : it)))
          throw e
        }
      }
      // Erfolg: Thread leeren (Inhalt und Status zurücksetzen)
      setSource('')
      setStatus([])
      setPendingMedia({})
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>ThreadWriter (MVP)</h1>

      <section style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Bluesky Identifier</span>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="handle.xyz oder DID" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>App Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }} />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Zugangsdaten merken (lokal gespeichert)
        </label>
        {remember ? (
          <p style={{ fontSize: 11, color: '#666' }}>Hinweis: Die Zugangsdaten werden unverschlüsselt im Browser‑Speicher (localStorage) abgelegt. Für produktiven Einsatz empfehlen wir später eine Keychain‑Integration.</p>
        ) : null}
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Thread‑Inhalt</label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <input type="checkbox" checked={appendNumbering} onChange={(e) => setAppendNumbering(e.target.checked)} /> Nummerierung `1/x` anhängen
          </label>
        </div>
        <textarea value={source} onChange={(e) => setSource(e.target.value)} placeholder={"Beispiel:\nIntro...\n---\nWeiterer Skeet..."} style={{ width: '100%', height: 220, padding: 12, borderRadius: 8, border: '1px solid #ccc', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13 }} />
      </section>

      <section style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Vorschau</h3>
        {segments.length === 0 || (segments.length === 1 && segments[0].trim().length === 0) ? (
          <p style={{ fontSize: 13, color: '#666' }}>(keine Segmente)</p>
        ) : (
          <ol style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
            {segments.map((text, i) => (
              <li key={i} style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>Skeet {i + 1}</strong>
                  <span style={{ fontSize: 12, color: exceeds[i] ? '#c00' : '#666' }}>{counts[i]}/{BLUESKY_LIMIT}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{text}</div>
                {/* Media UI */}
                <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(Array.isArray(pendingMedia[i]) ? pendingMedia[i] : []).map((item, idx) => (
                      <div key={idx} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 6, width: 160 }}>
                        <div style={{ position: 'relative', height: 90, background: '#fafafa', borderRadius: 6, overflow: 'hidden', border: '1px solid #eee' }}>
                          <img src={item.url} alt={item.alt || `Bild ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <input
                          type="text"
                          value={item.alt}
                          onChange={(e) => {
                            const val = e.target.value
                            setPendingMedia((s) => {
                              const arr = Array.isArray(s[i]) ? s[i].slice() : []
                              if (arr[idx]) arr[idx] = { ...arr[idx], alt: val }
                              return { ...s, [i]: arr }
                            })
                          }}
                          placeholder="Alt‑Text"
                          style={{ marginTop: 6, width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                        />
                        <button
                          onClick={() => {
                            setPendingMedia((s) => {
                              const arr = Array.isArray(s[i]) ? s[i].slice() : []
                              arr.splice(idx, 1)
                              return { ...s, [i]: arr }
                            })
                          }}
                          style={{ marginTop: 6, width: '100%', padding: '6px 8px', borderRadius: 6, background: '#eee', border: '1px solid #ddd', fontSize: 12 }}
                        >
                          Entfernen
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setMediaTargetIndex(i)
                        fileInputRef.current?.click()
                      }}
                      disabled={(Array.isArray(pendingMedia[i]) ? pendingMedia[i].length : 0) >= MAX_MEDIA_PER_SKEET}
                      style={{ padding: '8px 10px', borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', fontSize: 12 }}
                    >
                      Bild hinzufügen
                    </button>
                    <button
                      onClick={() => { setGifTargetIndex(i); setGifPickerOpen(true) }}
                      disabled={(Array.isArray(pendingMedia[i]) ? pendingMedia[i].length : 0) >= MAX_MEDIA_PER_SKEET}
                      title={TENOR_API_KEY ? 'GIF aus Tenor suchen' : 'Tenor API‑Key fehlt (VITE_TENOR_API_KEY)'}
                      style={{ marginLeft: 8, padding: '8px 10px', borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', fontSize: 12 }}
                    >
                      GIF hinzufügen
                    </button>
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
                      {(Array.isArray(pendingMedia[i]) ? pendingMedia[i].length : 0)}/{MAX_MEDIA_PER_SKEET}
                    </span>
                  </div>
                </div>
                {status[i] ? (
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    {status[i].state === 'pending' && <span style={{ color: '#777' }}>wartet…</span>}
                    {status[i].state === 'posting' && <span style={{ color: '#005' }}>{status[i].info || 'sendet…'}</span>}
                    {status[i].state === 'ok' && <span style={{ color: '#060' }}>ok · {status[i].uri}</span>}
                    {status[i].state === 'error' && <span style={{ color: '#900' }}>Fehler: {status[i].message}</span>}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {error ? (
        <p style={{ color: '#900', marginTop: 12, fontSize: 13 }}>Fehler: {error}</p>
      ) : null}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={handlePost} disabled={!canSend || sending} style={{ padding: '10px 14px', borderRadius: 10, background: sending ? '#888' : '#0a66c2', color: '#fff', border: 'none', cursor: canSend && !sending ? 'pointer' : 'not-allowed' }}>
          {sending ? 'Senden…' : 'Posten'}
        </button>
        <button onClick={() => { setSource(''); setStatus([]); setError('') }} disabled={sending} style={{ padding: '10px 14px', borderRadius: 10, background: '#eee', border: '1px solid #ddd' }}>
          Abbrechen
        </button>
      </div>

      {/* hidden file input for media selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIMES.join(',')}
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          const idx = mediaTargetIndex
          if (typeof idx !== 'number') return
          if (!files.length) return
          setPendingMedia((s) => {
            const arr = Array.isArray(s[idx]) ? s[idx].slice() : []
            for (const file of files) {
              if (!ALLOWED_MIMES.includes(file.type)) continue
              if (file.size > MAX_BYTES) continue
              if (arr.length >= MAX_MEDIA_PER_SKEET) break
              const url = URL.createObjectURL(file)
              arr.push({ file, url, alt: '' })
            }
            return { ...s, [idx]: arr }
          })
          try { e.target.value = '' } catch {}
        }}
      />

      <GifPicker
        open={gifPickerOpen}
        apiKey={TENOR_API_KEY}
        maxBytes={MAX_BYTES}
        onClose={() => setGifPickerOpen(false)}
        onPick={async ({ id, downloadUrl, previewUrl }) => {
          try {
            setGifPickerOpen(false)
            const idx = gifTargetIndex
            if (typeof idx !== 'number') return
            const resp = await fetch(downloadUrl)
            const blob = await resp.blob()
            if (blob.size > MAX_BYTES) {
              alert('GIF ist zu groß (max. ~8 MB). Bitte kleineres wählen.')
              return
            }
            const file = new File([blob], `tenor-${id || 'gif'}.gif`, { type: 'image/gif' })
            const url = URL.createObjectURL(file)
            setPendingMedia((s) => {
              const arr = Array.isArray(s[idx]) ? s[idx].slice() : []
              if (arr.length >= MAX_MEDIA_PER_SKEET) return s
              arr.push({ file, url, alt: '' })
              return { ...s, [idx]: arr }
            })
          } catch (e) {
            alert(`GIF konnte nicht geladen werden: ${e?.message || e}`)
          }
        }}
      />
    </div>
  )
}
