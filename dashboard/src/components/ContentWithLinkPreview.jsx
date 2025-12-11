import React from 'react'
import LinkifiedText from './LinkifiedText'
import LinkPreviewCard from './LinkPreviewCard'
import { useLinkPreview } from '../hooks/useLinkPreview'

const DEFAULT_DISABLED_REASON = 'Link-Vorschauen stehen nur zur Verfügung, wenn keine Medien angehängt sind.'

function ContentWithLinkPreview ({
  content,
  className = '',
  mediaCount = 0,
  disablePreview = false,
  disableReason = DEFAULT_DISABLED_REASON
}) {
  const previewDisabled = disablePreview || mediaCount > 0
  const {
    previewUrl,
    preview,
    loading,
    error
  } = useLinkPreview(content, { enabled: !previewDisabled })

  return (
    <>
      <LinkifiedText
        text={content}
        placeholder='(kein Inhalt)'
        className={className}
      />
      <LinkPreviewCard
        preview={preview}
        url={previewUrl}
        loading={loading}
        error={error}
        disabled={previewDisabled}
        disabledReason={previewDisabled ? disableReason : ''}
      />
    </>
  )
}

export default ContentWithLinkPreview
