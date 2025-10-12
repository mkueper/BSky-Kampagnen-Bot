function SummaryCard ({ title, value, helper, time, snippet, subtitle = 'Nächster Post' }) {
  return (
    <article className='rounded-3xl border border-border bg-background-elevated shadow-soft'>
      <div className='flex flex-col gap-3 p-6'>
        <div>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <p className='text-sm text-foreground-muted'>{subtitle}</p>
        </div>
        <div className='rounded-2xl border border-border-muted bg-background-subtle/60 px-4 py-3'>
          <p className='text-3xl font-semibold text-foreground md:text-4xl'>
            {value}
          </p>
        </div>
        {time || snippet ? (
          <div className='space-y-3'>
            {time ? (
              <span className='block font-semibold text-foreground'>{time}</span>
            ) : null}
            {typeof snippet !== 'undefined' ? (
              <div className='rounded-2xl border border-border-muted bg-background-subtle/70 px-4 py-3 text-foreground'>
                {snippet}
              </div>
            ) : null}
          </div>
        ) : helper ? (
          <div>{helper}</div>
        ) : null}
      </div>
    </article>
  )
}

export default SummaryCard
