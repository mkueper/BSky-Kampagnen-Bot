import Button from './Button'

export default function ComposeModal ({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className='fixed inset-0 z-40 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={onClose} aria-hidden='true' />
      <div className='relative z-50 w-[min(720px,92vw)] rounded-2xl border border-border bg-background p-4 shadow-card'>
        <div className='flex items-center justify-between mb-2'>
          <h3 className='text-lg font-semibold'>Neuer Post</h3>
          <Button variant='ghost' size='icon' onClick={onClose} aria-label='Schließen'>×</Button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}

