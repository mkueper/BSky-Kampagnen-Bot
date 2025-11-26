import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
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
    setActiveTab
  } = useSearchContext()
  const { t } = useTranslation()

  return (
    <div className='space-y-4' data-component='BskySearchHeader'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-base font-semibold text-foreground'>{t('search.header.title', 'Suche')}</p>
      </div>

      <form
        className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'
        onSubmit={submitSearch}
      >
        <div className='flex flex-1 items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2 shadow-soft'>
          <MagnifyingGlassIcon className='h-5 w-5 text-foreground-muted' />
          <input
            type='search'
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder={t('search.header.placeholder', 'Nach Posts oder Personen suchen…')}
            className='flex-1 bg-transparent text-sm outline-none'
          />
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
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-background-subtle text-foreground shadow-soft' : 'text-foreground-muted hover:text-foreground'
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
