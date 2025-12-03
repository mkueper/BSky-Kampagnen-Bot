import { describe, it, expect } from 'vitest'

/**
 * Testgruppe: notificationsReducer.test.js
 *
 * Diese Tests überprüfen:
 * - REFRESH_NOTIFICATIONS (Tick-Inkrement)
 * - SET_NOTIFICATIONS_UNREAD (Setzen der Unread-Zahl)
 *
 * Kontext:
 * Teil der globalen App-State-Maschine. Stellt sicher, dass
 * Benachrichtigungs-Refresh und -Zähler konsistent verwaltet werden.
 */

import {
  notificationsInitialState,
  notificationsReducer
} from '../../src/context/reducers/notifications.js'

describe('notificationsReducer', () => {
  it('REFRESH_NOTIFICATIONS erhöht notificationsRefreshTick', () => {
    const base = { ...notificationsInitialState }

    const next = notificationsReducer(base, { type: 'REFRESH_NOTIFICATIONS' })
    expect(next.notificationsRefreshTick).toBe(base.notificationsRefreshTick + 1)

    const again = notificationsReducer(next, { type: 'REFRESH_NOTIFICATIONS' })
    expect(again.notificationsRefreshTick).toBe(next.notificationsRefreshTick + 1)
  })

  it('SET_NOTIFICATIONS_UNREAD setzt notificationsUnread', () => {
    const base = { ...notificationsInitialState }

    const next = notificationsReducer(base, {
      type: 'SET_NOTIFICATIONS_UNREAD',
      payload: 5
    })

    expect(next.notificationsUnread).toBe(5)

    const reset = notificationsReducer(next, {
      type: 'SET_NOTIFICATIONS_UNREAD',
      payload: 0
    })
    expect(reset.notificationsUnread).toBe(0)
  })
})

