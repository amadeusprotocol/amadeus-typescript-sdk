/**
 * Token Conversion Utilities
 *
 * This module provides functions for converting between atomic units
 * and human-readable token amounts for the AMA token.
 */

import { AMA_TOKEN_DECIMALS, AMA_TOKEN_DECIMALS_MULTIPLIER } from './constants'

/**
 * A plain non-negative decimal amount: digits, optionally one decimal point
 * followed by more digits. Deliberately narrow — no sign, no exponent, no
 * thousands separators, no surrounding whitespace.
 */
const DECIMAL_AMOUNT = /^[0-9]+(\.[0-9]+)?$/

/** A non-negative integer amount of atomic units, as written by the chain. */
const INTEGER_AMOUNT = /^-?[0-9]+$/

/**
 * Split a validated decimal string into exact whole and fractional digits,
 * truncated to the token's precision.
 */
function splitExactDecimal(value: string): { whole: string; frac: string } {
	const [whole, frac = ''] = value.split('.')
	return { whole, frac: frac.slice(0, AMA_TOKEN_DECIMALS).padEnd(AMA_TOKEN_DECIMALS, '0') }
}

/**
 * Convert atomic AMA units to human-readable AMA amount as a JavaScript number.
 *
 * @param atomicAma - Atomic units (as number or string)
 * @returns Human-readable AMA amount
 * @throws Error if the value is invalid or exceeds Number.MAX_SAFE_INTEGER (~9,007,199 AMA).
 *         Use {@link fromAtomicAmaString} for arbitrary-precision amounts.
 *
 * @example
 * ```ts
 * const ama = fromAtomicAma(1000000000)  // Returns 1.0
 * ```
 */
export function fromAtomicAma(atomicAma: number | string): number {
	let atomicAmaAmount: number
	if (typeof atomicAma === 'string') {
		const trimmed = atomicAma.trim()
		if (!INTEGER_AMOUNT.test(trimmed)) {
			throw new Error(`Invalid atomic amount: ${JSON.stringify(atomicAma)}`)
		}
		atomicAmaAmount = Number(trimmed)
	} else {
		atomicAmaAmount = atomicAma
	}

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

/**
 * Convert atomic AMA units to an exact human-readable AMA decimal string without precision loss.
 *
 * Supports arbitrary-precision balances well beyond Number.MAX_SAFE_INTEGER (~9,007,199 AMA),
 * preventing parser failures or silent drops for large balances and vaults.
 *
 * @param atomicAma - Atomic units (as bigint, number, or string)
 * @returns Human-readable AMA amount as a canonical decimal string (e.g. '1.5' or '10000000')
 * @throws Error if the value is not a valid non-negative integer representation
 *
 * @example
 * ```ts
 * fromAtomicAmaString('1000000000')         // '1'
 * fromAtomicAmaString(1500000000n)          // '1.5'
 * fromAtomicAmaString('21000000000000000')  // '21000000'
 * ```
 */
export function fromAtomicAmaString(atomicAma: bigint | number | string): string {
	let raw: string
	if (typeof atomicAma === 'bigint') {
		raw = atomicAma.toString()
	} else if (typeof atomicAma === 'number') {
		if (!Number.isFinite(atomicAma) || !Number.isInteger(atomicAma)) {
			throw new Error(`Invalid atomic amount: ${atomicAma}`)
		}
		raw = BigInt(atomicAma).toString()
	} else if (typeof atomicAma === 'string') {
		raw = atomicAma.trim()
	} else {
		throw new Error(`Invalid atomic amount: ${JSON.stringify(atomicAma)}`)
	}

	if (!INTEGER_AMOUNT.test(raw)) {
		throw new Error(`Invalid atomic amount: ${JSON.stringify(atomicAma)}`)
	}

	const value = BigInt(raw)
	if (value < 0n) {
		throw new Error('Negative value not allowed')
	}
	if (value === 0n) {
		return '0'
	}

	const divisor = BigInt(AMA_TOKEN_DECIMALS_MULTIPLIER)
	const whole = value / divisor
	const remainder = value % divisor

	if (remainder === 0n) {
		return whole.toString()
	}

	const fracStr = remainder.toString().padStart(AMA_TOKEN_DECIMALS, '0').replace(/0+$/, '')
	return `${whole}.${fracStr}`
}

/**
 * Convert a human-readable AMA amount to atomic units.
 *
 * @param ama - AMA amount, as a number or a plain decimal string
 * @returns Atomic units as a safe integer
 * @throws Error if the amount is not a valid non-negative amount, or if it is too
 *   large to be an exact JavaScript integer — use {@link toAtomicAmaString} for
 *   amounts above ~9,007,199 AMA.
 */
export function toAtomicAma(ama: number | string): number {
	const atomic = toAtomicAmaString(ama)
	const value = Number(atomic)
	if (!Number.isSafeInteger(value)) {
		throw new Error(
			`Amount ${JSON.stringify(ama)} is ${atomic} atomic units, which exceeds the maximum safe integer. Use toAtomicAmaString for exact large amounts.`
		)
	}
	return value
}

/**
 * Convert a human-readable AMA amount to an exact atomic-unit decimal string.
 *
 * This is the form the chain wants: transaction arguments carry atomic units as a
 * string, so returning the digits directly avoids the 2^53 ceiling that
 * {@link toAtomicAma} enforces. Every digit is exact without binary floating-point drift.
 *
 * @param ama - AMA amount, as a number or a plain decimal string
 * @returns Atomic units as a canonical decimal string, e.g. '1500000000'
 * @throws Error if the amount is not a valid non-negative amount
 *
 * @example
 * ```ts
 * toAtomicAmaString('21000000')       // '21000000000000000'
 * toAtomicAmaString('1.0000000005')   // '1000000000' — truncated, never rounded up
 * ```
 */
export function toAtomicAmaString(ama: number | string): string {
	let decimal: string

	if (typeof ama === 'string') {
		decimal = ama.trim()
	} else if (typeof ama === 'number') {
		if (!Number.isFinite(ama)) {
			throw new Error(`Invalid AMA amount: ${ama}`)
		}
		decimal = Number.isInteger(ama) ? BigInt(ama).toString() : ama.toFixed(AMA_TOKEN_DECIMALS)
	} else {
		throw new Error(`Invalid AMA amount: ${JSON.stringify(ama)}`)
	}

	if (!DECIMAL_AMOUNT.test(decimal)) {
		throw new Error(`Invalid AMA amount: ${JSON.stringify(ama)}`)
	}

	const { whole, frac } = splitExactDecimal(decimal)
	return BigInt(whole + frac).toString()
}
