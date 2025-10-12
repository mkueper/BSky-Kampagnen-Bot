function ActivityPanel ({ title, description, items = [], className = '' }) {
  return (
    <article className={`rounded-3xl border border-border bg-background-elevated shadow-soft ${className}`}>
      <div className='flex flex-col gap-4 p-6'>
        <div>
          <h3 className='text-lg font-semibold'>{title}</h3>
          {description ? (
            <p className='text-sm text-foreground-muted'>{description}</p>
          ) : null}
        </div>
        <div className='grid gap-4 sm:grid-cols-2'>
          {items.map(({ label, value }) => (
            <div
              key={label}
              className='rounded-2xl border border-border-muted bg-background-subtle/60 px-4 py-3'
            >
              <p className='text-xs uppercase tracking-[0.3em] text-foreground-muted'>
                {label}
              </p>
              <p className='mt-2 text-3xl font-semibold text-foreground md:text-4xl'>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

export default ActivityPanel

