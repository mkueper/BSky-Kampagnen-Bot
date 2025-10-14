import { useState } from 'react'
import TopNav from './components/TopNav'
import Timeline from './components/Timeline'
import Composer from './components/Composer'

export default function BskyClientApp () {
  const [tab, setTab] = useState('home')

  let content = null
  if (tab === 'home') content = <Timeline />
  else if (tab === 'compose') content = <Composer />
  else if (tab === 'notifications') content = <div className='text-sm text-muted-foreground'>Notifications – folgt</div>
  else if (tab === 'profile') content = <div className='text-sm text-muted-foreground'>Profil – folgt</div>

  return (
    <div className='space-y-6'>
      <TopNav active={tab} onChange={setTab} />
      {content}
    </div>
  )
}

