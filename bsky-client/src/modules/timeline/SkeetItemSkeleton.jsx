import { Card } from '@bsky-kampagnen-bot/shared-ui'

export default function SkeetItemSkeleton () {
  return (
    <Card padding='p-4' className='space-y-3'>
      <div className='flex items-center gap-3'>
        <div className='h-12 w-12 shrink-0 animate-pulse rounded-full bg-background-subtle' />
        <div className='h-5 w-40 animate-pulse rounded bg-background-subtle' />
      </div>
      <div className='ml-15 space-y-2'>
        <div className='h-4 w-full animate-pulse rounded bg-background-subtle' />
        <div className='h-4 w-3/4 animate-pulse rounded bg-background-subtle' />
      </div>
    </Card>
  )
}
