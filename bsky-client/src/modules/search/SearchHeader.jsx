import React, { useCallback, useEffect, useRef, useState, useId } from 'react'
import { MagnifyingGlassIcon, Cross2Icon } from '@radix-ui/react-icons'
import { Button } from '../shared'
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
    applyPrefixSuggestion
  } = useSearchContext()
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const suggestionListId = useId()
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)

  const handleApplySuggestion = useCallback((entry) => {
    if (!entry) return
    applyPrefixSuggestion(entry)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [applyPrefixSuggestion])

  useEffect(() => {
    if (!showPrefixSuggestions || prefixSuggestions.length === 0) {
      setActiveSuggestionIndex(-1)
      return
    }
    setActiveSuggestionIndex((prev) => {
      if (prev >= 0 && prev < prefixSuggestions.length) return prev
      return 0
    })
  }, [prefixSuggestions.length, showPrefixSuggestions])

  const handleInputKeyDown = useCallback((event) => {
    if (!showPrefixSuggestions || prefixSuggestions.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActiveSuggestionIndex((prev) => {
        if (prefixSuggestions.length === 0) return -1
        const nextIndex = prev < 0
          ? (delta > 0 ? 0 : prefixSuggestions.length - 1)
          : (prev + delta + prefixSuggestions.length) % prefixSuggestions.length
        return nextIndex
      })
      return
    }
    if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
      event.preventDefault()
      const entry = prefixSuggestions[activeSuggestionIndex]
      handleApplySuggestion(entry)
    }
  }, [activeSuggestionIndex, handleApplySuggestion, prefixSuggestions, showPrefixSuggestions])

  const clearLabel = t('search.header.clear', 'Eingabe löschen')
  const hasQueryValue = Boolean(draftQuery)
  const activeSuggestionId = activeSuggestionIndex >= 0 && showPrefixSuggestions
    ? `${suggestionListId}-option-${activeSuggestionIndex}`
    : undefined

  const handleClearQuery = useCallback(() => {
    if (!draftQuery) return
    setDraftQuery('')
    setActiveSuggestionIndex(-1)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [draftQuery, setDraftQuery])

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
                type='text'
                inputMode='search'
                ref={inputRef}
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('search.header.placeholder', 'Nach Posts oder Personen suchen…')}
                aria-activedescendant={activeSuggestionId}
                aria-controls={showPrefixSuggestions ? `${suggestionListId}-list` : undefined}
                className='relative z-10 w-full bg-transparent text-sm outline-none'
              />
              {showInlinePrefixHint && activePrefixHint && (
                <div className='pointer-events-none absolute inset-0 z-0 flex items-center text-sm text-foreground-muted/80'>
                  <span className='invisible whitespace-pre'>{draftQuery}</span>
                  <span className='whitespace-pre'> {activePrefixHint}</span>
                </div>
              )}
            </div>
            {hasQueryValue ? (
              <button
                type='button'
                onClick={handleClearQuery}
                className='inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border text-foreground transition hover:border-primary/60 hover:text-primary'
                aria-label={clearLabel}
                title={clearLabel}
              >
                <Cross2Icon className='h-4 w-4' />
              </button>
            ) : null}
          </div>
          {showPrefixSuggestions && prefixSuggestions.length > 0 && (
            <div
              id={`${suggestionListId}-list`}
              role='listbox'
              className='absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-border bg-background-subtle p-3 shadow-elevated'
            >
              <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>
                {t('search.prefixes.title', 'Such-Prefixe')}
              </p>
              <div className='mt-2 flex flex-wrap gap-2'>
                {prefixSuggestions.map((entry, index) => {
                  const isActive = index === activeSuggestionIndex
                  const optionId = `${suggestionListId}-option-${index}`
                  return (
                    <button
                      key={`${entry.id || entry.prefix}-${entry.hint || 'hint'}`}
                      type='button'
                      id={optionId}
                      aria-selected={isActive}
                      onClick={() => handleApplySuggestion(entry)}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      className={`group flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground hover:border-primary hover:bg-primary/10'}`}
                    >
                      <span className='font-semibold'>{entry.prefix}</span>
                      {entry.hint && (
                        <span className={`text-xs ${isActive ? 'text-primary' : 'text-foreground-muted group-hover:text-foreground'}`}>
                          {entry.hint}
                        </span>
                      )}
                    </button>
                  )
                })}
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
