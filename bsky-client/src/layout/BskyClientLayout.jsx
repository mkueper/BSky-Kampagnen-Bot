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
        <SidebarNav
          active={activeSection}
          onSelect={onSelectSection}
          onCompose={onOpenCompose}
        />
      </aside>
      <section className='col-span-12 md:col-span-9 lg:col-span-10'>
        {headerContent ? (
          <div className='mb-3 border-b pb-2'>{headerContent}</div>
        ) : null}
        {children}
      </section>
    </div>
  )
}

