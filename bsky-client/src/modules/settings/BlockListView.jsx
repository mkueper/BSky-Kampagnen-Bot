import { useCallback, useEffect, useState } from 'react'
import { Button, Card, fetchBlocks } from '../shared'
import { useAppDispatch } from '../../context/AppContext'

export default function BlockListView () {
  const dispatch = useAppDispatch()
  const [blocks, setBlocks] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const loadBlocks = useCallback(async ({ withCursor, append = false } = {}) => {
    if (!append) {
      setLoading(true)
      setError('')
    }
    try {
      const { blocks: nextBlocks, cursor: nextCursor } = await fetchBlocks({ cursor: withCursor })
      setBlocks((prev) => append ? [...prev, ...nextBlocks] : nextBlocks)
      setCursor(nextCursor)
    } catch (err) {
      setError(err?.message || 'Blockliste konnte nicht geladen werden.')
    } finally {
      if (!append) setLoading(false)
      else setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    loadBlocks()
  }, [loadBlocks])

  const handleReload = useCallback(() => {
    loadBlocks()
  }, [loadBlocks])

  const handleLoadMore = useCallback(() => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    loadBlocks({ withCursor: cursor, append: true })
  }, [cursor, loadBlocks, loadingMore])

  const handleOpenProfile = useCallback((actor) => {
    if (!actor) return
    dispatch({ type: 'OPEN_PROFILE_VIEWER', actor })
  }, [dispatch])

  const hasBlocks = blocks.length > 0

  return (
    <div className='space-y-5' data-component='BskyBlockListView'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-base font-semibold text-foreground'>Blockliste</p>
          <p className='text-sm text-foreground-muted'>Hier siehst du alle Accounts, die du aktuell blockierst.</p>
        </div>
        <Button variant='secondary' onClick={handleReload} disabled={loading}>
          Neu laden
        </Button>
      </div>

      {error ? (
        <Card padding='p-4' className='border border-red-200 bg-red-50 text-sm text-red-700'>
          <p className='font-semibold'>Blockliste konnte nicht geladen werden.</p>
          <p className='mt-1'>{error}</p>
          <Button className='mt-3' variant='primary' size='pill' onClick={handleReload}>
            Erneut versuchen
          </Button>
        </Card>
      ) : null}

      {loading && !hasBlocks ? (
        <p className='text-sm text-foreground-muted'>Blockliste wird geladen…</p>
      ) : null}

      {!loading && !error && !hasBlocks ? (
        <p className='text-sm text-foreground-muted'>Du hast derzeit keine Accounts blockiert.</p>
      ) : null}

      <div className='space-y-3'>
        {blocks.map((entry) => (
          <Card
            key={entry.listEntryId || entry.did || entry.handle}
            padding='p-4'
            className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
          >
            <div className='flex items-start gap-3'>
              {entry.avatar ? (
                <img src={entry.avatar} alt='' className='h-12 w-12 rounded-full border border-border object-cover' />
              ) : (
                <div className='h-12 w-12 rounded-full border border-border bg-background-subtle' />
              )}
              <div className='min-w-0'>
                <p className='font-semibold text-foreground truncate'>{entry.displayName || entry.handle}</p>
                <p className='text-sm text-foreground-muted truncate'>@{entry.handle || entry.did}</p>
                {entry.description ? (
                  <p className='mt-2 text-sm text-foreground line-clamp-2'>{entry.description}</p>
                ) : null}
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='secondary'
                size='pill'
                onClick={() => handleOpenProfile(entry.did || entry.handle)}
              >
                Profil ansehen
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {cursor ? (
        <div className='flex justify-center pt-2'>
          <Button variant='secondary' onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Lädt…' : 'Mehr laden'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
