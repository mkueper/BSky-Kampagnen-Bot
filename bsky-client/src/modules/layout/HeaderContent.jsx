import React, { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { HorizontalScrollContainer } from './index.js'
import { Button } from '../shared/index.js'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

export const ThreadHeader = React.memo(function ThreadHeader ({ onClose, title, actions = null }) {
  const { t } = useTranslation()
  const resolvedTitle = title || t('layout.thread.title', 'Thread-Ansicht')
  return (
    <div className='flex flex-wrap items-center justify-between gap-3' data-component='BskyThreadHeader'>
      <div className='flex items-center gap-3'>
        <button
          type='button'
          className='inline-flex items-center justify-center rounded-full border border-border px-3 py-2 text-sm text-foreground transition hover:bg-background-subtle'
          onClick={onClose}
          aria-label={t('layout.thread.back', 'Zurück zur Timeline')}
        >
          <ArrowLeftIcon className='h-4 w-4' />
        </button>
        <p className='truncate text-base font-semibold text-foreground'>{resolvedTitle}</p>
      </div>
      {actions ? (
        <div className='flex flex-wrap items-center gap-2'>
          {actions}
        </div>
      ) : null}
    </div>
  )
})

ThreadHeader.propTypes = {
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  actions: PropTypes.node
}

ThreadHeader.displayName = 'ThreadHeader'

export function TimelineHeader ({
  timelineTab,
  tabs = [],
  onSelectTab,
  pinnedTabs = [],
  feedMenuOpen = false,
  onToggleFeedMenu,
  onCloseFeedMenu,
  isRefreshing = false
}) {
  const menuRef = useRef(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!feedMenuOpen) return undefined
    const handlePointerDown = (event) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target)) {
        onCloseFeedMenu?.()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [feedMenuOpen, onCloseFeedMenu])

  return (
    <div className='relative flex items-center gap-2' data-component='BskyTimelineHeaderContent' ref={menuRef}>
      <HorizontalScrollContainer className='flex-1 min-w-0'>
        {tabs.map(tab => {
          const isActive = timelineTab === tab.id
          const showBadge = !isActive && tab.hasNew
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => onSelectTab?.(tab)}
              aria-current={isActive ? 'page' : undefined}
              className={`mr-2 rounded-2xl px-3 py-1 text-xs font-medium whitespace-nowrap sm:text-sm transition ${
                isActive
                  ? 'bg-background-subtle text-foreground shadow-soft'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
              data-tab={tab.id}
            >
              <span className='inline-flex items-center gap-1'>
                <span>{tab.label}</span>
                {showBadge ? (
                  <span className='inline-flex h-2 w-2 items-center justify-center'>
                    <span className='h-2 w-2 rounded-full bg-primary' aria-label={t('layout.timeline.newItems', 'Neue Elemente')} />
                  </span>
                ) : null}
                {tab.pinned ? (
                  <span className='text-xs font-semibold uppercase tracking-wide text-primary'>Pin</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </HorizontalScrollContainer>
      <div className='flex flex-none items-center gap-2 pl-1'>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border transition-opacity ${
            isRefreshing ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={!isRefreshing}
        >
          <span className='h-4 w-4 animate-spin rounded-full border-2 border-foreground/40 border-t-transparent' />
        </span>
        <Button
          type='button'
          variant='secondary'
          size='pill'
          onClick={() => onToggleFeedMenu?.()}
          aria-expanded={feedMenuOpen}
        >
          {t('layout.timeline.feedButton', 'Feeds')}
        </Button>
      </div>
      {feedMenuOpen ? (
        <div className='absolute right-0 top-full z-20 mt-3 w-[min(320px,80vw)] rounded-2xl border border-border bg-background p-3 text-sm shadow-soft'>
          <p className='font-semibold text-foreground'>{t('layout.timeline.pinnedFeeds', 'Gepinnte Feeds')}</p>
          {pinnedTabs.length === 0 ? (
            <p className='mt-2 text-sm text-foreground-muted'>{t('layout.timeline.noPins', 'Noch keine Pins vorhanden.')}</p>
          ) : (
            <div className='mt-3 space-y-2'>
              {pinnedTabs.map((tab) => (
                <button
                  key={tab.id}
                  type='button'
                  className='w-full rounded-xl border border-border px-3 py-2 text-left text-sm text-foreground transition hover:bg-background-subtle'
                  onClick={() => {
                    onSelectTab?.(tab)
                    onCloseFeedMenu?.()
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          <p className='mt-3 text-xs text-foreground-muted'>{t('layout.timeline.feedManagerHint', 'Feed-Manager über die Seitenleiste öffnen.')}</p>
        </div>
      ) : null}
    </div>
  )
}

TimelineHeader.propTypes = {
  timelineTab: PropTypes.string.isRequired,
  tabs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    hasNew: PropTypes.bool,
    pinned: PropTypes.bool,
    feedUri: PropTypes.string
  })),
  onSelectTab: PropTypes.func.isRequired,
  pinnedTabs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    feedUri: PropTypes.string
  })),
  feedMenuOpen: PropTypes.bool,
  onToggleFeedMenu: PropTypes.func,
  onCloseFeedMenu: PropTypes.func,
  isRefreshing: PropTypes.bool
}
TimelineHeader.defaultProps = {
  tabs: [],
  pinnedTabs: [],
  feedMenuOpen: false,
  onToggleFeedMenu: undefined,
  onCloseFeedMenu: undefined,
  isRefreshing: false
}
