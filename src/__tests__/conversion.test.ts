import { describe, it, expect } from 'vitest'
import { toAtomicAma, fromAtomicAma } from '../conversion'
import { AMA_TOKEN_DECIMALS_MULTIPLIER } from '../constants'

describe('Conversion Utilities', () => {
	describe('toAtomicAma', () => {
		it('converts whole AMA amounts', () => {
			expect(toAtomicAma(0)).toBe(0)
			expect(toAtomicAma(1)).toBe(AMA_TOKEN_DECIMALS_MULTIPLIER)
			expect(toAtomicAma(100)).toBe(AMA_TOKEN_DECIMALS_MULTIPLIER * 100)
		})

		it('converts decimal amounts', () => {
			expect(toAtomicAma(0.1)).toBe(100_000_000)
			expect(toAtomicAma(0.5)).toBe(500_000_000)
			expect(toAtomicAma(1.5)).toBe(1_500_000_000)
			expect(toAtomicAma(0.000000001)).toBe(1)
		})

		it('fixes precision bug: 1.00000001 must produce 1000000010, not 1000000009', () => {
			expect(toAtomicAma(1.00000001)).toBe(1_000_000_010)
		})

		it('preserves precision across all 9 decimal places', () => {
			expect(toAtomicAma(1.123456789)).toBe(1_123_456_789)
			expect(toAtomicAma(1.999999999)).toBe(1_999_999_999)
			expect(toAtomicAma(1.000000001)).toBe(1_000_000_001)
			expect(toAtomicAma(0.123456789)).toBe(123_456_789)
			expect(toAtomicAma(9.999999999)).toBe(9_999_999_999)
		})

		it('handles amounts with fewer than 9 decimal places', () => {
			expect(toAtomicAma(1.1)).toBe(1_100_000_000)
			expect(toAtomicAma(1.12)).toBe(1_120_000_000)
			expect(toAtomicAma(1.00000001)).toBe(1_000_000_010)
		})

		it('accepts string inputs for exact precision from user input', () => {
			expect(toAtomicAma('0')).toBe(0)
			expect(toAtomicAma('1')).toBe(1_000_000_000)
			expect(toAtomicAma('1.5')).toBe(1_500_000_000)
			expect(toAtomicAma('1.00000001')).toBe(1_000_000_010)
			expect(toAtomicAma('1.000000001')).toBe(1_000_000_001)
			expect(toAtomicAma('0.000000001')).toBe(1)
			expect(toAtomicAma('100')).toBe(100_000_000_000)
		})
	})

	describe('fromAtomicAma', () => {
		it('converts atomic units to AMA', () => {
			expect(fromAtomicAma(0)).toBe(0)
			expect(fromAtomicAma(AMA_TOKEN_DECIMALS_MULTIPLIER)).toBe(1)
			expect(fromAtomicAma(AMA_TOKEN_DECIMALS_MULTIPLIER * 1.5)).toBe(1.5)
		})

		it('converts small atomic values (less than 1 AMA)', () => {
			expect(fromAtomicAma(1)).toBe(0.000000001)
			expect(fromAtomicAma(100_000_000)).toBe(0.1)
			expect(fromAtomicAma(500_000_000)).toBe(0.5)
		})

		it('converts values with trailing digits', () => {
			expect(fromAtomicAma(1_000_000_001)).toBe(1.000000001)
			expect(fromAtomicAma(1_000_000_009)).toBe(1.000000009)
			expect(fromAtomicAma(1_000_000_010)).toBe(1.00000001)
			expect(fromAtomicAma(1_999_999_999)).toBe(1.999999999)
		})

		it('handles string inputs', () => {
			expect(fromAtomicAma(AMA_TOKEN_DECIMALS_MULTIPLIER.toString())).toBe(1)
			expect(fromAtomicAma('0')).toBe(0)
			expect(fromAtomicAma('1000000001')).toBe(1.000000001)
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
		it('maintains precision in round-trip', () => {
			expect(fromAtomicAma(toAtomicAma(1.00000001))).toBe(1.00000001)
			expect(fromAtomicAma(toAtomicAma(1.000000001))).toBe(1.000000001)
			expect(fromAtomicAma(toAtomicAma(1.999999999))).toBe(1.999999999)
			expect(fromAtomicAma(toAtomicAma(0.000000001))).toBe(0.000000001)
			expect(fromAtomicAma(toAtomicAma(123.456789))).toBeCloseTo(123.456789, 9)
		})

		it('handles whole number edge cases', () => {
			expect(fromAtomicAma(toAtomicAma(0))).toBe(0)
			expect(fromAtomicAma(toAtomicAma(1))).toBe(1)
			expect(fromAtomicAma(toAtomicAma(1000))).toBe(1000)
		})
	})
})
