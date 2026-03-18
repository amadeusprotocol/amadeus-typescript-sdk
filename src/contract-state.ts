/**
 * Contract State Utilities
 *
 * Provides functions for parsing contract state values returned by the Amadeus chain.
 * Contract state values are stored as binary (Uint8Array) and need to be decoded
 * into usable types (numbers, strings, etc.).
 */

import { uint8ArrayToBase64 } from './encoding'
import { decodeContractState } from './serialization'

/**
 * Decode VecPack-encoded contract state and convert keys/values to Base64 strings.
 *
 * Useful for serializing decoded contract state for Redux or other stores
 * that require JSON-serializable values.
 *
 * @param bytes - VecPack-encoded bytes (Uint8Array or ArrayBuffer)
 * @returns Array of [key, value] tuples as Base64 strings
 *
 * @example
 * ```ts
 * const buffer = await response.arrayBuffer()
 * const entries = decodeContractStateToBase64(buffer)
 * // entries: [["base64key", "base64value"], ...]
 * ```
 */
export function decodeContractStateToBase64(
	bytes: Uint8Array | ArrayBuffer
): Array<[string, string]> {
	const pairs = decodeContractState(bytes)
	return pairs
		.filter(([key, value]) => key.length > 0 && value.length > 0)
		.map(([key, value]) => [uint8ArrayToBase64(key), uint8ArrayToBase64(value)])
}

/**
 * Parse a contract state value as a number.
 *
 * Handles multiple input types:
 * - `number` — returned directly
 * - `string` — parsed as integer
 * - `Uint8Array` — first tries UTF-8 digit string, then little-endian binary
 * - `null`/`undefined` — returns 0
 *
 * @param value - Raw contract state value
 * @returns Parsed number (0 if unparseable)
 *
 * @example
 * ```ts
 * parseStateNumber(new TextEncoder().encode('42'))  // 42
 * parseStateNumber(new Uint8Array([0x2a, 0x00]))    // 42 (little-endian)
 * parseStateNumber('100')                            // 100
 * parseStateNumber(null)                             // 0
 * ```
 */
export function parseStateNumber(value: string | number | Uint8Array | null | undefined): number {
	if (value === null || value === undefined) return 0
	if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : 0
	if (typeof value === 'string') {
		const parsed = parseInt(value, 10)
		return isNaN(parsed) || parsed < 0 ? 0 : parsed
	}
	if (value instanceof Uint8Array) {
		return decodeUint8ArrayAsNumber(value)
	}
	return 0
}

/**
 * Parse a contract state value as a string.
 *
 * Handles multiple input types:
 * - `string` — returned directly
 * - `number` — converted to string
 * - `Uint8Array` — decoded as UTF-8
 * - `null`/`undefined` — returns null
 *
 * @param value - Raw contract state value
 * @returns Parsed string or null
 */
export function parseStateString(
	value: string | number | Uint8Array | null | undefined
): string | null {
	if (value === null || value === undefined) return null
	if (typeof value === 'string') return value
	if (typeof value === 'number') return value.toString()
	if (value instanceof Uint8Array) {
		return new TextDecoder().decode(value)
	}
	return null
}

/**
 * Decode a Uint8Array contract state value as a number.
 * Tries UTF-8 digit string first, falls back to little-endian binary.
 */
function decodeUint8ArrayAsNumber(value: Uint8Array): number {
	if (!value.length) return 0

	// First try to interpret as UTF-8 digits
	try {
		const str = new TextDecoder().decode(value)
		const parsed = parseInt(str, 10)
		if (!isNaN(parsed)) {
			return parsed
		}
	} catch {
		// Fallthrough to binary parsing
	}

	// Fallback: parse as little-endian integer (u32/u64)
	let result = 0n
	const bytesToRead = Math.min(value.length, 8)
	for (let i = 0; i < bytesToRead; i++) {
		result |= BigInt(value[i]!) << BigInt(i * 8)
	}

	const asNumber = Number(result)
	return Number.isSafeInteger(asNumber) ? asNumber : 0
}
