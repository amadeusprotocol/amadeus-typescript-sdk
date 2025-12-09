import { describe, it, expect } from 'vitest'
import { toAtomicAma, fromAtomicAma } from '../conversion'
import { AMA_TOKEN_DECIMALS_MULTIPLIER } from '../constants'

describe('Conversion Utilities', () => {
	describe('toAtomicAma', () => {
		it('converts AMA to atomic units', () => {
			expect(toAtomicAma(1)).toBe(AMA_TOKEN_DECIMALS_MULTIPLIER)
			expect(toAtomicAma(0)).toBe(0)
			expect(toAtomicAma(1.5)).toBe(AMA_TOKEN_DECIMALS_MULTIPLIER * 1.5)
			expect(toAtomicAma(100)).toBe(AMA_TOKEN_DECIMALS_MULTIPLIER * 100)
		})

		it('handles decimal amounts', () => {
			expect(toAtomicAma(0.000000001)).toBe(1)
			expect(toAtomicAma(0.1)).toBe(AMA_TOKEN_DECIMALS_MULTIPLIER * 0.1)
		})
	})

	describe('fromAtomicAma', () => {
		it('converts atomic units to AMA', () => {
			expect(fromAtomicAma(AMA_TOKEN_DECIMALS_MULTIPLIER)).toBe(1)
			expect(fromAtomicAma(0)).toBe(0)
			expect(fromAtomicAma(AMA_TOKEN_DECIMALS_MULTIPLIER * 1.5)).toBe(1.5)
		})

		it('handles string inputs', () => {
			expect(fromAtomicAma(AMA_TOKEN_DECIMALS_MULTIPLIER.toString())).toBe(1)
			expect(fromAtomicAma('0')).toBe(0)
		})

		it('throws on negative values', () => {
			expect(() => fromAtomicAma(-1)).toThrow('Negative value not allowed')
		})

		it('throws on values less than 1', () => {
			expect(() => fromAtomicAma(0.5)).toThrow('Value is less than 1')
		})

		it('throws on values exceeding MAX_SAFE_INTEGER', () => {
			const tooLarge = Number.MAX_SAFE_INTEGER + 1
			expect(() => fromAtomicAma(tooLarge)).toThrow('Value exceeds maximum safe integer')
		})
	})

	describe('Round-trip Conversion', () => {
		it('maintains precision in round-trip conversion', () => {
			const original = 123.456789
			const atomic = toAtomicAma(original)
			const converted = fromAtomicAma(atomic)

			expect(converted).toBeCloseTo(original, 9)
		})

		it('handles edge cases', () => {
			expect(fromAtomicAma(toAtomicAma(0))).toBe(0)
			expect(fromAtomicAma(toAtomicAma(1))).toBe(1)
			expect(fromAtomicAma(toAtomicAma(1000))).toBe(1000)
		})
	})
})
