import React from 'react'

export default function Modal({ open, onClose, title, actions, children, contentWidth }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div
        className='panel'
        style={{
          width: contentWidth || 'min(560px, 92vw)',
          maxHeight: '80vh',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          padding: 0,
        }}
      >
        <div style={{ padding: 10, borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button className='btn btn-icon' aria-label='Schließen' title='Schließen' onClick={onClose}>
            <svg className='icon' viewBox='0 0 24 24' aria-hidden='true'>
              <path d='M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.18 12 2.89 5.71 4.3 4.29 10.59 10.6l6.3-6.31z'/>
            </svg>
          </button>
        </div>
        <div style={{ padding: 12, overflow: 'auto' }}>
          <div className='prose-compact'>
            {children}
          </div>
        </div>
        <div style={{ padding: 10, borderTop: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {actions || (
            <button className='btn btn-primary' onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
