import { useTranslation } from '../i18n/I18nProvider.jsx'

function LinkPreviewCard ({
  preview,
  url,
  loading = false,
  error = '',
  disabled = false,
  disabledReason = ''
}) {
  const { t } = useTranslation()
  if (!url) return null

  const domain = preview?.domain || (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  })()

  return (
    <div className='mt-3 flex flex-col gap-2 rounded-xl border border-border bg-background-subtle p-3 text-sm text-foreground'>
      {preview?.image ? (
        <img
          src={preview.image}
          alt=''
          className='max-h-44 w-full rounded-lg object-cover'
          loading='lazy'
        />
      ) : null}
      <div className='space-y-1'>
        <a
          href={preview?.uri || url}
          target='_blank'
          rel='noreferrer noopener'
          className='block text-base font-semibold text-primary hover:underline'
        >
          {preview?.title || url}
        </a>
        {preview?.description ? (
          <p className='text-foreground-muted line-clamp-2'>{preview.description}</p>
        ) : null}
        {domain ? (
          <p className='text-xs uppercase tracking-wide text-foreground-subtle'>{domain}</p>
        ) : null}
        {loading ? (
          <p className='text-xs text-foreground-subtle'>
            {t('posts.form.preview.loading', 'Vorschau wird geladen …')}
          </p>
        ) : null}
        {error ? (
          <p className='text-xs text-destructive'>{error}</p>
        ) : null}
        {disabled && disabledReason ? (
          <p className='text-xs text-foreground-subtle'>{disabledReason}</p>
        ) : null}
      </div>
    </div>
  )
}

export default LinkPreviewCard
