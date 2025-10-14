import SidebarNav from '../components/SidebarNav'

export default function BskyClientLayout ({
  activeSection,
  onSelectSection,
  onOpenCompose,
  headerContent,
  topBlock,
  children
}) {
  return (
    <div className='flex gap-6 items-stretch' data-component='BskyClientLayout'>
      <aside
        className='shrink-0 self-stretch w-14 xl:w-auto'
        data-component='BskyLayoutAside'
      >
        <SidebarNav
          active={activeSection}
          onSelect={onSelectSection}
          onCompose={onOpenCompose}
        />
      </aside>
      <section
        className='min-w-0 flex-1 flex flex-col overflow-hidden'
        data-component='BskyLayoutMain'
      >
        {headerContent ? (
          <header
            className='sticky top-0 z-10 rounded-2xl border border-border bg-background/90 px-5 py-4 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background/70'
            data-component='BskyTimelineHeader'
          >
            {headerContent}
          </header>
        ) : null}

        {topBlock ? (
          <main
            className='space-y-8 pb-8 pl-4 v-full md:pb-8'
            data-component='BskyTopBlock'
          >
            {topBlock}
          </main>
        ) : null}

        <div
          id='app-scroll-container'
          className='flex-1 min-h-0 overflow-y-auto pr-1 pt-4'
          data-component='BskyScrollContainer'
          style={{ scrollbarGutter: 'stable' }}
        >
          {children}
        </div>
      </section>
    </div>
  )
}
