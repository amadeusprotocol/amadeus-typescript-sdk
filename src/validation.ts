/**
 * Validation Utilities
 *
 * Helper functions for validating values using Effect Schemas
 */

import { Schema } from 'effect'
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
