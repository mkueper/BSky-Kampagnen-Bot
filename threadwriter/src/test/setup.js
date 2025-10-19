import '@testing-library/jest-dom/vitest'

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:fallback')
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn()
}
