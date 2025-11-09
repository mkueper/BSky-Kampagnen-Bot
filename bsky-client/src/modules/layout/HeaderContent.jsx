import React from 'react'
import PropTypes from 'prop-types'
import { ReloadIcon } from '@radix-ui/react-icons'
import { HorizontalScrollContainer } from './index.js'
import { Button } from '../shared/index.js'

const TIMELINE_TABS = [
  { id: 'discover', label: 'Discover' },
  { id: 'following', label: 'Following' },
  { id: 'friends-popular', label: 'Popular with Friends' },
  { id: 'mutuals', label: 'Mutuals' },
  { id: 'best-of-follows', label: 'Best of Follows' }
]

export const ThreadHeader = React.memo(function ThreadHeader ({ busy, onReload, onClose }) {
  return (
    <div className='flex items-center justify-between gap-3' data-component='BskyThreadHeader'>
      <p className='text-sm text-foreground-muted truncate'>Thread-Ansicht</p>
      <div className='flex items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='pill'
          onClick={onReload}
          disabled={busy}
          aria-label='Thread neu laden'
        >
          <ReloadIcon className={`h-4 w-4 shrink-0 transition ${busy ? 'animate-spin' : ''}`} />
          <span className='hidden sm:inline pl-1'>Neu laden</span>
        </Button>
        <Button variant='secondary' size='pill' onClick={onClose}>Zurueck zur Timeline</Button>
      </div>
    </div>
  )
})

ThreadHeader.propTypes = {
  busy: PropTypes.bool,
  onReload: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
}

ThreadHeader.displayName = 'ThreadHeader'

export const TimelineHeader = React.memo(function TimelineHeader ({
  timelineTab,
  timelineReady,
  timelineLoading,
  timelineHasNew,
  onSelectTab,
  onRefresh,
  onScrollTop
}) {
  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <HorizontalScrollContainer
        className='max-w-full'
        data-component='BskyTimelineHeaderContent'
      >
        {TIMELINE_TABS.map(t => (
          <button
            key={t.id}
            type='button'
            onClick={() => onSelectTab(t.id)}
            aria-current={timelineTab === t.id ? 'page' : undefined}
            className={`rounded-2xl px-3 py-1 text-sm transition ${
              timelineTab === t.id
                ? 'bg-background-subtle text-foreground'
                : 'text-foreground-muted'
            }`}
            data-tab={t.id}
          >
            {t.label}
          </button>
        ))}
      </HorizontalScrollContainer>
      <Button
        variant='primary'
        size='pill'
        onClick={() => {
          onScrollTop()
          onRefresh()
        }}
        disabled={!timelineReady || timelineLoading || !timelineHasNew}
        className='whitespace-nowrap'
      >
        {timelineHasNew ? 'Neue Beitraege anzeigen' : 'Aktuell'}
      </Button>
    </div>
  )
}, (prev, next) => (
  prev.timelineTab === next.timelineTab &&
  prev.timelineReady === next.timelineReady &&
  prev.timelineLoading === next.timelineLoading &&
  prev.timelineHasNew === next.timelineHasNew
))

TimelineHeader.propTypes = {
  timelineTab: PropTypes.string.isRequired,
  timelineReady: PropTypes.bool.isRequired,
  timelineLoading: PropTypes.bool.isRequired,
  timelineHasNew: PropTypes.bool.isRequired,
  onSelectTab: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onScrollTop: PropTypes.func.isRequired
}

TimelineHeader.displayName = 'TimelineHeader'
