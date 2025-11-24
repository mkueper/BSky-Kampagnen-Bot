import { Suspense, lazy } from 'react'
import { Button } from '../shared'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import ProfileMetaSkeleton from './ProfileMetaSkeleton.jsx'

const ProfileViewLazy = lazy(async () => {
  const module = await import('./ProfileView')
  return { default: module.ProfileView ?? module.default }
})

export default function ProfileViewerPane () {
  const { profileViewer } = useAppState()
  const dispatch = useAppDispatch()
  const actor = profileViewer?.actor || ''

  if (!profileViewer?.open || !actor) return null

  const handleClose = () => dispatch({ type: 'CLOSE_PROFILE_VIEWER' })

  return (
    <div className='flex h-full min-h-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-soft' data-component='BskyProfilePane'>
      <header className='sticky top-0 z-10 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur'>
        <div className='flex items-center justify-between gap-3'>
          <p className='text-base font-semibold text-foreground truncate'>Profil</p>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' onClick={handleClose}>Zurück</Button>
          </div>
        </div>
      </header>
      <div className='flex-1 overflow-y-auto'>
        <Suspense fallback={
          <div className='flex h-full w-full items-center justify-center p-4'>
            <ProfileMetaSkeleton />
          </div>
        }>
          <ProfileViewLazy
            actor={actor}
            onClose={handleClose}
          />
        </Suspense>
      </div>
    </div>
  )
}
