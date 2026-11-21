import { describe, it, expect } from 'vitest'
import { toAtomicAma, toAtomicAmaExact, fromAtomicAma } from '../conversion'
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

		it('rounds digits past the 9th decimal to the nearest atomic unit', () => {
			expect(toAtomicAma(1.9999999999)).toBe(2_000_000_000)
			expect(toAtomicAma('0.0000000019')).toBe(2)
			expect(toAtomicAma(1.0000000004)).toBe(1_000_000_000)
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

	describe('toAtomicAma input validation', () => {
		it('returns NaN for input that is not a plain non-negative decimal', () => {
			for (const input of [
				'abc',
				'',
				' ',
				'.',
				'-1',
				'1,5',
				'1e21',
				'1e-7',
				'0x10',
				'Infinity'
			]) {
				expect(toAtomicAma(input), input).toBeNaN()
			}
			for (const input of [-1, 1e21, 1e300, Infinity, -Infinity, NaN]) {
				expect(toAtomicAma(input), String(input)).toBeNaN()
			}
		})

		it('accepts plain decimals with surrounding whitespace or a bare dot', () => {
			expect(toAtomicAma(' 1.5 ')).toBe(1_500_000_000)
			expect(toAtomicAma('.5')).toBe(500_000_000)
			expect(toAtomicAma('5.')).toBe(5_000_000_000)
			expect(toAtomicAma(1e-7)).toBe(100)
		})

		it('is exact up to Number.MAX_SAFE_INTEGER atomic units', () => {
			expect(toAtomicAma('9007199.254740991')).toBe(Number.MAX_SAFE_INTEGER)
			expect(toAtomicAma('9007199.254740990')).toBe(Number.MAX_SAFE_INTEGER - 1)
			expect(toAtomicAma(1e20)).toBe(1e29)
		})

		it('is exact for number input with 9 decimals up to 2^23 AMA', () => {
			expect(toAtomicAma(8388607.999999999)).toBe(8_388_607_999_999_999)
			expect(toAtomicAma(8388607.000000001)).toBe(8_388_607_000_000_001)
			expect(toAtomicAmaExact(8388607.999999999)).toBe(8_388_607_999_999_999n)
		})
	})

	describe('toAtomicAmaExact', () => {
		it('converts plain decimals exactly, beyond the JS number range', () => {
			expect(toAtomicAmaExact('9876543.123456789')).toBe(9_876_543_123_456_789n)
			expect(toAtomicAmaExact('123456789012345678901.000000001')).toBe(
				123_456_789_012_345_678_901_000_000_001n
			)
			expect(toAtomicAmaExact('0')).toBe(0n)
			expect(toAtomicAmaExact('0.000000001')).toBe(1n)
			expect(toAtomicAmaExact(' 1.5 ')).toBe(1_500_000_000n)
			expect(toAtomicAmaExact('.5')).toBe(500_000_000n)
		})

		it('accepts trailing zeros past the 9th decimal, which lose no precision', () => {
			expect(toAtomicAmaExact('1.0000000000')).toBe(1_000_000_000n)
			expect(toAtomicAmaExact('0.0000000010')).toBe(1n)
			expect(() => toAtomicAmaExact('0.0000000011')).toThrow(/9 decimal places/)
		})

		it('converts numbers via their shortest decimal form', () => {
			expect(toAtomicAmaExact(1.5)).toBe(1_500_000_000n)
			expect(toAtomicAmaExact(1.00000001)).toBe(1_000_000_010n)
			expect(toAtomicAmaExact(0.1)).toBe(100_000_000n)
			expect(toAtomicAmaExact(1e-7)).toBe(100n)
			expect(toAtomicAmaExact(1.5e-8)).toBe(15n)
		})

		it('throws on non-numeric, negative, non-finite or over-precise input', () => {
			expect(() => toAtomicAmaExact('abc')).toThrow(/plain decimal/)
			expect(() => toAtomicAmaExact('1,5')).toThrow(/plain decimal/)
			expect(() => toAtomicAmaExact('1e21')).toThrow(/plain decimal/)
			expect(() => toAtomicAmaExact(1e21)).toThrow(/plain decimal/)
			expect(() => toAtomicAmaExact('')).toThrow(/plain decimal/)
			expect(() => toAtomicAmaExact('-1')).toThrow(/negative/)
			expect(() => toAtomicAmaExact(-0.5)).toThrow(/negative/)
			expect(() => toAtomicAmaExact(Infinity)).toThrow(/finite/)
			expect(() => toAtomicAmaExact(NaN)).toThrow(/finite/)
			expect(() => toAtomicAmaExact('1.0000000001')).toThrow(/9 decimal places/)
			expect(() => toAtomicAmaExact(0.1 + 0.2)).toThrow(/9 decimal places/)
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
