/**
 * Validation Utilities
 *
 * Helper functions for validating values using Effect Schemas and
 * standalone validation functions for Amadeus Protocol data types.
 */

import { Schema } from 'effect'
import {
	AMA_TOKEN_DECIMALS,
	AMA_TOKEN_DECIMALS_MULTIPLIER,
	AMADEUS_PUBLIC_KEY_BYTE_LENGTH,
	AMADEUS_SEED_BYTE_LENGTH,
	MIN_TRANSFERABLE_AMOUNT
} from './constants'
import { fromBase58 } from './encoding'
import { AmadeusSDKError } from './types'

/**
 * Helper function to extract error message from Effect Schema ParseError
 */
function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}
	if (
		error &&
		typeof error === 'object' &&
		'message' in error &&
		typeof error.message === 'string'
	) {
		return error.message
	}
	return String(error)
}

/**
 * Helper function to validate and decode a value using a schema
 * Throws AmadeusSDKError if validation fails
 * @param schema - Effect Schema to validate against
 * @param value - Value to validate
 * @returns Validated value
 */
export function validate<T>(schema: Schema.Schema<T>, value: unknown): T {
	try {
		return Schema.decodeUnknownSync(schema)(value)
	} catch (error) {
		// Convert Effect Schema ParseError to AmadeusSDKError
		throw new AmadeusSDKError(getErrorMessage(error))
	}
}

// ============================================================================
// Standalone Validation Functions
// ============================================================================

/**
 * Validation result type
 */
export type ValidationResult = {
	valid: true
} | {
	valid: false
	error: string
}

/**
 * Validate an Amadeus address (Base58-encoded 48-byte public key)
 *
 * @param address - The address to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```ts
 * const result = validateAddress('abc123...')
 * if (!result.valid) {
 *   console.error(result.error)
 * }
 * ```
 */
export function validateAddress(address: string): ValidationResult {
	if (!address || typeof address !== 'string') {
		return { valid: false, error: 'Address is required' }
	}

	try {
		const decoded = fromBase58(address)
		if (decoded.length !== AMADEUS_PUBLIC_KEY_BYTE_LENGTH) {
			return {
				valid: false,
				error: `Invalid address length: expected ${AMADEUS_PUBLIC_KEY_BYTE_LENGTH} bytes, got ${decoded.length}`
			}
		}
		return { valid: true }
	} catch {
		return { valid: false, error: 'Invalid Base58 encoding' }
	}
}

/**
 * Check if an address is valid (simple boolean version)
 *
 * @param address - The address to check
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
	return validateAddress(address).valid
}

/**
 * Validate an Amadeus seed (Base58-encoded 64-byte seed)
 *
 * @param seed - The seed to validate
 * @returns Validation result with error message if invalid
 */
export function validateSeed(seed: string): ValidationResult {
	if (!seed || typeof seed !== 'string') {
		return { valid: false, error: 'Seed is required' }
	}

	try {
		const decoded = fromBase58(seed)
		if (decoded.length !== AMADEUS_SEED_BYTE_LENGTH) {
			return {
				valid: false,
				error: `Invalid seed length: expected ${AMADEUS_SEED_BYTE_LENGTH} bytes, got ${decoded.length}`
			}
		}
		return { valid: true }
	} catch {
		return { valid: false, error: 'Invalid Base58 encoding' }
	}
}

/**
 * Check if a seed is valid (simple boolean version)
 *
 * @param seed - The seed to check
 * @returns true if valid, false otherwise
 */
export function isValidSeed(seed: string): boolean {
	return validateSeed(seed).valid
}

/**
 * Validate a transfer amount
 *
 * @param amount - The amount as a string (user input)
 * @returns Validation result with error message if invalid
 */
export function validateAmount(amount: string): ValidationResult {
	if (!amount || typeof amount !== 'string') {
		return { valid: false, error: 'Amount is required' }
	}

	// Check format: must be a valid number
	if (!/^\d+(\.\d+)?$/.test(amount)) {
		return { valid: false, error: 'Amount must be a valid number' }
	}

	// Check decimal places
	const decimalPart = amount.split('.')[1]
	if (decimalPart && decimalPart.length > AMA_TOKEN_DECIMALS) {
		return {
			valid: false,
			error: `Amount cannot have more than ${AMA_TOKEN_DECIMALS} decimal places`
		}
	}

	// Check value is positive
	const num = Number.parseFloat(amount)
	if (Number.isNaN(num) || num <= 0) {
		return { valid: false, error: 'Amount must be greater than 0' }
	}

	// Check minimum transferable amount
	if (num * AMA_TOKEN_DECIMALS_MULTIPLIER < 1) {
		return {
			valid: false,
			error: `Amount is below the minimum transferable value (${MIN_TRANSFERABLE_AMOUNT})`
		}
	}

	return { valid: true }
}

/**
 * Check if an amount is valid (simple boolean version)
 *
 * @param amount - The amount to check
 * @returns true if valid, false otherwise
 */
export function isValidAmount(amount: string): boolean {
	return validateAmount(amount).valid
}

/**
 * Validate a password for wallet encryption
 *
 * @param password - The password to validate
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 */
export function validatePassword(
	password: string,
	options: {
		minLength?: number
		maxLength?: number
		requireLowercase?: boolean
		requireUppercase?: boolean
		requireNumber?: boolean
		requireSpecial?: boolean
	} = {}
): ValidationResult {
	const {
		minLength = 8,
		maxLength = 128,
		requireLowercase = true,
		requireUppercase = true,
		requireNumber = true,
		requireSpecial = true
	} = options

	if (!password || typeof password !== 'string') {
		return { valid: false, error: 'Password is required' }
	}

	if (password.length < minLength) {
		return { valid: false, error: `Password must be at least ${minLength} characters` }
	}

	if (password.length > maxLength) {
		return { valid: false, error: `Password must be at most ${maxLength} characters` }
	}

	if (requireLowercase && !/[a-z]/.test(password)) {
		return { valid: false, error: 'Password must contain at least one lowercase letter' }
	}

	if (requireUppercase && !/[A-Z]/.test(password)) {
		return { valid: false, error: 'Password must contain at least one uppercase letter' }
	}

	if (requireNumber && !/[0-9]/.test(password)) {
		return { valid: false, error: 'Password must contain at least one number' }
	}

	if (requireSpecial && !/[^a-zA-Z0-9]/.test(password)) {
		return { valid: false, error: 'Password must contain at least one special character' }
	}

	return { valid: true }
}

/**
 * Validate a token symbol
 *
 * @param symbol - The symbol to validate
 * @returns Validation result with error message if invalid
 */
export function validateTokenSymbol(symbol: string): ValidationResult {
	if (!symbol || typeof symbol !== 'string') {
		return { valid: false, error: 'Token symbol is required' }
	}

	if (symbol.length < 1) {
		return { valid: false, error: 'Token symbol is too short' }
	}

	if (symbol.length > 10) {
		return { valid: false, error: 'Token symbol is too long' }
	}

	// Only allow alphanumeric characters
	if (!/^[A-Z0-9]+$/.test(symbol)) {
		return { valid: false, error: 'Token symbol must contain only uppercase letters and numbers' }
	}

	return { valid: true }
}
