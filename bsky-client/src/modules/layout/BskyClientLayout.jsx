import SidebarNav from './SidebarNav'
import { ScrollTopButton } from '../timeline'
import { PlusIcon } from '@radix-ui/react-icons'

export default function BskyClientLayout ({
  activeSection,
  onSelectSection,
  onOpenCompose,
  headerContent,
  topBlock,
  children
}) {
  return (
    <div className='flex gap-6 items-stretch h-screen' data-component='BskyClientLayout'>
      <aside
        className='sticky top-0 shrink-0 w-20 xl:w-max rounded-2xl border border-border bg-background-elevated/80 px-[11px] xl:px-[6px] py-2 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 max-h-[calc(100vh-24px)] overflow-hidden'
        data-component='BskyLayoutAside'
      >
        <SidebarNav
          active={activeSection}
          onSelect={onSelectSection}
          onCompose={onOpenCompose}
        />
      </aside>
      <section
        className='min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden'
        data-component='BskyLayoutMain'
      >
        {headerContent ? (
          <header
            className='sticky top-0 z-10 rounded-2xl border border-border bg-background-elevated/80 px-5 py-4 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60'
            data-component='BskyTimelineHeader'
          >
            {headerContent}
          </header>
        ) : null}

        {topBlock ? (
          <section
            className='space-y-8 pb-8 pl-4 v-full md:pb-8'
            data-component='BskyTopBlock'
          >
            {topBlock}
          </section>
        ) : null}

        <div
          id='bsky-scroll-container'
          className='flex-1 min-h-0 overflow-y-auto pr-1 pt-4'
          data-component='BskyScrollContainer'
          style={{ scrollbarGutter: 'stable' }}
        >
          <main className='space-y-8 pb-6 md:pb-8'>
            {children}
          </main>
          <ScrollTopButton containerId='bsky-scroll-container' position='bottom-left' variant='elevated' />
          {/* Floating Action Button: Neuer Skeet */}
          <button
            type='button'
            onClick={onOpenCompose}
            className='fixed right-5 bottom-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-soft hover:opacity-95'
            aria-label='Neuer Skeet'
            title='Neuen Skeet posten'
          >
            <PlusIcon className='h-6 w-6' />
            <span className='hidden sm:inline'>Neuer Skeet</span>
          </button>
        </div>
      </section>
    </div>
  )
}
