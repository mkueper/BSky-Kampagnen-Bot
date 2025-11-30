/**
 * Global Test-Setup für bsky-client.
 *
 * Stellt sicher, dass Testing-Library nach jedem Test aufräumt
 * und jest-dom Matcher global verfügbar sind.
 */
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

