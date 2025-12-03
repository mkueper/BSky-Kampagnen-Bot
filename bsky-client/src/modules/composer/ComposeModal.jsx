import React from 'react'
import { Button, Card } from '../shared'

export default function ComposeModal ({ open, onClose, children, actions = null, title = 'Neuer Post' }) {
  if (!open) return null
  return (
    <div className='fixed inset-0 z-40 flex items-center justify-center' data-component='BskyComposeModal'>
      <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={onClose} aria-hidden='true' data-role='overlay' />
      <Card as='div' padding='p-4' className='relative z-50 w-[min(720px,92vw)] shadow-card' data-role='panel'>
        <div className='flex items-center justify-between mb-2'>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <div className='flex items-center gap-2'>
            {actions}
            <Button variant='ghost' size='icon' onClick={onClose} aria-label='Schließen'>×</Button>
          </div>
        </div>
        <div>{children}</div>
      </Card>
    </div>
  )
}
