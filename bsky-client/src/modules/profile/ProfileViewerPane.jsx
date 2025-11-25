import { Suspense, lazy, useCallback, useState } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import ProfileMetaSkeleton from './ProfileMetaSkeleton.jsx'
import DetailPaneHeader from '../shared/DetailPaneHeader.jsx'

const ProfileViewLazy = lazy(async () => {
  const module = await import('./ProfileView')
  return { default: module.ProfileView ?? module.default }
})

export default function ProfileViewerPane () {
  const { profileViewer } = useAppState()
  const dispatch = useAppDispatch()
  const actor = profileViewer?.actor || ''
  const [headline, setHeadline] = useState({ name: '', handle: '', did: '' })

  if (!profileViewer?.open || !actor) return null

  const handleClose = () => dispatch({ type: 'CLOSE_PROFILE_VIEWER' })
  const handleHeadlineChange = useCallback((info) => {
    if (!info) {
      setHeadline({ name: '', handle: '', did: '' })
      return
    }
    setHeadline({
      name: info.displayName || '',
      handle: info.handle || '',
      did: info.did || ''
    })
  }, [])

  const formatIdentifier = (value) => {
    if (!value) return ''
    if (value.startsWith('did:')) return value
    return value.startsWith('@') ? value : `@${value}`
  }

  const titleName = headline.name || formatIdentifier(headline.handle) || formatIdentifier(actor)
  const headerTitle = titleName ? `Profil von ${titleName}` : 'Profil'
  const subtitleCandidate = formatIdentifier(headline.handle) || headline.did || formatIdentifier(actor)
  const showSubtitle = Boolean(subtitleCandidate && subtitleCandidate !== titleName)

  return (
    <div className='flex h-full min-h-[400px] flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-background shadow-soft p-3 sm:p-4' data-component='BskyProfilePane'>
      <DetailPaneHeader
        eyebrow='Profil'
        title={headerTitle}
        subtitle={showSubtitle ? subtitleCandidate : ''}
        onBack={handleClose}
      />
      <div className='flex-1 overflow-hidden rounded-[20px] border border-border/60 bg-background-subtle/30'>
        <Suspense fallback={
          <div className='flex h-full w-full items-center justify-center p-4'>
            <ProfileMetaSkeleton />
          </div>
        }>
          <ProfileViewLazy
            actor={actor}
            onClose={handleClose}
            onHeadlineChange={handleHeadlineChange}
            showHeroBackButton={false}
          />
        </Suspense>
      </div>
    </div>
  )
}
