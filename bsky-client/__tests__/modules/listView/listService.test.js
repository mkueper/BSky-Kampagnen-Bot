import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchServerTopId,
  runListLoadMore,
  runListRefresh
} from '../../../src/modules/listView/listService.js'
import { fetchNotifications, fetchTimeline } from '../../../src/modules/shared/index.js'

vi.mock('../../../src/modules/shared/index.js', () => ({
  fetchTimeline: vi.fn(),
  fetchNotifications: vi.fn()
}))

beforeEach(() => {
  fetchTimeline.mockReset()
  fetchNotifications.mockReset()
})

describe('listService', () => {
  it('führt runListRefresh bei einer Timeline-Liste korrekt aus', async () => {
    fetchTimeline.mockResolvedValue({
      items: [{ id: 'post-1' }],
      cursor: 'cursor-a'
    })

    const dispatch = vi.fn()
    const list = { key: 'timeline-feed', loaded: true }

    const response = await runListRefresh({ list, dispatch })

    expect(fetchTimeline).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 20,
      tab: 'timeline-feed'
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'LIST_SET_REFRESHING',
      payload: { key: 'timeline-feed', value: true, meta: undefined }
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'LIST_LOADED',
      payload: expect.objectContaining({
        key: 'timeline-feed',
        items: [{ id: 'post-1' }],
        cursor: 'cursor-a',
        topId: 'post-1',
        meta: { data: undefined },
        unreadIds: []
      })
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'LIST_SET_REFRESHING',
      payload: { key: 'timeline-feed', value: false }
    })
    expect(response.items).toEqual([{ id: 'post-1' }])
  })

  it('fügt runListLoadMore neue Items an und stoppt bei keinem Fortschritt', async () => {
    fetchTimeline.mockResolvedValue({
      items: [{ id: 'next' }],
      cursor: 'cursor-next'
    })

    const dispatch = vi.fn()
    const list = {
      key: 'timeline-feed',
      items: [{ id: 'existing' }],
      cursor: 'cursor-prev'
    }

    const response = await runListLoadMore({ list, dispatch })

    expect(fetchTimeline).toHaveBeenCalledWith({
      cursor: 'cursor-prev',
      limit: 20,
      tab: 'timeline-feed'
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'LIST_SET_LOADING_MORE',
      payload: { key: 'timeline-feed', value: true }
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'LIST_LOADED',
      payload: expect.objectContaining({
        key: 'timeline-feed',
        items: [{ id: 'existing' }, { id: 'next' }],
        cursor: 'cursor-next',
        topId: 'existing'
      })
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'LIST_SET_LOADING_MORE',
      payload: { key: 'timeline-feed', value: false }
    })
    expect(response.cursor).toBe('cursor-next')
  })

  it('fetchServerTopId nutzt Notifications wenn der Descriptor das verlangt', async () => {
    fetchNotifications.mockResolvedValue({
      items: [{ listEntryId: 'entry-1' }]
    })

    const topId = await fetchServerTopId({ key: 'notifications', kind: 'notifications' }, 2)

    expect(fetchNotifications).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 2,
      filter: undefined,
      markSeen: false
    })
    expect(topId).toBe('entry-1')
  })
})
