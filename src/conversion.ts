/**
 * Token Conversion Utilities
 *
 * This module provides functions for converting between atomic units
 * and human-readable token amounts for the AMA token.
 */

import { AMA_TOKEN_DECIMALS_MULTIPLIER } from './constants'

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
 * @param ama - Human-readable AMA amount
 * @returns Atomic units
 *
 * @example
 * ```ts
 * const atomic = toAtomicAma(1.5)  // Returns 1500000000
 * ```
 */
export function toAtomicAma(ama: number): number {
	return ama * AMA_TOKEN_DECIMALS_MULTIPLIER
}
