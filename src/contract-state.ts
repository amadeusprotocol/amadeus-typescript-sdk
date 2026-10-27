/**
 * Contract State Utilities
 *
 * Provides functions for parsing contract state values returned by the Amadeus chain.
 * Contract state values are stored as binary (Uint8Array) and need to be decoded
 * into usable types (numbers, strings, etc.).
 */

import { uint8ArrayToBase64 } from './encoding'
import { decodeContractState, decodeContractStatePage } from './serialization'
import type { ContractStatePage } from './serialization'
import { AmadeusSDKError } from './types'

/**
 * Decode VecPack-encoded contract state and convert keys/values to Base64 strings.
 *
 * Useful for serializing decoded contract state for Redux or other stores
 * that require JSON-serializable values.
 *
 * Decodes ONE `get_prefix` page and drops its cursor, so a prefix with more than
 * 1,000 rows comes back truncated. Use `readAllPrefixPages` to read every page.
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

/** Options for `readAllPrefixPages`. */
export interface ReadAllPrefixPagesOptions {
	/** Most pages to fetch before giving up (default 50, i.e. ~50,000 rows) */
	maxPages?: number
}

const DEFAULT_MAX_PREFIX_PAGES = 50

/**
 * Path for one page of a prefix read: the endpoint, plus `?cursor=` after the first page.
 *
 * The default endpoint is relative to an `/api` base and meant for string concatenation
 * (`base + prefixPagePath(cursor)`). `AmadeusClient` resolves paths against the origin,
 * so pass `'/api/contract/get_prefix'` there.
 *
 * @param cursor - Cursor from the previous page, or `null` for the first page
 * @param endpoint - Prefix endpoint path (default `/contract/get_prefix`)
 * @returns Endpoint path with the cursor query string
 *
 * @example
 * ```ts
 * prefixPagePath('4vJ9...', '/api/contract/get_prefix') // '/api/contract/get_prefix?cursor=4vJ9...'
 * ```
 */
export function prefixPagePath(cursor: string | null, endpoint = '/contract/get_prefix'): string {
	return endpoint + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : '')
}

/**
 * Read every page of a `get_prefix` query, following the cursor to the last page.
 *
 * Throws an `AmadeusSDKError` rather than truncating: on a page that does not
 * decode, a repeated cursor, or more than `maxPages` pages. Errors from
 * `fetchPage` propagate unchanged.
 *
 * @param fetchPage - Fetches the raw body of one page; `null` asks for the first
 * @param options - Optional page limit
 * @returns Every `[key, value]` pair, page after page
 *
 * @example
 * ```ts
 * const entries = await readAllPrefixPages(async (cursor) => {
 *   const response = await fetch(base + prefixPagePath(cursor), { method: 'POST', body: prefix })
 *   return response.arrayBuffer()
 * })
 * ```
 */
export async function readAllPrefixPages(
	fetchPage: (cursor: string | null) => Promise<Uint8Array | ArrayBuffer>,
	options?: ReadAllPrefixPagesOptions
): Promise<Array<[Uint8Array, Uint8Array]>> {
	const maxPages = options?.maxPages ?? DEFAULT_MAX_PREFIX_PAGES
	if (!Number.isInteger(maxPages) || maxPages < 1) {
		throw new AmadeusSDKError(`maxPages must be a positive integer, got ${maxPages}`)
	}

	const entries: Array<[Uint8Array, Uint8Array]> = []
	const seenCursors = new Set<string>()

	const readFrom = async (cursor: string | null, pagesRead: number): Promise<void> => {
		if (pagesRead >= maxPages) {
			throw new AmadeusSDKError(`get_prefix returned more than ${maxPages} pages`)
		}
		const page = decodePrefixPage(await fetchPage(cursor))
		// Spreading a large legacy single-page body into push() overflows the stack.
		for (const entry of page.entries) entries.push(entry)
		if (page.cursor === null) return
		if (seenCursors.has(page.cursor)) {
			throw new AmadeusSDKError(`get_prefix repeated cursor ${page.cursor}`)
		}
		seenCursors.add(page.cursor)
		await readFrom(page.cursor, pagesRead + 1)
	}

	await readFrom(null, 0)
	return entries
}

function decodePrefixPage(body: Uint8Array | ArrayBuffer): ContractStatePage {
	try {
		return decodeContractStatePage(body)
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error)
		throw new AmadeusSDKError(`get_prefix page did not decode: ${reason}`)
	}
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
