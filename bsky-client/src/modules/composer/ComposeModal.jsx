import React from 'react'
import { Card } from '../shared'

export default function ComposeModal ({ open, children, actions = null, title = 'Neuer Post' }) {
  if (!open) return null
  return (
    <div className='fixed inset-0 z-40 flex items-center justify-center' data-component='BskyComposeModal'>
      <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' aria-hidden='true' data-role='overlay' />
      <Card as='div' padding='p-4' className='relative z-50 flex max-h-[92vh] w-[min(720px,92vw)] flex-col overflow-hidden shadow-card' data-role='panel'>
        <div className='mb-2 flex items-center justify-between'>
          <h3 className='text-lg font-semibold'>{title}</h3>
          {actions ? (
            <div className='flex items-center gap-2'>
              {actions}
            </div>
          ) : null}
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
      </Card>
    </div>
  )
}
