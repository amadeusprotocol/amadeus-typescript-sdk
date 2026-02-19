import { describe, it, expect } from 'vitest'
import {
	decodeContractStateToBase64,
	parseStateNumber,
	parseStateString
} from '../contract-state'
import { encode } from '../serialization'

describe('Contract State Utilities', () => {
	describe('parseStateNumber', () => {
		it('returns 0 for null/undefined', () => {
			expect(parseStateNumber(null)).toBe(0)
			expect(parseStateNumber(undefined)).toBe(0)
		})

		it('parses string integers', () => {
			expect(parseStateNumber('42')).toBe(42)
			expect(parseStateNumber('0')).toBe(0)
			expect(parseStateNumber('1000000')).toBe(1000000)
		})

		it('returns 0 for negative strings', () => {
			expect(parseStateNumber('-1')).toBe(0)
		})

		it('returns 0 for non-numeric strings', () => {
			expect(parseStateNumber('abc')).toBe(0)
			expect(parseStateNumber('')).toBe(0)
		})

		it('passes through non-negative integers directly', () => {
			expect(parseStateNumber(42)).toBe(42)
			expect(parseStateNumber(0)).toBe(0)
		})

		it('returns 0 for negative numbers', () => {
			expect(parseStateNumber(-1)).toBe(0)
		})

		it('returns 0 for non-integer numbers', () => {
			expect(parseStateNumber(3.14)).toBe(0)
		})

		it('parses Uint8Array as UTF-8 digit string', () => {
			const encoded = new TextEncoder().encode('42')
			expect(parseStateNumber(encoded)).toBe(42)
		})

		it('parses Uint8Array as little-endian binary', () => {
			// 42 as little-endian u32
			expect(parseStateNumber(new Uint8Array([0x2a, 0x00, 0x00, 0x00]))).toBe(42)
		})

		it('returns 0 for empty Uint8Array', () => {
			expect(parseStateNumber(new Uint8Array([]))).toBe(0)
		})
	})

	describe('parseStateString', () => {
		it('returns null for null/undefined', () => {
			expect(parseStateString(null)).toBe(null)
			expect(parseStateString(undefined)).toBe(null)
		})

		it('returns strings directly', () => {
			expect(parseStateString('hello')).toBe('hello')
			expect(parseStateString('')).toBe('')
		})

		it('converts numbers to strings', () => {
			expect(parseStateString(42)).toBe('42')
			expect(parseStateString(0)).toBe('0')
		})

		it('decodes Uint8Array as UTF-8', () => {
			const encoded = new TextEncoder().encode('hello world')
			expect(parseStateString(encoded)).toBe('hello world')
		})
	})

	describe('decodeContractStateToBase64', () => {
		it('decodes a valid VecPack map to base64 pairs', () => {
			// Build a map with one entry: key="foo", value="bar"
			const key = new TextEncoder().encode('foo')
			const value = new TextEncoder().encode('bar')
			const map = new Map<string | Uint8Array, unknown>()
			map.set(key, value)
			const encoded = encode(map)

			const result = decodeContractStateToBase64(encoded)
			expect(result.length).toBe(1)
			// Verify base64 strings
			expect(typeof result[0]![0]).toBe('string')
			expect(typeof result[0]![1]).toBe('string')
		})

		it('filters out empty keys/values', () => {
			// Build a map with empty key → should be filtered
			const key = new Uint8Array([])
			const value = new TextEncoder().encode('bar')
			const map = new Map<string | Uint8Array, unknown>()
			map.set(key, value)
			const encoded = encode(map)

			const result = decodeContractStateToBase64(encoded)
			expect(result.length).toBe(0)
		})

		it('accepts ArrayBuffer input', () => {
			const key = new TextEncoder().encode('test')
			const value = new TextEncoder().encode('data')
			const map = new Map<string | Uint8Array, unknown>()
			map.set(key, value)
			const encoded = encode(map)

			const arrayBuffer = encoded.buffer.slice(
				encoded.byteOffset,
				encoded.byteOffset + encoded.byteLength
			)
			const result = decodeContractStateToBase64(arrayBuffer)
			expect(result.length).toBe(1)
		})

		it('throws for invalid input', () => {
			expect(() => decodeContractStateToBase64(new Uint8Array([0xff]))).toThrow()
		})
	})
})
