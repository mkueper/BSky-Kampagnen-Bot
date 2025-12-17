import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import Button from './Button.jsx'
import Modal from './Modal.jsx'
import { compressImage } from '../utils/compressImage.js'

const defaultAllowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function humanSize (bytes) {
  if (!Number.isFinite(bytes)) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(1)} ${units[i]}`
}

export default function MediaDialog ({
  open = false,
  title = 'Bild hinzufügen',
  mode = 'upload',
  accept = 'image/*',
  requireAltText = false,
  maxBytes = 8 * 1024 * 1024,
  allowedMimes = defaultAllowedMimes,
  initialAlt = '',
  previewSrc = null,
  onConfirm = undefined,
  onClose = undefined
}) {
  const [file, setFile] = useState(null)
  const [alt, setAlt] = useState('')
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const altRef = useRef(null)
  const hasInitialAlt = Boolean((initialAlt || '').trim())
  const altLength = alt?.length || 0

  useEffect(() => {
    if (open) {
      setFile(null)
      setAlt(initialAlt || '')
      setError(null)
      setPreviewUrl(previewSrc || null)
      setLoaded(false)
    }
  }, [open, initialAlt, previewSrc])

  useEffect(() => {
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setLoaded(false)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  const validate = (selectedFile) => {
    if (mode === 'upload') {
      if (!selectedFile) return ''
      if (!allowedMimes.includes(selectedFile.type)) return 'Nicht unterstützter Dateityp.'
      if (selectedFile.size > maxBytes) return `Maximal ${humanSize(maxBytes)} erlaubt.`
    }
    if (requireAltText && !alt.trim()) return 'Alt-Text ist erforderlich.'
    if ((alt?.length || 0) > 2000) return 'Alt-Text ist zu lang (max. 2000 Zeichen).'
    return null
  }

  const validationMsg = validate(file)
  const disabled = Boolean(validationMsg)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      panelClassName='w-full max-w-3xl'
      actions={(
        <>
          {validationMsg ? <span className='text-sm text-destructive mr-auto'>{validationMsg}</span> : null}
          <Button variant='secondary' onClick={onClose}>Abbrechen</Button>
          <Button variant='primary' disabled={disabled} onClick={() => onConfirm?.(file, alt)}>Übernehmen</Button>
        </>
      )}
    >
      <div className='space-y-6' style={{ minHeight: '360px' }}>
        {mode === 'upload' ? (
          <div>
            <button
              type='button'
              className='inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground hover:bg-background-elevated'
              onClick={() => inputRef.current?.click()}
            >
              Datei auswählen
            </button>
            <input
              ref={inputRef}
              type='file'
              accept={accept}
              className='hidden'
              onChange={async (event) => {
                try {
                  setError(null)
                  const selected = event.target.files?.[0] || null
                  if (!selected) { setFile(null); return }
                  if (!allowedMimes.includes(selected.type)) {
                    setError('Nicht unterstützter Dateityp.')
                    setFile(null)
                    return
                  }
                  if (selected.type.toLowerCase() === 'image/gif') {
                    setFile(selected)
                    return
                  }
                  const target = Number(import.meta.env.VITE_DASH_UPLOAD_TARGET_BYTES || (900 * 1024))
                  const headroom = Math.max(0.5, Math.min(1, Number(import.meta.env.VITE_DASH_UPLOAD_HEADROOM || 0.97)))
                  const { blob, type } = await compressImage(selected, {
                    targetBytes: Math.floor(target * headroom),
                    maxWidth: 2048,
                    maxHeight: 2048,
                    preferType: 'image/webp'
                  })
                  const baseName = String(selected.name || 'image').replace(/\.[A-Za-z0-9]+$/, '')
                  const extension = type.includes('webp') ? '.webp' : (type.includes('jpeg') ? '.jpg' : '.png')
                  const wrapped = new File([blob], `${baseName}${extension}`, { type })
                  setFile(wrapped)
                } catch (err) {
                  setError(err?.message || 'Bild konnte nicht vorbereitet werden.')
                }
              }}
            />
            <p className='mt-1 text-xs text-foreground-muted'>
              Erlaubt: {allowedMimes.join(', ')} · Max {humanSize(maxBytes)}
            </p>
          </div>
        ) : null}
        <div className='overflow-hidden rounded-xl border border-border bg-background-subtle p-2'>
          <div className='relative w-full' style={{ height: 280 }}>
            {mode === 'upload' && file ? (
              <div className='absolute inset-x-0 top-2 z-10 flex justify-end px-2'>
                <button
                  type='button'
                  className='rounded-full bg-black/70 px-2 py-1 text-xs text-white hover:bg-black'
                  onClick={() => altRef.current?.focus({ preventScroll: true })}
                  aria-label='Alt-Text bearbeiten'
                >
                  ALT
                </button>
              </div>
            ) : null}
            {(previewUrl || (mode === 'alt' && previewSrc)) ? (
              <img
                src={previewUrl || previewSrc}
                alt='Vorschau'
                onLoad={() => setLoaded(true)}
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-150 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              />
            ) : (
              <div className='absolute inset-0 flex items-center justify-center text-xs text-foreground-muted'>
                Keine Vorschau
              </div>
            )}
          </div>
        </div>
        <div>
          <div className='flex items-baseline justify-between gap-3'>
            <label className='text-sm font-medium text-foreground'>
              Alt-Text {requireAltText ? <span className='text-destructive'>(Pflicht)</span> : null}
            </label>
            <span className='text-xs text-foreground-muted tabular-nums'>{altLength}/2000</span>
          </div>
          <p className='mt-1 text-xs text-foreground-muted'>
            {hasInitialAlt
              ? 'Passe den vorhandenen Alt-Text bei Bedarf an.'
              : 'Beschreibe kurz, was auf dem Bild oder Video zu sehen ist.'}
          </p>
          <textarea
            ref={altRef}
            rows={3}
            maxLength={2000}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            className='mt-1 w-full resize-y rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40'
            placeholder='Beschreibender Alt-Text'
          />
        </div>
        {error ? <p className='text-sm text-destructive'>{error}</p> : null}
      </div>
    </Modal>
  )
}

MediaDialog.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.string,
  mode: PropTypes.oneOf(['upload', 'alt']),
  accept: PropTypes.string,
  requireAltText: PropTypes.bool,
  maxBytes: PropTypes.number,
  allowedMimes: PropTypes.arrayOf(PropTypes.string),
  initialAlt: PropTypes.string,
  previewSrc: PropTypes.string,
  onConfirm: PropTypes.func,
  onClose: PropTypes.func
}
