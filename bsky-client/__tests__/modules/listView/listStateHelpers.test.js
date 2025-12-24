import { describe, it, expect } from 'vitest'
import {
  getListItemId,
  mergeItemsAppend,
  mergeItemsPrepend,
  resolveDescriptor,
  resolveUnreadIds
} from '../../../src/modules/listView/listStateHelpers.js'

describe('listStateHelpers', () => {
  describe('resolveDescriptor', () => {
    it('sollte fehlende Metadaten mit sinnvollen Defaults auffüllen', () => {
      const descriptor = resolveDescriptor({ key: 'custom-timeline', data: { tab: 'home' }, supportsPolling: true })
      expect(descriptor).toMatchObject({
        key: 'custom-timeline',
        kind: 'custom',
        label: 'custom-timeline',
        data: { tab: 'home' },
        supportsRefresh: true,
        supportsPolling: true
      })
    })

    it('nimmt die label-Property, wenn sie gesetzt ist', () => {
      expect(resolveDescriptor({ key: 'foo', label: 'Custom Label' }).label).toBe('Custom Label')
    })
  })

  describe('resolveUnreadIds', () => {
    it('gibt ein leeres Array zurück, wenn keine nächsten Items vorhanden sind', () => {
      expect(resolveUnreadIds({ nextItems: [] })).toEqual([])
    })

    it('behält vorhandene unreadIds und fügt neue Einträge vor previousTopId hinzu', () => {
      const items = [
        { id: 'new-1' },
        { id: 'new-2' },
        { id: 'top' },
        { id: 'old-unread' }
      ]
      const result = resolveUnreadIds({
        previousUnreadIds: ['old-unread'],
        nextItems: items,
        previousTopId: 'top'
      })
      expect(result).toEqual(['old-unread', 'new-1', 'new-2'])
    })

    it('leert die unreadIds, wenn clearUnreadOnRefresh gesetzt ist', () => {
      const items = [{ id: 'foo' }]
      expect(
        resolveUnreadIds({
          previousUnreadIds: ['foo'],
          nextItems: items,
          clearUnreadOnRefresh: true
        })
      ).toEqual([])
    })
  })

  describe('mergeItemsPrepend', () => {
    it('fügt neue Items vorne ein und hält Duplikate fern', () => {
      const result = mergeItemsPrepend(
        [{ id: 'a' }, { id: 'b' }],
        [{ id: 'b' }, { id: 'c' }]
      )
      expect(result).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    })
  })

  describe('mergeItemsAppend', () => {
    it('hängt neue Items an, ohne vorhandene IDs doppelt zu übernehmen', () => {
      const result = mergeItemsAppend(
        [{ id: 'existing' }, { id: 'shared' }],
        [{ id: 'shared' }, { id: 'new' }]
      )
      expect(result).toEqual([{ id: 'existing' }, { id: 'shared' }, { id: 'new' }])
    })
  })

  describe('getListItemId', () => {
    it('verwendet listEntryId vorrangig', () => {
      expect(getListItemId({ listEntryId: 'entry' })).toBe('entry')
    })

    it('greift auf uri zurück, wenn keine listEntryId vorhanden ist', () => {
      expect(getListItemId({ uri: 'uri', cid: 'cid' })).toBe('uri')
    })
  })
})
