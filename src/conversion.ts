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
 *
 * `parseFloat` used to do this job and accepts far more than an amount. It reads a
 * leading number and discards the rest, so '1.5abc' became 1.5, '1,5' became 1
 * (a comma-decimal locale silently lost the fraction, turning 1,5 AMA into 1 AMA),
 * and 'abc' became NaN — which then flowed through the conversion as the literal
 * string 'NaN' in a transaction argument instead of raising anything.
 */
const DECIMAL_AMOUNT = /^[0-9]+(\.[0-9]+)?$/

/** A non-negative integer amount of atomic units, as written by the chain. */
const INTEGER_AMOUNT = /^-?[0-9]+$/

/**
 * Split a validated decimal string into exact whole and fractional digits,
 * truncated to the token's precision.
 *
 * Truncation, never rounding: a caller who types more precision than the chain can
 * represent gets the amount rounded *down*, so the conversion can never send more
 * than was asked for.
 */
function splitExactDecimal(value: string): { whole: string; frac: string } {
	const [whole, frac = ''] = value.split('.')
	return { whole, frac: frac.slice(0, AMA_TOKEN_DECIMALS).padEnd(AMA_TOKEN_DECIMALS, '0') }
}

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
	// A string is required to be a plain integer. parseFloat previously accepted
	// anything that merely started with a number, so 'abc' silently became 0 and a
	// fractional '1.5' was treated as a valid count of atomic units even though
	// atomic units are indivisible.
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
 * Convert a human-readable AMA amount to atomic units.
 *
 * @param ama - AMA amount, as a number or a plain decimal string
 * @returns Atomic units as a safe integer
 * @throws Error if the amount is not a valid non-negative amount, or if it is too
 *   large to be an exact JavaScript integer — use {@link toAtomicAmaString} for
 *   amounts above ~9,007,199 AMA.
 *
 * Precision rule, which differs by input type on purpose:
 *
 *  - A **string** carries the digits the caller actually typed, so it is truncated
 *    at the token's 9 decimals. '1.0000000005' AMA becomes 1000000000 atomic
 *    units, never 1000000001 — the conversion never sends more than was asked for.
 *  - A **number** has already lost the typed digits to binary floating point, so it
 *    is rounded at the 9th decimal to recover the decimal value the literal was
 *    meant to denote. Truncating a double's raw expansion would turn the literal
 *    1.00000001 into 1000000009 instead of 1000000010, which is the precision bug
 *    this rounding exists to undo.
 *
 * @example
 * ```ts
 * const atomic = toAtomicAma(1.5)      // Returns 1500000000
 * const exact = toAtomicAma('1.5')     // Returns 1500000000
 * ```
 */
export function toAtomicAma(ama: number | string): number {
	const atomic = toAtomicAmaString(ama)

	// Above 2^53 the digits of a JS number are no longer the digits of the amount.
	// The previous implementation returned such values anyway: 1e10 AMA came back as
	// 10000000000000000000 (not representable, so silently a different number), and
	// 1e21 AMA came back as 1 — because String(1e21) is '1e+21', whose toFixed(9)
	// splits into '1e+21' and '000000000', and parseInt then stopped at the 'e'.
	// One AMA is worth 10^9 atomic units, so the safe-integer ceiling is reached at
	// roughly 9,007,199 AMA, which is well inside plausible transfer sizes.
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
 * string (see `src/contracts/coin.ts`), so returning the digits directly avoids the
 * 2^53 ceiling that {@link toAtomicAma} has to enforce. Every digit is exact —
 * there is no floating-point multiplication anywhere in this path.
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
		// NaN and ±Infinity have no decimal expansion. The previous implementation
		// called .toFixed() on whatever it was given, so NaN produced the atomic
		// amount NaN and Infinity threw a RangeError from deep inside the conversion
		// rather than a message naming the bad amount. null and undefined threw a
		// TypeError there for the same reason; they are rejected below.
		if (!Number.isFinite(ama)) {
			throw new Error(`Invalid AMA amount: ${ama}`)
		}
		// Any double of magnitude >= 2^53 is an integer, and toFixed switches to
		// exponential notation at 1e21, so integers take an exact BigInt path and
		// only sub-2^53 fractions reach toFixed.
		decimal = Number.isInteger(ama) ? BigInt(ama).toString() : ama.toFixed(AMA_TOKEN_DECIMALS)
	} else {
		throw new Error(`Invalid AMA amount: ${JSON.stringify(ama)}`)
	}

	if (!DECIMAL_AMOUNT.test(decimal)) {
		// Negative amounts land here too. -1.5 AMA used to convert cleanly to
		// -1500000000 atomic units and was passed to the chain as a transfer argument.
		throw new Error(`Invalid AMA amount: ${JSON.stringify(ama)}`)
	}

	const { whole, frac } = splitExactDecimal(decimal)
	return BigInt(whole + frac).toString()
}
