import { Suspense, lazy, useCallback, useState } from 'react'
import { useUIDispatch, useUIState } from '../../context/UIContext.jsx'
import ProfileMetaSkeleton from './ProfileMetaSkeleton.jsx'
import BskyDetailPane from '../layout/BskyDetailPane.jsx'

const ProfileViewLazy = lazy(async () => {
  const module = await import('./ProfileView')
  return { default: module.ProfileView ?? module.default }
})

export default function ProfileViewerPane ({ registerLayoutHeader, renderHeaderInLayout = false }) {
  const { profileViewer, notificationsSettingsOpen } = useUIState()
  const dispatch = useUIDispatch()
  const actor = profileViewer?.actor || ''
  const [headline, setHeadline] = useState({ name: '', handle: '', did: '' })

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

  if (!profileViewer?.open || !actor) return null

  const formatIdentifier = (value) => {
    if (!value) return ''
    if (value.startsWith('did:')) return value
    return value.startsWith('@') ? value : `@${value}`
  }

  const titleName = headline.name || formatIdentifier(headline.handle) || formatIdentifier(actor)
  const headerTitle = titleName || 'Profil'
  const containerClassName = notificationsSettingsOpen ? 'relative z-[210]' : ''
  const effectiveRenderHeaderInLayout = renderHeaderInLayout && !notificationsSettingsOpen

  return (
    <BskyDetailPane
      header={{
        title: headerTitle,
        onBack: handleClose
      }}
      containerClassName={containerClassName}
      bodyClassName='overflow-hidden'
      registerLayoutHeader={registerLayoutHeader}
      renderHeaderInLayout={effectiveRenderHeaderInLayout}
    >
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
    </BskyDetailPane>
  )
}
