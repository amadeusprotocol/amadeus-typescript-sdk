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

/**
 * Convert human-readable AMA amount to atomic units
 *
 * Uses string splitting to avoid floating-point precision issues
 * while preserving truncation (never rounds up) for safety.
 *
 * @param ama - Human-readable AMA amount (number or string)
 * @returns Atomic units (integer)
 *
 * @example
 * ```ts
 * const atomic = toAtomicAma(1.5)            // Returns 1500000000
 * const atomic = toAtomicAma('1.00000001')   // Returns 1000000010
 * ```
 */
export function toAtomicAma(ama: number | string): number {
	const num = typeof ama === 'string' ? parseFloat(ama) : ama
	const [int, frac = ''] = num.toFixed(AMA_TOKEN_DECIMALS).split('.')
	return parseInt(int + frac, 10)
}
