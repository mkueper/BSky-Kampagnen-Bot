import SidebarNav from '../components/SidebarNav'

export default function BskyClientLayout ({
  activeSection,
  onSelectSection,
  onOpenCompose,
  headerContent,
  children
}) {
  return (
    <div className='flex gap-4'>
      <aside className='sticky top-0 shrink-0 w-14 xl:w-64'>
        <SidebarNav
          active={activeSection}
          onSelect={onSelectSection}
          onCompose={onOpenCompose}
        />
      </aside>
      <section className='min-w-0 flex-1'>
        <div className='max-h-[70vh] overflow-y-auto pr-2'>
          {headerContent ? (
            <div className='sticky top-0 z-10 border-b pb-2 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
              {headerContent}
            </div>
          ) : null}
          <div className='pt-2'>
            {children}
          </div>
        </div>
      </section>
    </div>
  )
}
