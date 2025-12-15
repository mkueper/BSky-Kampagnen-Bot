import React, { useMemo, useRef, useState } from 'react'
import { MagnifyingGlassIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Button, InlineMenu, InlineMenuTrigger, InlineMenuContent } from '../shared'
import { useSearchContext } from './SearchContext.jsx'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

export default function SearchHeader () {
  const {
    draftQuery,
    setDraftQuery,
    submitSearch,
    availableTabs,
    activeTab,
    setActiveTab,
    prefixSuggestions,
    showPrefixSuggestions,
    activePrefixHint,
    showInlinePrefixHint,
    applyPrefixSuggestion,
    advancedPrefixes = [],
    prefixHintDictionary
  } = useSearchContext()
  const { t, locale } = useTranslation()
  const inputRef = useRef(null)
  const [infoOpen, setInfoOpen] = useState(false)

  const handleApplySuggestion = (entry) => {
    applyPrefixSuggestion(entry)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const infoHintMap = useMemo(() => {
    if (!prefixHintDictionary || typeof prefixHintDictionary !== 'object') return null
    const normalizedLocale = typeof locale === 'string' ? locale.toLowerCase() : 'de'
    return prefixHintDictionary[normalizedLocale] || prefixHintDictionary.de || null
  }, [locale, prefixHintDictionary])

  const infoEntries = useMemo(() => {
    if (!Array.isArray(advancedPrefixes)) return []
    return advancedPrefixes
      .map((entry, index) => {
        const prefix = entry?.prefix || ''
        if (!prefix) return null
        const id = entry?.id || `${prefix}-${index}`
        const description = (infoHintMap && entry?.id && infoHintMap[entry.id]) || entry?.hint || ''
        return { id, prefix, description }
      })
      .filter(Boolean)
  }, [advancedPrefixes, infoHintMap])

  const hasInfoEntries = infoEntries.length > 0
  const infoButtonLabel = t('search.prefixes.infoButton', 'Prefix-Hinweise')

  return (
    <div className='space-y-4' data-component='BskySearchHeader'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-base font-semibold text-foreground'>{t('search.header.title', 'Suche')}</p>
      </div>

      <form
        className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'
        onSubmit={submitSearch}
      >
        <div className='relative flex-1'>
          <div className='flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2 shadow-soft'>
            <MagnifyingGlassIcon className='h-5 w-5 text-foreground-muted' />
            <div className='relative flex-1'>
              <input
                type='search'
                ref={inputRef}
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder={t('search.header.placeholder', 'Nach Posts oder Personen suchen…')}
                className='relative z-10 w-full bg-transparent text-sm outline-none'
              />
              {showInlinePrefixHint && activePrefixHint && (
                <div className='pointer-events-none absolute inset-0 z-0 flex items-center text-sm text-foreground-muted/80'>
                  <span className='invisible whitespace-pre'>{draftQuery}</span>
                  <span className='whitespace-pre'> {activePrefixHint}</span>
                </div>
              )}
            </div>
            {hasInfoEntries ? (
              <InlineMenu open={infoOpen} onOpenChange={setInfoOpen}>
                <InlineMenuTrigger>
                  <button
                    type='button'
                    aria-label={infoButtonLabel}
                    title={infoButtonLabel}
                    className='inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border text-foreground-muted transition hover:text-foreground hover:border-primary/60'
                  >
                    <InfoCircledIcon className='h-4 w-4' />
                  </button>
                </InlineMenuTrigger>
                <InlineMenuContent side='bottom' align='end' className='w-72 space-y-3'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>
                    {t('search.prefixes.infoTitle', 'Such-Prefixe & Hinweise')}
                  </p>
                  <div className='max-h-[320px] space-y-3 overflow-y-auto pr-1'>
                    {infoEntries.map((entry) => (
                      <div key={entry.id} className='rounded-xl border border-border/60 bg-background-subtle px-3 py-2'>
                        <p className='text-sm font-semibold text-foreground'>{entry.prefix}</p>
                        {entry.description
                          ? (
                            <p className='mt-1 text-xs text-foreground-muted'>
                              {entry.description}
                            </p>
                            )
                          : null}
                      </div>
                    ))}
                    {!infoEntries.length && (
                      <p className='text-xs text-foreground-muted'>
                        {t('search.prefixes.infoEmpty', 'Keine zusätzlichen Hinweise vorhanden.')}
                      </p>
                    )}
                  </div>
                  <p className='text-[11px] text-foreground-muted'>
                    {t('search.prefixes.infoHint', 'Tipp: Drücke ":" um Prefixe direkt auszuwählen.')}
                  </p>
                </InlineMenuContent>
              </InlineMenu>
            ) : null}
          </div>
          {showPrefixSuggestions && prefixSuggestions.length > 0 && (
            <div className='absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-border bg-background-subtle p-3 shadow-elevated'>
              <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>
                {t('search.prefixes.title', 'Such-Prefixe')}
              </p>
              <div className='mt-2 flex flex-wrap gap-2'>
                {prefixSuggestions.map((entry) => (
                  <button
                    key={`${entry.id || entry.prefix}-${entry.hint}`}
                    type='button'
                    onClick={() => handleApplySuggestion(entry)}
                    className='group flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground transition hover:border-primary hover:bg-primary/10'
                  >
                    <span className='font-semibold'>{entry.prefix}</span>
                    {entry.hint && (
                      <span className='text-xs text-foreground-muted group-hover:text-foreground'>
                        {entry.hint}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button type='submit' variant='primary' size='pill' disabled={!draftQuery.trim()}>
          {t('search.header.submit', 'Suchen')}
        </Button>
      </form>

      <div className='flex flex-wrap gap-2'>
        {availableTabs.map(tab => (
          <button
            key={tab.id}
            type='button'
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transform transition-all duration-150 ease-out ${
              activeTab === tab.id ? 'border border-border bg-background-subtle text-foreground shadow-soft' : 'text-foreground-muted hover:bg-background-subtle/80 dark:hover:bg-primary/10 hover:text-foreground hover:shadow-lg hover:scale-[1.02]'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {t(tab.labelKey || 'search.tabs.fallback', tab.label)}
          </button>
        ))} 
      </div>
    </div>
  )
}
