import React from 'react'
import LinkifiedText from './LinkifiedText'
import LinkPreviewCard from './LinkPreviewCard'
import { useLinkPreview } from '../hooks/useLinkPreview'
import { useTranslation } from '../i18n/I18nProvider.jsx'

function ContentWithLinkPreview ({
  content,
  className = '',
  mediaCount = 0,
  disablePreview = false,
  disableReason = ''
}) {
  const { t } = useTranslation()
  const defaultDisableReason = t(
    'posts.form.previewDisabledReason',
    'Link-Vorschauen stehen nur zur Verfügung, wenn keine Medien angehängt sind.'
  )
  const unavailableMessage = t(
    'posts.form.preview.unavailableStandalone',
    'Link-Vorschau ist im Standalone-Modus derzeit nicht verfügbar.'
  )
  const timeoutMessage = t(
    'posts.form.preview.timeout',
    'Link-Vorschau hat zu lange gebraucht.'
  )
  const resolvedDisableReason = disableReason || defaultDisableReason
  const previewDisabled = disablePreview || mediaCount > 0
  const {
    previewUrl,
    preview,
    loading,
    error
  } = useLinkPreview(content, {
    enabled: !previewDisabled,
    unavailableMessage,
    timeoutMessage
  })

  return (
    <>
      <LinkifiedText
        text={content}
        placeholder={t(
          'posts.form.preview.emptyPlaceholder',
          '(kein Inhalt)'
        )}
        className={className}
      />
      <LinkPreviewCard
        preview={preview}
        url={previewUrl}
        loading={loading}
        error={error}
        disabled={previewDisabled}
        disabledReason={previewDisabled ? resolvedDisableReason : ''}
      />
    </>
  )
}

export default ContentWithLinkPreview
