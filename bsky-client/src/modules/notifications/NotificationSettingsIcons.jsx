import React from 'react'

function BaseIcon ({ children, className = '', ...props }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      vectorEffect='non-scaling-stroke'
      preserveAspectRatio='xMidYMid meet'
      className={className}
      aria-hidden='true'
      {...props}
    >
      {children}
    </svg>
  )
}

export function RepostLikeIcon ({ className = '', ...props }) {
  return (
    <BaseIcon className={className} {...props}>
      <path d='M5 7h10a3.5 3.5 0 0 1 3.5 3.5V12' />
      <path d='M16 4l4 4-4 4' />
      <path d='M19 17H9a3.5 3.5 0 0 1-3.5-3.5V12' />
      <path d='M8 20l-4-4 4-4' />
      <path d='M12 20s-7-4.6-7-10.2C5 6.9 7 5 9.3 5c1.3 0 2.4.6 2.7 1.2.3-.6 1.4-1.2 2.7-1.2C17 5 19 6.9 19 9.8 19 15.4 12 20 12 20z' />
    </BaseIcon>
  )
}

export function RepostRepostIcon ({ className = '', ...props }) {
  return (
    <BaseIcon className={className} {...props}>
      <path d='M5 7h10a3.5 3.5 0 0 1 3.5 3.5V12' />
      <path d='M16 4l4 4-4 4' />
      <path d='M19 17H9a3.5 3.5 0 0 1-3.5-3.5V12' />
      <path d='M8 20l-4-4 4-4' />
      <path d='M7 9h8.2a2.8 2.8 0 0 1 2.8 2.8V13' />
      <path d='M15.4 7.6l3.2 3.2-3.2 3.2' />
      <path d='M17 15H8.8A2.8 2.8 0 0 1 6 12.2V11' />
      <path d='M8.6 16.4l-3.2-3.2 3.2-3.2' />
    </BaseIcon>
  )
}
