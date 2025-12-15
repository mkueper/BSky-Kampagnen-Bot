import '@testing-library/jest-dom/vitest'
import { Buffer as NodeBuffer } from 'node:buffer'

const BufferRef = typeof globalThis.Buffer !== 'undefined' ? globalThis.Buffer : NodeBuffer

// Polyfill helpers used by @atproto/lex-data in the test environment
// Avoid noisy console warnings during tests by providing minimal implementations
if (typeof Uint8Array.fromBase64 !== 'function') {
	Uint8Array.fromBase64 = function (b64) {
		// Node: Buffer available; Browser: atob available
		if (BufferRef && typeof BufferRef.from === 'function') {
			return Uint8Array.from(BufferRef.from(String(b64 || ''), 'base64'))
		}
		if (typeof globalThis.atob === 'function') {
			const bin = globalThis.atob(String(b64 || ''))
			const arr = new Uint8Array(bin.length)
			for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
			return arr
		}
		// Fallback: empty
		return new Uint8Array()
	}
}

if (typeof Uint8Array.prototype.toBase64 !== 'function') {
	Uint8Array.prototype.toBase64 = function () {
		if (BufferRef && typeof BufferRef.from === 'function') {
			return BufferRef.from(this).toString('base64')
		}
		if (typeof globalThis.btoa === 'function') {
			let s = ''
			for (let i = 0; i < this.length; i++) s += String.fromCharCode(this[i])
			return globalThis.btoa(s)
		}
		return ''
	}
}
