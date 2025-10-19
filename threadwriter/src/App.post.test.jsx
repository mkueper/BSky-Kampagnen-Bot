import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'

const { compressImageMock } = vi.hoisted(() => ({
  compressImageMock: vi.fn(async (file) => ({ blob: file, type: file.type || 'image/jpeg' })),
}))
vi.mock('./components/GifPicker.jsx', () => ({ __esModule: true, default: () => null }))
vi.mock('./components/EmojiPicker.jsx', () => ({ __esModule: true, default: () => null }))
vi.mock('./components/Modal.jsx', () => ({ __esModule: true, default: ({ children }) => <>{children}</> }))

vi.mock('./lib/image.js', () => ({ __esModule: true, compressImage: compressImageMock }))

function createDefaultClient() {
  const login = vi.fn(() => Promise.resolve())
  const post = vi.fn(async ({ text }) => ({
    uri: `at://mock/${text.slice(0, 8)}${post.mock.calls.length}`,
    cid: `cid-${post.mock.calls.length}`,
  }))
  const uploadBlob = vi.fn(async (blob) => ({
    data: { blob: { cid: `blob-${blob?.size || 0}` } },
  }))
  return { login, agent: { post, uploadBlob } }
}

vi.mock('./lib/bskyClient.js', () => {
  let factory = createDefaultClient
  let lastClient = null
  const BlueskyClient = vi.fn((...args) => {
    const client = factory(...args)
    lastClient = client
    return client
  })

  const __setMockClientFactory = (fn) => {
    factory = fn
  }
  const __resetMockClientFactory = () => {
    factory = createDefaultClient
    lastClient = null
  }
  const __getLastClient = () => lastClient

  return {
    __esModule: true,
    BlueskyClient,
    __setMockClientFactory,
    __resetMockClientFactory,
    __getLastClient,
  }
})

import App from './App.jsx'
import { __setMockClientFactory, __resetMockClientFactory, __getLastClient } from './lib/bskyClient.js'

function setSourceValue(value) {
  const textarea = screen.getByPlaceholderText(/Beispiel/i)
  fireEvent.change(textarea, { target: { value } })
  return textarea
}

beforeEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('tw_identifier', 'user@example.com')
  localStorage.setItem('tw_password', 'app-password')
  global.fetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) }))
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => ''
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = () => {}
  }
  __resetMockClientFactory()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('handlePost flow', () => {
  it('posts all segments successfully and resets editor state', async () => {
    const { getByRole } = render(<App />)

    const textarea = setSourceValue('Erster Skeet\n---\nZweiter Skeet')

    const postButton = getByRole('button', { name: /Posten/i })
    await act(async () => {
      fireEvent.click(postButton)
    })

    await waitFor(() => {
      const client = __getLastClient()
      expect(client).not.toBeNull()
      expect(client.agent.post).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(textarea.value).toBe('')
    })
    const emptyIndicator = await screen.findByText(
      (_, node) => node?.textContent?.includes('(keine Segmente)'),
    )
    expect(emptyIndicator).toBeInTheDocument()
    const client = __getLastClient()
    const postedTexts = client.agent.post.mock.calls.map(([payload]) => payload.text)
    expect(postedTexts[0]).toMatch(/\n\n1\/2$/)
    expect(postedTexts[1]).toMatch(/\n\n2\/2$/)
  })

  it('marks remaining segments as aborted when a post fails', async () => {
    __setMockClientFactory(() => {
      const client = createDefaultClient()
      client.agent.post = vi
        .fn()
        .mockResolvedValueOnce({ uri: 'at://ok', cid: 'cid-ok' })
        .mockRejectedValueOnce(new Error('kaputt'))
      return client
    })

    render(<App />)
    setSourceValue('A\n---\nB')

    const postButton = screen.getByRole('button', { name: /Posten/i })
    await act(async () => {
      fireEvent.click(postButton)
    })

    const items = await screen.findAllByRole('listitem')
    const normalized = items.map((item) => item.textContent.replace(/\s+/g, ' ').trim()).join(' ')
    expect(normalized).toMatch(/Fehler:\s*kaputt/)
    expect(normalized).toMatch(/abgebrochen/)

    const textarea = screen.getByPlaceholderText(/Beispiel/i)
    expect(textarea.value).toBe('A\n---\nB')

    const client = __getLastClient()
    expect(client.agent.post).toHaveBeenCalledTimes(2)
  })

  it('uploads pending media and revokes object URLs after success', async () => {
    const urlCreateSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    const urlRevokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    __setMockClientFactory(() => {
      const client = createDefaultClient()
      client.agent.uploadBlob = vi.fn(async () => ({
        data: { blob: { cid: 'blob-123', mimeType: 'image/png' } },
      }))
      client.agent.post = vi.fn(async () => ({ uri: 'at://ok', cid: 'cid-ok' }))
      return client
    })

    const { container, getByRole } = render(<App />)
    setSourceValue('Nur mit Bild')

    const addButton = container.querySelector('button[title="Bild hinzufügen"]')
    await act(async () => {
      fireEvent.click(addButton)
    })

    const fileInput = container.querySelector('input[type="file"]')
    const file = new File(['dummy'], 'bild.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [file] },
      })
    })

    await waitFor(() => {
      expect(urlCreateSpy).toHaveBeenCalled()
    })

    const postButton = getByRole('button', { name: /Posten/i })
    await act(async () => {
      fireEvent.click(postButton)
    })

    await waitFor(() => {
      const client = __getLastClient()
      expect(client.agent.uploadBlob).toHaveBeenCalledTimes(1)
      expect(client.agent.post).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(urlRevokeSpy).toHaveBeenCalledWith('blob:mock')
    })

    urlCreateSpy.mockRestore()
    urlRevokeSpy.mockRestore()
  })
})
