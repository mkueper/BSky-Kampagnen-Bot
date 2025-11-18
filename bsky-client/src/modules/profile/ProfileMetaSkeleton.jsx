import { Card } from '@bsky-kampagnen-bot/shared-ui'

export default function ProfileMetaSkeleton () {
  return (
    <Card padding='p-0' compact className='overflow-hidden border-border/80 bg-background-elevated shadow-card'>
      <div className='relative h-36 w-full bg-background-subtle sm:h-44'>
        <div className='absolute inset-0 bg-gradient-to-r from-background via-background-subtle to-background' />
        <div className='absolute -bottom-12 left-4 sm:-bottom-14 sm:left-6'>
          <div className='h-24 w-24 animate-pulse rounded-full border-4 border-background bg-background-subtle shadow-xl sm:h-28 sm:w-28' />
        </div>
      </div>
      <div className='px-4 pb-6 pt-16 sm:px-6 sm:pt-20'>
        <div className='flex flex-col gap-5'>
          <div className='flex min-w-0 flex-col gap-1'>
            <div className='h-8 w-3/4 animate-pulse rounded bg-background-subtle' />
            <div className='mt-2 h-5 w-1/2 animate-pulse rounded bg-background-subtle' />
          </div>
          <div className='space-y-2'>
            <div className='h-4 w-full animate-pulse rounded bg-background-subtle' />
            <div className='h-4 w-5/6 animate-pulse rounded bg-background-subtle' />
          </div>
          <div className='flex flex-wrap gap-x-6 gap-y-3'>
            <div className='h-6 w-20 animate-pulse rounded bg-background-subtle' />
            <div className='h-6 w-20 animate-pulse rounded bg-background-subtle' />
            <div className='h-6 w-20 animate-pulse rounded bg-background-subtle' />
          </div>
        </div>
      </div>
    </Card>
  )
}