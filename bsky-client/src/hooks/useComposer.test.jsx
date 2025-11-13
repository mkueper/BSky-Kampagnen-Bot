import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AppProvider, useAppState } from '../context/AppContext.jsx'
import { useComposer } from './useComposer.js'

const wrapper = ({ children }) => (
  <AppProvider>{children}</AppProvider>
)

function renderComposer () {
  return renderHook(() => {
    const composer = useComposer()
    const state = useAppState()
    return { composer, state }
  }, { wrapper })
}

describe('useComposer', () => {
  it('opens the reply composer and clears quote context', () => {
    const { result } = renderComposer()
    const replyTarget = { uri: 'at://example/post/1', cid: 'cid1' }

    act(() => {
      result.current.composer.openReplyComposer(replyTarget)
    })

    expect(result.current.state.composeOpen).toBe(true)
    expect(result.current.state.replyTarget).toBe(replyTarget)
    expect(result.current.state.quoteTarget).toBeNull()
  })

  it('normalizes quote sources before opening the composer', () => {
    const { result } = renderComposer()
    const quoteSource = {
      raw: {
        post: {
          uri: 'at://example/post/42',
          cid: 'cid42',
          record: {
            text: 'Record text',
            author: { handle: 'author.handle' }
          }
        }
      },
      author: {
        handle: 'author.handle',
        displayName: 'Author Name',
        avatar: 'https://avatar'
      }
    }

    act(() => {
      result.current.composer.openQuoteComposer(quoteSource)
    })

    expect(result.current.state.composeOpen).toBe(true)
    expect(result.current.state.replyTarget).toBeNull()
    expect(result.current.state.quoteTarget).toEqual({
      uri: 'at://example/post/42',
      cid: 'cid42',
      text: 'Record text',
      author: {
        handle: 'author.handle',
        displayName: 'Author Name',
        avatar: 'https://avatar'
      }
    })
  })

  it('ignores quote requests without a uri/cid', () => {
    const { result } = renderComposer()

    act(() => {
      result.current.composer.openQuoteComposer({ text: 'invalid' })
    })

    expect(result.current.state.composeOpen).toBe(false)
    expect(result.current.state.quoteTarget).toBeNull()
  })

  it('closes the composer and resets targets', () => {
    const { result } = renderComposer()

    act(() => {
      result.current.composer.openReplyComposer({ uri: 'at://example/post/99', cid: 'c99' })
    })

    act(() => {
      result.current.composer.closeComposer()
    })

    expect(result.current.state.composeOpen).toBe(false)
    expect(result.current.state.replyTarget).toBeNull()
    expect(result.current.state.quoteTarget).toBeNull()
  })
})
