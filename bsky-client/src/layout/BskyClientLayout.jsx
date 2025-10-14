import SidebarNav from '../components/SidebarNav'

export default function BskyClientLayout ({
  activeSection,
  onSelectSection,
  onOpenCompose,
  headerContent,
  children
}) {
  return (
    <div className='grid grid-cols-12 gap-4'>
      <aside className='col-span-12 md:col-span-3 lg:col-span-2'>
        <div className='sticky top-0'>
          <SidebarNav
            active={activeSection}
            onSelect={onSelectSection}
            onCompose={onOpenCompose}
          />
        </div>
      </aside>
      <section className='col-span-12 md:col-span-9 lg:col-span-10'>
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
