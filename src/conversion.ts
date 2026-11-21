/**
 * Token Conversion Utilities
 *
 * This module provides functions for converting between atomic units
 * and human-readable token amounts for the AMA token.
 */

import { AMA_TOKEN_DECIMALS, AMA_TOKEN_DECIMALS_MULTIPLIER } from './constants'

/**
 * Convert atomic AMA units to human-readable AMA amount
 *
 * @param atomicAma - Atomic units (as number or string)
 * @returns Human-readable AMA amount
 * @throws Error if the value is invalid
 *
 * @example
 * ```ts
 * const ama = fromAtomicAma(1000000000)  // Returns 1.0
 * ```
 */
export function fromAtomicAma(atomicAma: number | string): number {
	const atomicAmaAmount = typeof atomicAma === 'string' ? parseFloat(atomicAma) : atomicAma

	if (isNaN(atomicAmaAmount) || atomicAmaAmount === 0) {
		return 0
	}
	if (atomicAmaAmount < 0) {
		throw new Error('Negative value not allowed')
	}
	if (atomicAmaAmount < 1) {
		throw new Error('Value is less than 1')
	}
	if (atomicAmaAmount > Number.MAX_SAFE_INTEGER) {
		throw new Error('Value exceeds maximum safe integer')
	}
	return atomicAmaAmount / AMA_TOKEN_DECIMALS_MULTIPLIER
}

const ATOMIC_PER_AMA = 10n ** BigInt(AMA_TOKEN_DECIMALS)
const PLAIN_DECIMAL = /^(?=\.?\d)(\d*)(?:\.(\d*))?$/

function splitPlainDecimal(text: string): { whole: string; fraction: string } | null {
	const match = PLAIN_DECIMAL.exec(text)
	return match ? { whole: match[1], fraction: match[2] ?? '' } : null
}

// String(number) uses exponent notation below 1e-6; expand it without float math
function numberToDecimalString(amount: number): string {
	const text = String(amount)
	const match = /^(\d)(?:\.(\d+))?e-(\d+)$/.exec(text)
	if (!match) return text
	const [, whole, fraction = '', exponent] = match
	return `0.${'0'.repeat(Number(exponent) - 1)}${whole}${fraction}`
}

/**
 * Convert human-readable AMA amount to atomic units
 *
 * Non-throwing, for form validation. Returns `NaN` for anything that is not a plain,
 * non-negative decimal number (`'abc'`, `'-1'`, `'1,5'`, `'1e21'`, `Infinity`). Digits past the
 * 9th decimal are rounded half-up: `'1.9999999999'` gives `2000000000`.
 *
 * String input is exact up to `Number.MAX_SAFE_INTEGER` atomic units (about 9,007,199 AMA);
 * above that the result is the nearest JS number. A JS number holds 9 decimals exactly only up
 * to 2^23 (about 8,388,608 AMA). Use {@link toAtomicAmaExact} for amounts sent on-chain.
 *
 * @param ama - Human-readable AMA amount (number or string)
 * @returns Atomic units (integer), or `NaN` for invalid input
 *
 * @example
 * ```ts
 * const atomic = toAtomicAma(1.5)            // Returns 1500000000
 * const atomic = toAtomicAma('1.00000001')   // Returns 1000000010
 * const atomic = toAtomicAma('1,5')          // Returns NaN
 * ```
 */
export function toAtomicAma(ama: number | string): number {
	const text =
		typeof ama === 'number'
			? Number.isFinite(ama) && ama >= 0 && ama < 1e21
				? ama.toFixed(AMA_TOKEN_DECIMALS)
				: ''
			: typeof ama === 'string'
				? ama.trim()
				: ''
	const parts = splitPlainDecimal(text)
	if (!parts) return NaN
	const atomic =
		BigInt(parts.whole || '0') * ATOMIC_PER_AMA +
		BigInt(parts.fraction.slice(0, AMA_TOKEN_DECIMALS).padEnd(AMA_TOKEN_DECIMALS, '0'))
	const roundsUp = (parts.fraction[AMA_TOKEN_DECIMALS] ?? '0') >= '5'
	return Number(roundsUp ? atomic + 1n : atomic)
}

/**
 * Convert a human-readable AMA amount to exact atomic units, with no float math.
 *
 * Use this for amounts sent on-chain. Pass a decimal string for amounts above about
 * 8,388,608 AMA (2^23), since a JS number cannot hold 9 decimals exactly above that.
 *
 * @param ama - Plain decimal amount, e.g. `'9876543.123456789'` or `1.5`
 * @returns Atomic units as a bigint
 * @throws Error if the amount is not a finite, non-negative plain decimal with at most
 *   9 decimal places (trailing zeros past the 9th are ignored)
 *
 * @example
 * ```ts
 * toAtomicAmaExact('9876543.123456789')  // 9876543123456789n
 * toAtomicAmaExact('1,5')                // throws
 * ```
 */
export function toAtomicAmaExact(ama: number | string): bigint {
	if (typeof ama === 'number' && !Number.isFinite(ama)) {
		throw new Error(`Invalid AMA amount ${ama}: must be a finite number`)
	}
	const text = typeof ama === 'number' ? numberToDecimalString(ama) : String(ama).trim()
	if (text.startsWith('-')) {
		throw new Error(`Invalid AMA amount "${text}": must not be negative`)
	}
	const parts = splitPlainDecimal(text)
	if (!parts) {
		throw new Error(
			`Invalid AMA amount "${text}": expected a plain decimal number such as "1.5"`
		)
	}
	const fraction = parts.fraction.replace(/0+$/, '')
	if (fraction.length > AMA_TOKEN_DECIMALS) {
		throw new Error(
			`Invalid AMA amount "${text}": at most ${AMA_TOKEN_DECIMALS} decimal places are allowed`
		)
	}
	return (
		BigInt(parts.whole || '0') * ATOMIC_PER_AMA +
		BigInt(fraction.padEnd(AMA_TOKEN_DECIMALS, '0'))
	)
}
