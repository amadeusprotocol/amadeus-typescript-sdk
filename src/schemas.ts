/**
 * Effect Schema definitions for validation
 *
 * Provides reusable schemas for validating common data types used throughout the SDK
 */

import { Schema } from 'effect'

/**
 * Base58 character set regex pattern
 * Base58 excludes 0, O, I, l to avoid visual confusion
 */
const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/

/**
 * Schema for Base58 encoded hash (used for transaction IDs, entry hashes, etc.)
 */
export const Base58HashSchema = Schema.String.pipe(
	Schema.nonEmptyString(),
	Schema.pattern(BASE58_PATTERN, {
		identifier: 'Base58Hash',
		description: 'Base58 encoded hash string'
	})
)

/**
 * Schema for Base58 encoded address
 */
export const Base58AddressSchema = Schema.String.pipe(
	Schema.nonEmptyString(),
	Schema.pattern(BASE58_PATTERN, {
		identifier: 'Base58Address',
		description: 'Base58 encoded address string'
	})
)

/**
 * Schema for Base58 encoded public key
 */
export const Base58PublicKeySchema = Schema.String.pipe(
	Schema.nonEmptyString(),
	Schema.pattern(BASE58_PATTERN, {
		identifier: 'Base58PublicKey',
		description: 'Base58 encoded public key string'
	})
)

/**
 * Schema for transaction sort order
 */
export const TransactionSortSchema = Schema.Literal('asc', 'desc').annotations({
	identifier: 'TransactionSort'
})

/**
 * Schema for transaction filters
 * Validates optional fields when they are present
 */
export const TransactionFiltersSchema = Schema.Struct({
	limit: Schema.optional(Schema.NonNegativeInt),
	offset: Schema.optional(Schema.NonNegativeInt),
	sort: Schema.optional(TransactionSortSchema),
	cursor: Schema.optional(Schema.String),
	cursor_b58: Schema.optional(Schema.String),
	contract: Schema.optional(Schema.String),
	contract_b58: Schema.optional(Schema.String),
	function: Schema.optional(Schema.String),
	type: Schema.optional(Schema.Literal('sent', 'recv'))
}).annotations({
	identifier: 'TransactionFilters'
})

/**
 * Schema for non-empty string
 */
export const NonEmptyStringSchema = Schema.String.pipe(Schema.nonEmptyString())

/**
 * Schema for non-empty Uint8Array
 */
export const NonEmptyUint8ArraySchema = Schema.instanceOf(Uint8Array).pipe(
	Schema.filter((arr) => arr.length > 0, {
		identifier: 'NonEmptyUint8Array',
		description: 'Non-empty Uint8Array'
	})
)

/**
 * Schema for ArrayBuffer (can be converted to Uint8Array)
 */
export const NonEmptyArrayBufferSchema = Schema.instanceOf(ArrayBuffer).pipe(
	Schema.filter((buf) => buf.byteLength > 0, {
		identifier: 'NonEmptyArrayBuffer',
		description: 'Non-empty ArrayBuffer'
	})
)

/**
 * Schema for transaction data (Uint8Array or non-empty Base58 string)
 */
export const TransactionDataSchema = Schema.Union(
	NonEmptyUint8ArraySchema,
	Base58HashSchema
).annotations({
	identifier: 'TransactionData',
	description: 'Transaction data as Uint8Array or Base58 encoded string'
})

/**
 * Schema for contract key (Uint8Array or Base58 string)
 */
export const ContractKeySchema = Schema.Union(
	NonEmptyUint8ArraySchema,
	Base58HashSchema
).annotations({
	identifier: 'ContractKey',
	description: 'Contract key as Uint8Array or Base58 encoded string'
})

/**
 * Schema for bytecode (Uint8Array or ArrayBuffer)
 */
export const BytecodeSchema = Schema.Union(
	NonEmptyUint8ArraySchema,
	NonEmptyArrayBufferSchema
).annotations({
	identifier: 'Bytecode',
	description: 'Contract bytecode as Uint8Array or ArrayBuffer'
})

/**
 * Schema for safe positive integer (>= 1, within safe integer range)
 * Uses built-in Schema.Int and Schema.positive() with MAX_SAFE_INTEGER constraint
 */
export const SafePositiveNumberSchema = Schema.Int.pipe(
	Schema.positive(),
	Schema.filter((n) => n <= Number.MAX_SAFE_INTEGER, {
		identifier: 'SafePositiveNumber',
		description: 'Positive integer within safe integer range'
	})
)
