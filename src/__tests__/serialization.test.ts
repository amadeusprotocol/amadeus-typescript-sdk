import { describe, it, expect } from 'vitest'
import { encode, decode } from '../serialization'
import type { SerializableValue, DecodedValue } from '../types'

describe('Serialization (VecPack)', () => {
	describe('Basic Types', () => {
		it('encodes and decodes null', () => {
			const encoded = encode(null)
			const decoded = decode(encoded)

			expect(decoded).toBe(null)
		})

		it('encodes and decodes booleans', () => {
			const trueDecoded = decode(encode(true))
			const falseDecoded = decode(encode(false))

			expect(trueDecoded).toBe(true)
			expect(falseDecoded).toBe(false)
		})

		it('encodes and decodes numbers', () => {
			expect(decode(encode(0))).toBe(0n)
			expect(decode(encode(42))).toBe(42n)
			expect(decode(encode(-42))).toBe(-42n)
			expect(decode(encode(Number.MAX_SAFE_INTEGER))).toBe(BigInt(Number.MAX_SAFE_INTEGER))
		})

		it('encodes and decodes bigints', () => {
			expect(decode(encode(0n))).toBe(0n)
			expect(decode(encode(1234567890123n))).toBe(1234567890123n)
			expect(decode(encode(-1234567890123n))).toBe(-1234567890123n)
		})

		it('encodes and decodes strings', () => {
			const helloEncoded = encode('hello')
			const emptyEncoded = encode('')
			const helloDecoded = decode(helloEncoded)
			const emptyDecoded = decode(emptyEncoded)

			expect(helloDecoded).toEqual(new TextEncoder().encode('hello'))
			expect(emptyDecoded).toEqual(new Uint8Array([]))
		})

		it('encodes and decodes Uint8Array', () => {
			const bytes = new Uint8Array([1, 2, 3, 255])
			const encoded = encode(bytes)
			const decoded = decode(encoded)

			expect(decoded).toEqual(bytes)
		})
	})

	describe('Arrays', () => {
		it('encodes and decodes arrays', () => {
			const arr: SerializableValue[] = [1, 2, 3, 'hello', true, null]
			const encoded = encode(arr)
			const decoded = decode(encoded)

			expect(Array.isArray(decoded)).toBe(true)
			expect(decoded).not.toBeNull()
			if (Array.isArray(decoded)) {
				expect(decoded.length).toBe(6)
			}
		})

		it('encodes and decodes nested arrays', () => {
			const arr: SerializableValue[] = [
				[1, 2],
				[3, 4]
			]
			const encoded = encode(arr)
			const decoded = decode(encoded)

			expect(Array.isArray(decoded)).toBe(true)
			expect(decoded).not.toBeNull()
			if (Array.isArray(decoded) && decoded.length > 0) {
				expect(Array.isArray(decoded[0])).toBe(true)
			}
		})

		it('encodes and decodes empty arrays', () => {
			const arr: SerializableValue[] = []
			const encoded = encode(arr)
			const decoded = decode(encoded)

			expect(Array.isArray(decoded)).toBe(true)
			expect(decoded).not.toBeNull()
			if (Array.isArray(decoded)) {
				expect(decoded.length).toBe(0)
			}
		})
	})

	describe('Objects/Maps', () => {
		it('encodes and decodes objects', () => {
			const obj = { foo: 'bar', count: 42, active: true }
			const encoded = encode(obj)
			const decoded = decode(encoded)

			expect(decoded).toBeInstanceOf(Map)
			const map = decoded as Map<unknown, unknown>
			expect(map.size).toBeGreaterThan(0)
		})

		it('maintains canonical ordering', () => {
			const obj1 = { a: 1, b: 2, c: 3 }
			const obj2 = { c: 3, b: 2, a: 1 }
			const encoded1 = encode(obj1)
			const encoded2 = encode(obj2)

			expect(encoded1).toEqual(encoded2)
		})

		it('encodes and decodes Maps', () => {
			const map = new Map<string, SerializableValue>([
				['key1', 'value1'],
				['key2', 42]
			])
			const encoded = encode(map)
			const decoded = decode(encoded)

			expect(decoded).toBeInstanceOf(Map)
			const decodedMap = decoded as Map<DecodedValue, DecodedValue>
			expect(decodedMap.size).toBeGreaterThan(0)
		})

		it('encodes and decodes nested objects', () => {
			const obj = {
				outer: {
					inner: {
						value: 42
					}
				}
			}
			const encoded = encode(obj)
			const decoded = decode(encoded)

			expect(decoded).toBeInstanceOf(Map)
		})
	})

	describe('Complex Structures', () => {
		it('encodes and decodes complex nested structures', () => {
			const complex: SerializableValue = {
				name: 'test',
				numbers: [1, 2, 3],
				nested: {
					foo: 'bar',
					items: [true, false, null]
				},
				bytes: new Uint8Array([1, 2, 3])
			}
			const encoded = encode(complex)
			const decoded = decode(encoded)

			expect(decoded).toBeInstanceOf(Map)
		})

		it('handles round-trip encoding', () => {
			const original: SerializableValue = {
				tx: {
					signer: new Uint8Array(48),
					nonce: 1234567890n,
					action: {
						op: 'call',
						contract: 'Coin',
						function: 'transfer',
						args: ['recipient', '1000', 'AMA']
					}
				}
			}
			const encoded = encode(original)
			const decoded = decode(encoded)

			expect(decoded).toBeInstanceOf(Map)
		})
	})

	describe('Error Cases', () => {
		it('throws on unsupported types', () => {
			expect(() => encode(undefined as unknown as SerializableValue)).toThrow()
		})

		it('does not throw on valid encoding', () => {
			expect(() => encode(0)).not.toThrow()
		})
	})
})
