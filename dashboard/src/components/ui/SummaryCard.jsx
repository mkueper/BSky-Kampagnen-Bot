import { useTheme } from './ThemeContext'

function SummaryCard ({ title, value, helper, time, snippet, subtitle = 'Nächster Post' }) {
  const theme = useTheme()
  return (
    <article className={`rounded-3xl border border-border ${theme.panelBg} shadow-soft`}>
      <div className='flex flex-col gap-4 p-6'>
        <div>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <p className='text-sm text-foreground-muted'>{subtitle}</p>
        </div>
        <div className='rounded-2xl border border-border-muted bg-background-subtle/60 px-4 py-3'>
          <p className='text-2xl font-semibold text-foreground leading-tight break-words text-balance md:text-3xl'>
            {value}
          </p>
        </div>
        {time || snippet ? (
          <div className='space-y-3'>
            {time ? (
              <span className='block font-semibold text-foreground leading-tight break-words'>
                {time}
              </span>
            ) : null}
            {typeof snippet !== 'undefined' ? (
              <div className='rounded-2xl border border-border-muted bg-background-subtle/70 px-4 py-3 text-sm text-foreground leading-snug break-words'>
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
