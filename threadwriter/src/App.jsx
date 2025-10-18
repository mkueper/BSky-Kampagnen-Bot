import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSegments, BLUESKY_LIMIT } from './lib/segment.js'
import GifPicker from './components/GifPicker.jsx'
import Modal from './components/Modal.jsx'
import { compressImage } from './lib/image.js'
import { BlueskyClient } from './lib/bskyClient.js'
import { encryptString, decryptString } from './lib/crypto.js'

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
  const [lockPass, setLockPass] = useState('')
  const [tenorKey, setTenorKey] = useState(() => {
    try { return localStorage.getItem('tw_tenor_key') || '' } catch { return '' }
  })
  const [source, setSource] = useState('')
  const sourceRef = useRef(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [appendNumbering, setAppendNumbering] = useState(true)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('write') // 'write' | 'settings'
  const [infoPreviewOpen, setInfoPreviewOpen] = useState(false)
  const [infoThreadOpen, setInfoThreadOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tw_theme') || 'light' } catch { return 'light' }
  })
  const [status, setStatus] = useState([]) // per segment status
  const [error, setError] = useState('')
  const [pendingMedia, setPendingMedia] = useState({}) // { [index]: [{ file, url, alt }] }
  const [mediaTargetIndex, setMediaTargetIndex] = useState(null)
  const fileInputRef = useRef(null)
  const [serverUrl, setServerUrl] = useState(() => {
    try { return localStorage.getItem('tw_server_url') || 'https://bsky.social' } catch { return 'https://bsky.social' }
  })

  const MAX_MEDIA_PER_SKEET = 4
  const MAX_BYTES = 8 * 1024 * 1024
  const UPLOAD_TARGET_BYTES = Number(import.meta.env.VITE_TW_UPLOAD_TARGET_BYTES || (900 * 1024))
  const UPLOAD_HEADROOM = Math.max(0.5, Math.min(1, Number(import.meta.env.VITE_TW_UPLOAD_HEADROOM || 0.97)))
  const ALLOWED_MIMES = ['image/jpeg','image/png','image/webp','image/gif']
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const [gifTargetIndex, setGifTargetIndex] = useState(null)
  const splitRef = useRef(null)
  const [leftPct, setLeftPct] = useState(66)
  const draggingRef = useRef(false)
  const [hasProxy, setHasProxy] = useState(false)

  const segments = useMemo(() => buildSegments(source, { appendNumbering, limit: BLUESKY_LIMIT }), [source, appendNumbering])

  const counts = useMemo(() => segments.map((t) => t.length), [segments])
  const exceeds = useMemo(() => segments.map((t) => t.length > BLUESKY_LIMIT), [segments])

  const segmentHasContent = useMemo(() => segments.map((t, i) => (t.trim().length > 0) || (Array.isArray(pendingMedia[i]) && pendingMedia[i].length > 0)), [segments, pendingMedia])
  const canSend = identifier && password && segments.length > 0 && exceeds.every((x) => !x) && segmentHasContent.every(Boolean)

  // Persist credentials encrypted if desired
  useEffect(() => {
    try {
      localStorage.setItem('tw_remember', remember ? '1' : '0')
      if (remember && lockPass && identifier && password) {
        const save = async () => {
          const payload = await encryptString(JSON.stringify({ identifier, password }), lockPass)
          localStorage.setItem('tw_cred_v2', payload)
        }
        save()
      } else if (!remember) {
        localStorage.removeItem('tw_cred_v2')
      }
    } catch {}
  }, [identifier, password, remember, lockPass])

  // Try to load encrypted creds when passphrase provided
  useEffect(() => {
    (async () => {
      try {
        if (!lockPass) return
        const payload = localStorage.getItem('tw_cred_v2')
        if (!payload) return
        const text = await decryptString(payload, lockPass)
        const obj = JSON.parse(text)
        if (obj?.identifier) setIdentifier(obj.identifier)
        if (obj?.password) setPassword(obj.password)
      } catch {}
    })()
  }, [lockPass])

  // Persist Tenor key
  useEffect(() => {
    try { localStorage.setItem('tw_tenor_key', tenorKey || '') } catch {}
  }, [tenorKey])

  // Persist server URL
  useEffect(() => {
    try { localStorage.setItem('tw_server_url', serverUrl || '') } catch {}
  }, [serverUrl])

  // Detect backend Tenor proxy availability
  useEffect(() => {
    let done = false
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    ;(async () => {
      try {
        const res = await fetch('/api/tenor/featured?limit=1', { signal: ctrl.signal })
        if (!done) setHasProxy(res.ok)
      } catch {
        if (!done) setHasProxy(false)
      } finally {
        clearTimeout(t)
      }
    })()
    return () => { done = true; clearTimeout(t); ctrl.abort() }
  }, [])

  // Apply theme to documentElement
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')
    root.removeAttribute('data-theme')
    if (theme === 'dark') root.classList.add('dark')
    else if (theme === 'midnight') root.setAttribute('data-theme', 'midnight')
    try { localStorage.setItem('tw_theme', theme) } catch {}
  }, [theme])

  function cycleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : t === 'dark' ? 'midnight' : 'light'))
  }

  const EMOJI_SET = ['🙂','😂','🎉','❤️','👍','🔥','✨','🙏','🚀','🤖','📷','🧵','📝','📣','🗓️','⏰']

  function insertEmoji(ch) {
    try {
      const el = sourceRef.current
      if (!el) {
        setSource((s) => `${s}${ch}`)
        return
      }
      const start = el.selectionStart ?? source.length
      const end = el.selectionEnd ?? start
      const before = source.slice(0, start)
      const after = source.slice(end)
      const next = `${before}${ch}${after}`
      setSource(next)
      requestAnimationFrame(() => {
        try {
          el.focus()
          const pos = start + String(ch).length
          el.setSelectionRange(pos, pos)
        } catch {}
      })
    } catch {
      setSource((s) => `${s}${ch}`)
    }
  }

  async function handlePost() {
    setError('')
    setStatus(segments.map(() => ({ state: 'pending' })))
    setSending(true)
    try {
      const client = new BlueskyClient((serverUrl || '').trim() || 'https://bsky.social')
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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <section className='panel' style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className='eyebrow'>THREADWRITER</div>
            <h1 className='title-main' style={{ margin: 0 }}>Thread schreiben</h1>
          </div>
          <button className='btn btn-icon' onClick={cycleTheme} title='Theme umschalten' aria-label='Theme umschalten'>
            {theme === 'light' ? (
              <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                <path d='M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.79 1.8-1.79zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zM4.84 19.36l1.79 1.8 1.8-1.8-1.8-1.79-1.79 1.79zM20 11V9h-3v2h3zm-7-7h-2v3h2V4zm3.24.84l1.8-1.79 1.79 1.79-1.79 1.79-1.8-1.79zM12 6a6 6 0 100 12 6 6 0 000-12z'/>
              </svg>
            ) : theme === 'dark' ? (
              <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                <path d='M20 15.31A8 8 0 1111.69 4 6 6 0 0020 15.31z'/>
              </svg>
            ) : (
              <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                <path d='M12 2l2.39 4.85L20 8l-4 3.9L17 18l-5-2.6L7 18l1-6.1L4 8l5.61-1.15L12 2z'/>
              </svg>
            )}
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className='tabs'>
        <button className={`tab ${activeTab === 'write' ? 'tab-active' : ''}`} onClick={() => setActiveTab('write')}>Schreiben</button>
        <button className={`tab ${activeTab === 'settings' ? 'tab-active' : ''}`} onClick={() => setActiveTab('settings')}>Einstellungen</button>
      </div>

      {activeTab === 'settings' ? (
        <section className='panel' style={{ display: 'grid', gap: 12, marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Bluesky Identifier</span>
                <input className='input' value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="handle.xyz oder DID" />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>App Password</span>
                <input className='input' type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" />
              </label>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Schutz‑Passwort (lokale Verschlüsselung)</span>
                <input className='input' type="password" value={lockPass} onChange={(e) => setLockPass(e.target.value)} placeholder="Passwort zum Sichern/Entsperren" />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Server URL</span>
                <input className='input' value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://bsky.social" />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Tenor API‑Key (optional)</span>
                <input className='input' type="password" value={tenorKey} onChange={(e) => setTenorKey(e.target.value)} placeholder="nur für Standalone‑Nutzung" />
              </label>
            </div>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Zugangsdaten merken (verschlüsselt lokal gespeichert)
          </label>
        </section>
      ) : null}

      {activeTab === 'write' ? (
      <div
        ref={splitRef}
        className='split-grid'
        style={{ gridTemplateColumns: `${leftPct}fr 10px ${Math.max(10, 100 - leftPct)}fr` }}
      >
        <div className='tall-card'>
          <section className='panel h-full' style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Thread‑Inhalt</label>
                <button type='button' className='chip chip-muted' onClick={() => setInfoThreadOpen(true)} title='Hinweis anzeigen' aria-label='Hinweis zu Thread‑Inhalt anzeigen'>
                  <svg className='icon-inline' viewBox='0 0 24 24' aria-hidden='true'>
                    <circle cx='12' cy='12' r='10' fill='none' stroke='currentColor' strokeWidth='2'/>
                    <path d='M12 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-1 2.5h2v6h-2z' fill='currentColor'/>
                  </svg>
                  Info
                </button>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={appendNumbering} onChange={(e) => setAppendNumbering(e.target.checked)} /> Nummerierung `1/x` anhängen
              </label>
            </div>
            <div className='card-content'>
              {emojiOpen ? (
                <div className='panel-inset' style={{ padding: 8, marginBottom: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: 6 }}>
                    {EMOJI_SET.map((em, i) => (
                      <button
                        key={i}
                        title={em}
                        onClick={() => insertEmoji(em)}
                        className='panel-inset'
                        style={{ padding: 6, fontSize: 18, lineHeight: '18px' }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <textarea
                ref={sourceRef}
                className='textarea mono'
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={"Beispiel:\nIntro...\n---\nWeiterer Skeet..."}
                style={{ height: 300, marginTop: 12 }}
              />
              {error ? (
                <p style={{ color: 'hsl(var(--destructive))', marginTop: 10, fontSize: 13 }}>Fehler: {error}</p>
              ) : null}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <button
                    onClick={() => setEmojiOpen((v) => !v)}
                    className='btn btn-secondary btn-icon'
                    title='Emoji einfügen'
                    aria-label='Emoji einfügen'
                  >
                    <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                      <path d='M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM12 18c-2.3 0-4.3-1.3-5.3-3.2-.2-.4.1-.8.6-.8h9.4c.5 0 .8.4.6.8C16.3 16.7 14.3 18 12 18z'/>
                    </svg>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handlePost} disabled={!canSend || sending} className='btn btn-primary' style={{ opacity: sending ? .7 : 1 }}>
                    <svg className='icon icon-left' viewBox='0 0 24 24' aria-hidden='true'>
                      <path d='M2 21l20-9L2 3v7l14 2-14 2v7z'/>
                    </svg>
                    {sending ? 'Senden…' : 'Posten'}
                  </button>
                  <button onClick={() => { setSource(''); setStatus([]); setError('') }} disabled={sending} className='btn'>
                    <svg className='icon icon-left' viewBox='0 0 24 24' aria-hidden='true'>
                      <path d='M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.18 12 2.89 5.71 4.3 4.29 10.59 10.6l6.3-6.31z'/>
                    </svg>
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div
          className='splitter'
          onMouseDown={(e) => {
            e.preventDefault()
            draggingRef.current = true
            const onMove = (ev) => {
              if (!draggingRef.current) return
              const host = splitRef.current
              if (!host) return
              const rect = host.getBoundingClientRect()
              const x = ev.clientX
              const rel = (x - rect.left) / rect.width
              const pct = Math.max(40, Math.min(80, Math.round(rel * 100)))
              setLeftPct(pct)
            }
            const onUp = () => {
              draggingRef.current = false
              window.removeEventListener('mousemove', onMove)
              window.removeEventListener('mouseup', onUp)
            }
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
          }}
          title='Breite anpassen'
          aria-label='Breite anpassen'
        />

        <aside>
          <section className='panel sticky-top' style={{ marginTop: 0, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Vorschau</h3>
                <button type='button' className='chip chip-muted' onClick={() => setInfoPreviewOpen(true)} title='Hinweis zur Vorschau anzeigen' aria-label='Hinweis zur Vorschau anzeigen'>
                  <svg className='icon-inline' viewBox='0 0 24 24' aria-hidden='true'>
                    <circle cx='12' cy='12' r='10' fill='none' stroke='currentColor' strokeWidth='2'/>
                    <path d='M12 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-1 2.5h2v6h-2z' fill='currentColor'/>
                  </svg>
                  Info
                </button>
              </div>
              <div className='kpi'>{segments.length} {segments.length === 1 ? 'SKEET' : 'SKEETS'}</div>
            </div>
            {segments.length === 0 || (segments.length === 1 && segments[0].trim().length === 0) ? (
              <p style={{ fontSize: 13, color: '#666' }}>(keine Segmente)</p>
            ) : (
              <div className='scrollbox scrollbar-preview'>
              <ol style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
                {segments.map((text, i) => (
              <li key={i} className='panel preview-card'>
                  <div className='preview-header'>
                    <span className='preview-title'>Skeet {i + 1}</span>
                    <div className='preview-actions'>
                      {(() => {
                        const cnt = counts[i] || 0
                        const limit = BLUESKY_LIMIT
                        const warn = cnt > (limit * 0.9)
                        const danger = exceeds[i]
                        const cls = danger ? 'badge badge-danger' : warn ? 'badge badge-warn' : 'badge badge-muted'
                        return <span className={cls}>{cnt}{limit ? ` / ${limit}` : ''}</span>
                      })()}
                      <button
                        type='button'
                        className='btn btn-icon'
                        title='Bild hinzufügen'
                        aria-label='Bild hinzufügen'
                        onClick={() => { setMediaTargetIndex(i); fileInputRef.current?.click() }}
                      >
                        <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                          <path d='M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h14V5H5zm3 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm11 9l-5-6-4 5-2-3-4 4v2h15v-2z'/>
                        </svg>
                      </button>
                      {(hasProxy || !!tenorKey) ? (
                        <button
                          type='button'
                          className='btn btn-icon'
                          title='GIF hinzufügen'
                          aria-label='GIF hinzufügen'
                          onClick={() => { setGifTargetIndex(i); setGifPickerOpen(true) }}
                        >
                          <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                            <path d='M4 4h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3.5 5H6v6h1.5V9zm6.5 0h-5v6h1.5v-2H13v-1.5h-3.5V10H14V9zm1.5 0v6H17V13h2v-1.5h-2V10h2V9h-3z'/>
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className='preview-pre mono'>{text || '(leer)'}</div>
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
                          className='btn'
                          style={{ marginTop: 6 }}
                          title='Entfernen'
                          aria-label='Entfernen'
                        >
                          <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                            <path d='M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'/>
                          </svg>
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
                      className='btn btn-icon'
                      title='Bild hinzufügen'
                      aria-label='Bild hinzufügen'
                    >
                      <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                        <path d='M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h14V5H5zm3 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm11 9l-5-6-4 5-2-3-4 4v2h15v-2z'/>
                      </svg>
                    </button>
                    {(hasProxy || !!tenorKey) ? (
                      <button
                        onClick={() => { setGifTargetIndex(i); setGifPickerOpen(true) }}
                        disabled={(Array.isArray(pendingMedia[i]) ? pendingMedia[i].length : 0) >= MAX_MEDIA_PER_SKEET}
                        title={'GIF aus Tenor suchen'}
                        className='btn btn-icon'
                        aria-label='GIF hinzufügen'
                        style={{ marginLeft: 8 }}
                      >
                        <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
                          <path d='M4 4h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3.5 5H6v6h1.5V9zm6.5 0h-5v6h1.5v-2H13v-1.5h-3.5V10H14V9zm1.5 0v6H17V13h2v-1.5h-2V10h2V9h-3z'/>
                        </svg>
                      </button>
                    ) : null}
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
              </div>
            )}
          </section>
        </aside>
      </div>
      ) : null}

      <Modal
        open={infoPreviewOpen}
        onClose={() => setInfoPreviewOpen(false)}
        title='Hinweis: Vorschau'
      >
        <p>Jeder Abschnitt bildet einen Skeet. Über die Buttons in der Vorschau kannst du pro Skeet Bilder oder GIFs hinzufügen.</p>
        <p>Bilder werden beim Speichern hochgeladen (max. 4 je Skeet).</p>
        <p>Der Zähler zeigt die aktuelle Zeichenanzahl je Skeet im Verhältnis zum Limit der ausgewählten Plattformen.</p>
        <p>Die automatische Nummerierung (1/x) kann im Formular ein- oder ausgeschaltet werden.</p>
      </Modal>

      <Modal
        open={infoThreadOpen}
        onClose={() => setInfoThreadOpen(false)}
        title='Hinweis: Thread‑Inhalt'
      >
        <p>Schreibe den gesamten Thread in ein Feld. Du kannst <code className='panel-inset' style={{ padding: '2px 4px' }}>---</code> als Trenner nutzen oder mit STRG+Enter einen Trenner einfügen.</p>
        <p>Emojis fügst du direkt im Text ein. Medien kannst du pro Skeet in der Vorschau hinzufügen. Maximal 4 Bilder pro Skeet.</p>
        <p>Der Zähler in der Vorschau zeigt die aktuelle Zeichenanzahl je Skeet im Verhältnis zum Limit der gewählten Plattformen.</p>
        <p>Die automatische Nummerierung (1/x) kann über die Option am Editor ein‑ oder ausgeschaltet werden.</p>
      </Modal>

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
        open={(hasProxy || !!tenorKey) && gifPickerOpen}
        maxBytes={MAX_BYTES}
        browserKey={tenorKey}
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
