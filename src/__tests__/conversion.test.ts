import { describe, it, expect } from 'vitest'
import { toAtomicAma, toAtomicAmaString, fromAtomicAma, fromAtomicAmaString } from '../conversion'
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

		it('rejects strings that are not a plain decimal amount', () => {
			expect(() => toAtomicAma('abc')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma('')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma('   ')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma('1,5')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma('1.5abc')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma('1e3')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma('0x10')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma('1.2.3')).toThrow('Invalid AMA amount')
		})

		it('rejects negative amounts', () => {
			expect(() => toAtomicAma(-1.5)).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma('-5')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma(-0.000000001)).toThrow('Invalid AMA amount')
		})

		it('rejects amounts that are not finite numbers', () => {
			expect(() => toAtomicAma(NaN)).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma(Infinity)).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma(-Infinity)).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma(null as unknown as number)).toThrow('Invalid AMA amount')
			expect(() => toAtomicAma(undefined as unknown as number)).toThrow('Invalid AMA amount')
		})

		it('truncates string precision beyond 9 decimals instead of rounding up', () => {
			expect(toAtomicAma('1.0000000005')).toBe(1_000_000_000)
			expect(toAtomicAma('1.9999999999')).toBe(1_999_999_999)
			expect(toAtomicAma('0.0000000001')).toBe(0)
			expect(toAtomicAma('0.9999999999')).toBe(999_999_999)
		})

		it('throws instead of returning an amount past the safe-integer ceiling', () => {
			expect(() => toAtomicAma(1e10)).toThrow('exceeds the maximum safe integer')
			expect(() => toAtomicAma(1e21)).toThrow('exceeds the maximum safe integer')
			expect(() => toAtomicAma('21000000')).toThrow('exceeds the maximum safe integer')
			expect(toAtomicAma('9007199.254740991')).toBe(Number.MAX_SAFE_INTEGER)
			expect(() => toAtomicAma('9007199.254740992')).toThrow(
				'exceeds the maximum safe integer'
			)
		})
	})

	describe('toAtomicAmaString', () => {
		it('agrees with toAtomicAma wherever toAtomicAma can represent the result', () => {
			expect(toAtomicAmaString(0)).toBe('0')
			expect(toAtomicAmaString(1)).toBe('1000000000')
			expect(toAtomicAmaString(1.5)).toBe('1500000000')
			expect(toAtomicAmaString(1.00000001)).toBe('1000000010')
			expect(toAtomicAmaString('0.000000001')).toBe('1')
			expect(toAtomicAmaString('100')).toBe('100000000000')
		})

		it('stays exact above the safe-integer ceiling', () => {
			expect(toAtomicAmaString('21000000')).toBe('21000000000000000')
			expect(toAtomicAmaString('9007199.254740992')).toBe('9007199254740992')
			expect(toAtomicAmaString(1e21)).toBe('1' + '0'.repeat(30))
			expect(toAtomicAmaString('123456789012345678901.987654321')).toBe(
				'123456789012345678901987654321'
			)
		})

		it('applies the same validation as toAtomicAma', () => {
			expect(() => toAtomicAmaString('abc')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAmaString('-1')).toThrow('Invalid AMA amount')
			expect(() => toAtomicAmaString(NaN)).toThrow('Invalid AMA amount')
			expect(() => toAtomicAmaString(Infinity)).toThrow('Invalid AMA amount')
			expect(toAtomicAmaString('1.0000000005')).toBe('1000000000')
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

		it('rejects strings that are not a whole count of atomic units', () => {
			expect(() => fromAtomicAma('abc')).toThrow('Invalid atomic amount')
			expect(() => fromAtomicAma('')).toThrow('Invalid atomic amount')
			expect(() => fromAtomicAma('1.5')).toThrow('Invalid atomic amount')
			expect(() => fromAtomicAma('1000000000abc')).toThrow('Invalid atomic amount')
			expect(() => fromAtomicAma('1e9')).toThrow('Invalid atomic amount')
			expect(() => fromAtomicAma('-1')).toThrow('Negative value not allowed')
		})
	})

	describe('fromAtomicAmaString', () => {
		it('converts atomic values to decimal strings accurately', () => {
			expect(fromAtomicAmaString('0')).toBe('0')
			expect(fromAtomicAmaString(0)).toBe('0')
			expect(fromAtomicAmaString(0n)).toBe('0')
			expect(fromAtomicAmaString('1000000000')).toBe('1')
			expect(fromAtomicAmaString(1000000000n)).toBe('1')
			expect(fromAtomicAmaString('1500000000')).toBe('1.5')
			expect(fromAtomicAmaString(1500000000n)).toBe('1.5')
			expect(fromAtomicAmaString('1')).toBe('0.000000001')
			expect(fromAtomicAmaString('1000000001')).toBe('1.000000001')
		})

		it('handles arbitrarily large amounts without MAX_SAFE_INTEGER limits', () => {
			// 10,000,000 AMA (genesis vaults and large holders)
			expect(fromAtomicAmaString('10000000000000000')).toBe('10000000')
			expect(fromAtomicAmaString(10000000000000000n)).toBe('10000000')

			// 21,000,000 AMA
			expect(fromAtomicAmaString('21000000000000000')).toBe('21000000')

			// 30-digit atomic string
			expect(fromAtomicAmaString('123456789012345678901987654321')).toBe(
				'123456789012345678901.987654321'
			)
		})

		it('rejects invalid inputs', () => {
			expect(() => fromAtomicAmaString('-1')).toThrow('Negative value not allowed')
			expect(() => fromAtomicAmaString(-100n)).toThrow('Negative value not allowed')
			expect(() => fromAtomicAmaString('abc')).toThrow('Invalid atomic amount')
			expect(() => fromAtomicAmaString('1.5')).toThrow('Invalid atomic amount')
			expect(() => fromAtomicAmaString(1.5)).toThrow('Invalid atomic amount')
			expect(() => fromAtomicAmaString(NaN)).toThrow('Invalid atomic amount')
			expect(() => fromAtomicAmaString(Infinity)).toThrow('Invalid atomic amount')
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

		it('round-trips lossless strings at extreme scale', () => {
			const large = '21000000000000000'
			expect(toAtomicAmaString(fromAtomicAmaString(large))).toBe(large)
			const human = '123456789012345.123456789'
			expect(fromAtomicAmaString(toAtomicAmaString(human))).toBe(human)
		})
	})
})
