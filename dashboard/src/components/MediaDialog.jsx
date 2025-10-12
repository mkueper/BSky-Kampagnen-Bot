import { useEffect, useRef, useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

function humanSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  const units = ['B','KB','MB','GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(1)} ${units[i]}`;
}

export default function MediaDialog({
  open,
  title = 'Bild hinzufügen',
  mode = 'upload', // 'upload' | 'alt'
  accept = 'image/*',
  requireAltText = false,
  maxBytes = 8 * 1024 * 1024,
  allowedMimes = ['image/jpeg','image/png','image/webp','image/gif'],
  initialAlt = '',
  previewSrc = null,
  onConfirm,
  onClose,
}) {
  const [file, setFile] = useState(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const altRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setAlt(initialAlt || '');
      setError(null);
      setPreviewUrl(previewSrc || null);
      setLoaded(false);
      // Kein Auto-Fokus erzwingen, um Scroll-Jumps zu vermeiden
    }
     
  }, [open, initialAlt, previewSrc]);

  useEffect(() => {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return () => {};
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setLoaded(false);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const validate = (f) => {
    if (mode === 'upload') {
      if (!f) return 'Bitte eine Datei wählen.';
      if (f.size > maxBytes) return `Datei zu groß (max. ${humanSize(maxBytes)}).`;
      if (!allowedMimes.includes(f.type)) return 'Nicht unterstützter Dateityp.';
    }
    if (requireAltText && !alt.trim()) return 'Alt‑Text ist erforderlich.';
    if ((alt?.length || 0) > 2000) return 'Alt‑Text ist zu lang (max. 2000 Zeichen).';
    return null;
  };

  const validationMsg = validate(file);
  const disabled = Boolean(validationMsg);

  return (
    <Modal open={open} onClose={onClose} title={title}
      actions={(
        <>
          <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={disabled} onClick={() => onConfirm?.(file, alt)}>Übernehmen</Button>
        </>
      )}
    >
      <div className="space-y-3">
        {mode === 'upload' ? (
          <div>
            <label className="text-sm font-medium text-foreground">Datei</label>
            <input ref={inputRef} type="file" accept={accept} className="mt-1 w-full text-sm" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(null); }} />
            <p className="mt-1 text-xs text-foreground-muted">Erlaubt: {allowedMimes.join(', ')} · Max {humanSize(maxBytes)}</p>
            {validationMsg ? (
              <p className="mt-1 text-sm text-destructive">{validationMsg}</p>
            ) : null}
          </div>
        ) : null}
        <div className="overflow-hidden rounded-xl border border-border bg-background-subtle p-2">
          <div className="relative w-full" style={{ height: 256 }}>
            {/* Overlay Controls: visible sobald eine Datei gewählt ist */}
            {mode === 'upload' && file ? (
              <>
                <div className="absolute left-2 top-2 z-10">
                  <button
                    type="button"
                    className="rounded-full bg-black/80 px-2 py-1 text-[10px] font-semibold text-white hover:bg-black"
                    title={alt?.trim() ? 'Alt‑Text bearbeiten' : 'Alt‑Text hinzufügen'}
                    onClick={() => altRef.current?.focus({ preventScroll: true })}
                    aria-label={alt?.trim() ? 'Alt‑Text bearbeiten' : 'Alt‑Text hinzufügen'}
                  >
                    {alt?.trim() ? 'ALT' : '+ ALT'}
                  </button>
                </div>
                <div className="absolute right-2 top-2 z-10">
                  <button
                    type="button"
                    className="rounded-full bg-black/70 px-2 py-1 text-xs text-white hover:bg-black"
                    title="Ausgewähltes Bild verwerfen"
                    onClick={() => {
                      if (inputRef.current) inputRef.current.value = '';
                      setFile(null);
                      setPreviewUrl(null);
                      setLoaded(false);
                    }}
                    aria-label="Ausgewähltes Bild verwerfen"
                  >
                    ✕
                  </button>
                </div>
              </>
            ) : null}
            {(previewUrl || (mode === 'alt' && previewSrc)) ? (
              <img
                src={previewUrl || previewSrc}
                alt="Vorschau"
                onLoad={() => setLoaded(true)}
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-150 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-foreground-muted">
                Keine Vorschau
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Alt‑Text {requireAltText ? <span className="text-destructive">(Pflicht)</span> : null}</label>
          <textarea
            ref={altRef}
            rows={3}
            maxLength={2000}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="mt-1 w-full resize-y rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Beschreibender Alt‑Text"
          />
          <div className="mt-1 text-right text-[11px] text-foreground-muted">{(alt?.length || 0)}/2000</div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </Modal>
  );
}
