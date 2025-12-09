import { describe, it, expect } from 'vitest'
import {
	toBase58,
	fromBase58,
	uint8ArrayToBase64,
	base64ToUint8Array,
	arrayBufferToBase64,
	base64ToArrayBuffer,
	uint8ArrayToArrayBuffer,
	arrayBufferToUint8Array
} from '../encoding'

describe('Encoding Utilities', () => {
	describe('Base58 Encoding/Decoding', () => {
		it('encodes and decodes Uint8Array', () => {
			const original = new Uint8Array([1, 2, 3, 255])
			const encoded = toBase58(original)
			const decoded = fromBase58(encoded)

			expect(encoded).toBeTypeOf('string')
			expect(decoded).toEqual(original)
		})

		it('handles empty arrays', () => {
			const original = new Uint8Array([])
			const encoded = toBase58(original)
			const decoded = fromBase58(encoded)

			expect(decoded).toEqual(original)
		})

		it('throws on invalid Base58 string', () => {
			expect(() => fromBase58('invalid-base58-0OIl')).toThrow()
		})
	})

	describe('Base64 Encoding/Decoding', () => {
		it('encodes and decodes Uint8Array', () => {
			const original = new Uint8Array([1, 2, 3, 255])
			const base64 = uint8ArrayToBase64(original)
			const decoded = base64ToUint8Array(base64)

			expect(base64).toBeTypeOf('string')
			expect(decoded).toEqual(original)
		})

		it('encodes and decodes ArrayBuffer', () => {
			const original = new ArrayBuffer(8)
			const view = new Uint8Array(original)
			view.set([1, 2, 3, 4, 5, 6, 7, 8])

			const base64 = arrayBufferToBase64(original)
			const decoded = base64ToArrayBuffer(base64)
			const decodedView = new Uint8Array(decoded)

			expect(base64).toBeTypeOf('string')
			expect(decodedView).toEqual(view)
		})
	})

	describe('ArrayBuffer/Uint8Array Conversions', () => {
		it('converts Uint8Array to ArrayBuffer', () => {
			const bytes = new Uint8Array([1, 2, 3, 4])
			const buffer = uint8ArrayToArrayBuffer(bytes)
			const view = new Uint8Array(buffer)

			expect(buffer).toBeInstanceOf(ArrayBuffer)
			expect(view).toEqual(bytes)
		})

		it('converts ArrayBuffer to Uint8Array', () => {
			const buffer = new ArrayBuffer(8)
			const view = new Uint8Array(buffer)
			view.set([1, 2, 3, 4, 5, 6, 7, 8])

			const bytes = arrayBufferToUint8Array(buffer)

			expect(bytes).toBeInstanceOf(Uint8Array)
			expect(bytes).toEqual(view)
		})
	})
})
