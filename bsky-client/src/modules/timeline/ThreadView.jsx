import { useEffect, useMemo } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Button } from '../shared'
import SkeetItem from './SkeetItem'
import { useAppState } from '../../context/AppContext'
import { useThread } from '../../hooks/useThread'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'

function collectThreadLayout (threadData) {
  const focus = threadData?.focus || null
  const parents = Array.isArray(threadData?.parents) ? threadData.parents : []
  const authorDid = focus?.author?.did || null
  const posts = []
  const branches = []
  const seen = new Set()

  const pushPost = (node) => {
    if (!node) return
    const key = node.listEntryId || node.uri || node.cid
    if (key && seen.has(key)) return
    if (key) seen.add(key)
    posts.push(node)
  }

  parents.forEach((parent) => {
    if (!parent) return
    if (!authorDid || parent?.author?.did === authorDid) {
      pushPost(parent)
    } else {
      branches.push({
        type: 'parent',
        parentUri: parent.uri || null,
        parentAuthor: parent.author || null,
        nodes: [parent]
      })
    }
  })

  if (focus) pushPost(focus)

  const walkReplies = (node) => {
    if (!node || !Array.isArray(node.replies)) return
    const sameAuthor = []
    const otherAuthors = []
    for (const reply of node.replies) {
      if (!reply) continue
      if (!authorDid || reply?.author?.did === authorDid) sameAuthor.push(reply)
      else otherAuthors.push(reply)
    }
    if (otherAuthors.length > 0) {
      branches.push({
        type: 'reply',
        parentUri: node.uri || null,
        parentAuthor: node.author || null,
        nodes: otherAuthors
      })
    }
    if (sameAuthor.length > 0) {
      const [primary, ...rest] = sameAuthor
      if (primary) {
        pushPost(primary)
        walkReplies(primary)
      }
      if (rest.length > 0) {
        branches.push({
          type: 'author-branch',
          parentUri: node.uri || null,
          parentAuthor: node.author || null,
          nodes: rest
        })
      }
    }
  }

  if (focus) walkReplies(focus)

  return {
    author: focus?.author || posts[posts.length - 1]?.author || parents[parents.length - 1]?.author || null,
    posts,
    branches
  }
}

export default function ThreadView () {
  const { threadState } = useAppState()
  const { closeThread, reloadThread } = useThread()
  const { openMediaPreview } = useMediaLightbox()

  const { author, posts, branches } = useMemo(() => collectThreadLayout(threadState?.data), [threadState?.data])
  const branchCount = useMemo(() => {
    return branches.reduce((total, group) => total + (Array.isArray(group?.nodes) ? group.nodes.length : 0), 0)
  }, [branches])
  const hasPosts = posts.length > 0

  useEffect(() => {
    if (!threadState?.active) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeThread({ force: true })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeThread, threadState?.active])

  if (!threadState?.active) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6' data-component='BskyThreadReaderModal'>
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        aria-hidden='true'
        onClick={() => closeThread({ force: true })}
      />
      <div
        className='relative z-50 flex h-[min(760px,92vh)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-background text-foreground shadow-2xl select-none'
        role='dialog'
        aria-modal='true'
        aria-label='Thread-Lesefenster'
      >
        <header className='flex items-start gap-4 border-b border-border px-4 py-4 sm:px-6'>
          <div className='flex items-center gap-4'>
            {author?.avatar ? (
              <img src={author.avatar} alt='' className='h-14 w-14 rounded-full border border-border object-cover' />
            ) : (
              <div className='h-14 w-14 rounded-full border border-border bg-background-subtle' />
            )}
            <div className='min-w-0'>
              <p className='text-base font-semibold leading-tight'>
                {author?.displayName || author?.handle || 'Unbekannter Autor'}
              </p>
              {author?.handle ? (
                <p className='text-sm text-foreground-muted'>@{author.handle}</p>
              ) : null}
              <p className='mt-2 text-xs text-foreground-muted'>
                {threadState?.loading && !hasPosts ? 'Thread wird geladen…' : `${posts.length} Beiträge`}
              </p>
            </div>
          </div>
          <div className='ml-auto flex items-center gap-2'>
            {threadState?.error ? (
              <Button variant='secondary' size='pill' onClick={reloadThread}>
                Erneut laden
              </Button>
            ) : null}
            <Button
              variant='ghost'
              size='icon'
              aria-label='Thread schließen'
              onClick={() => closeThread({ force: true })}
            >
              <Cross2Icon className='h-5 w-5' />
            </Button>
          </div>
        </header>
        <div className='flex min-h-0 flex-1 divide-x divide-border'>
          <div className='flex-1 overflow-y-auto px-4 py-4 sm:px-6'>
            {threadState?.loading && !hasPosts ? (
              <div className='rounded-2xl border border-border bg-background-subtle px-4 py-6 text-sm text-foreground-muted'>
                Thread wird geladen…
              </div>
            ) : null}
            {threadState?.error ? (
              <div className='rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700'>
                <p className='font-semibold'>Fehler beim Laden des Threads</p>
                <p className='mt-2 text-sm'>{threadState.error}</p>
                <Button className='mt-4' variant='primary' onClick={reloadThread}>
                  Erneut versuchen
                </Button>
              </div>
            ) : null}
            {hasPosts ? (
              <ol className='space-y-4'>
                {posts.map((item, idx) => (
                  <li key={item.listEntryId || item.uri || item.cid || `thread-post-${idx}`}>
                    <SkeetItem
                      item={item}
                      variant='card'
                      onViewMedia={openMediaPreview}
                      showActions={false}
                    />
                  </li>
                ))}
              </ol>
            ) : null}
            {!threadState?.loading && !threadState?.error && !hasPosts ? (
              <p className='text-sm text-foreground-muted'>Keine passenden Posts im Thread gefunden.</p>
            ) : null}
          </div>
          <aside className='hidden w-64 flex-col justify-between bg-background-subtle/50 px-4 py-4 md:flex' aria-hidden='true'>
            <div>
              <p className='text-sm font-semibold text-foreground'>Verzweigungen</p>
              <p className='mt-2 text-xs text-foreground-muted'>
                {branchCount > 0
                  ? `${branchCount} potentielle ${branchCount === 1 ? 'Antwort' : 'Antworten'} werden künftig hier visualisiert.`
                  : 'Keine Verzweigungen erkannt.'}
              </p>
            </div>
            <p className='text-[11px] text-foreground-subtle'>Spalte reserviert für spätere Thread-Zweige.</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
