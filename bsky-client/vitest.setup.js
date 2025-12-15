import '@testing-library/jest-dom/vitest'
import { Buffer } from 'node:buffer'

// Polyfill helpers used by @atproto/lex-data in the test environment
// Avoid noisy console warnings during tests by providing minimal implementations
if (typeof Uint8Array.fromBase64 !== 'function') {
	Uint8Array.fromBase64 = function (b64) {
		// Node: Buffer available; Browser: atob available
		if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
			return Uint8Array.from(Buffer.from(String(b64 || ''), 'base64'))
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
		if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
			return Buffer.from(this).toString('base64')
		}
		if (typeof globalThis.btoa === 'function') {
			let s = ''
			for (let i = 0; i < this.length; i++) s += String.fromCharCode(this[i])
			return globalThis.btoa(s)
		}
		return ''
	}
}
