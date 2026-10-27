/**
 * VecPack Canonical Serialization Format
 *
 * This module implements the VecPack canonical serialization format used by Amadeus.
 * VecPack provides deterministic, canonical encoding of values for use in cryptographic
 * operations (e.g., transaction signing). It ensures that equivalent data structures
 * always serialize to the same byte sequence through canonical ordering of map keys.
 *
 * Format specification:
 * - Supports: null, booleans, integers (varint), bytes, lists, and maps
 * - Maps/objects are sorted by their encoded key bytes for canonical ordering
 * - Varints are limited to 16 bytes maximum
 * - Zero values are encoded as a single 0x00 byte
 */

const TYPE_NULL = 0x00
const TYPE_TRUE = 0x01
const TYPE_FALSE = 0x02
const TYPE_INT = 0x03
const TYPE_BYTES = 0x05
const TYPE_LIST = 0x06
const TYPE_MAP = 0x07

import type { DecodedValue, SerializableValue } from './types'

interface DecodeRef {
	offset: number
}

/**
 * Encode a value into canonical serialization format
 *
 * @param term - The value to encode
 * @returns Encoded bytes as Uint8Array
 * @throws Error if the value contains unsupported types
 *
 * @example
 * ```ts
 * const encoded = encode({ foo: 'bar', count: 42 })
 * ```
 */
export function encode(term: SerializableValue): Uint8Array {
	const bytesOut: number[] = []
	encodeTerm(term, bytesOut)
	return new Uint8Array(bytesOut)
}

/**
 * Decode a value from canonical serialization format
 *
 * @param bytes - The encoded bytes to decode
 * @returns Decoded value
 * @throws Error if the bytes are invalid or contain trailing bytes
 *
 * @example
 * ```ts
 * const decoded = decode(encodedBytes)
 * ```
 */
export function decode(bytes: Uint8Array | number[]): DecodedValue {
	const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
	const ref: DecodeRef = { offset: 0 }
	const value = decodeTerm(data, ref)
	if (ref.offset !== data.length) {
		throw new Error('trailing_bytes')
	}
	return value
}

/** One page of a contract state prefix read. */
export interface ContractStatePage {
	/** `[key, value]` pairs, keys with the queried prefix stripped */
	entries: Array<[Uint8Array, Uint8Array]>
	/** Cursor for the next page, or `null` on the last page */
	cursor: string | null
}

/**
 * Decode one `get_prefix` response page.
 *
 * The node answers `{ rows, cursor }`: `rows` maps key suffix to value (an empty
 * list when nothing matched) and `cursor` is the Base58 key to resume after, or
 * nil on the last page. Pre-paging nodes answered with the bare row map, or an
 * empty list; both still decode, with a `null` cursor. Any other shape throws, so
 * an unreadable answer never passes for an empty one.
 *
 * @param bytes - VecPack-encoded response body (Uint8Array or ArrayBuffer)
 * @returns The page's entries and its cursor
 * @throws Error if the body is not a recognised prefix response
 *
 * @example
 * ```ts
 * const { entries, cursor } = decodeContractStatePage(await response.arrayBuffer())
 * ```
 */
export function decodeContractStatePage(bytes: Uint8Array | ArrayBuffer): ContractStatePage {
	const data = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes
	if (data.length === 0) return { entries: [], cursor: null }

	const decoded = decode(data)

	// The node encodes an empty row set as an empty list, not an empty map.
	if (Array.isArray(decoded) && decoded.length === 0) return { entries: [], cursor: null }

	if (!(decoded instanceof Map)) {
		throw new Error(`Expected MAP type, got ${describeTerm(decoded)}`)
	}

	const envelope = readPageEnvelope(decoded)
	if (!envelope) return { entries: binaryEntries(decoded), cursor: null }

	const { rows, cursor } = envelope
	if (Array.isArray(rows) && rows.length === 0) return { entries: [], cursor: readCursor(cursor) }
	if (!(rows instanceof Map)) {
		throw new Error(`Expected MAP or empty LIST for page rows, got ${describeTerm(rows)}`)
	}
	return { entries: binaryEntries(rows), cursor: readCursor(cursor) }
}

/**
 * Decode a contract state prefix response into `[key, value]` pairs.
 *
 * Reads both the paged `{ rows, cursor }` response and the pre-paging bare map,
 * but only ONE page: use `readAllPrefixPages` (or `sdk.contract.getPrefixEntries`)
 * to follow the cursor.
 *
 * @param bytes - VecPack-encoded bytes (Uint8Array or ArrayBuffer)
 * @returns Array of [key, value] tuples
 * @throws Error if the body is not a recognised prefix response or entries are not binary
 *
 * @example
 * ```ts
 * const response = await fetch('/api/contract/get_prefix', { method: 'POST', body: prefix })
 * const entries = decodeContractState(await response.arrayBuffer())
 * for (const [key, value] of entries) {
 *   console.log(key, value)
 * }
 * ```
 */
export function decodeContractState(
	bytes: Uint8Array | ArrayBuffer
): Array<[Uint8Array, Uint8Array]> {
	return decodeContractStatePage(bytes).entries
}

const textDecoder = new TextDecoder()

function readPageEnvelope(
	map: Map<DecodedValue, DecodedValue>
): { rows: DecodedValue; cursor: DecodedValue } | null {
	if (map.size !== 2) return null
	const named = new Map(
		[...map.entries()].map(([key, value]) => [
			key instanceof Uint8Array ? textDecoder.decode(key) : null,
			value
		])
	)
	if (!named.has('rows') || !named.has('cursor')) return null
	return { rows: named.get('rows') as DecodedValue, cursor: named.get('cursor') as DecodedValue }
}

function readCursor(cursor: DecodedValue): string | null {
	if (cursor === null) return null
	if (cursor instanceof Uint8Array && cursor.length > 0) return textDecoder.decode(cursor)
	throw new Error(`Expected binary or nil page cursor, got ${describeTerm(cursor)}`)
}

function binaryEntries(map: Map<DecodedValue, DecodedValue>): Array<[Uint8Array, Uint8Array]> {
	return [...map.entries()].map(([key, value]) => {
		if (!(key instanceof Uint8Array) || !(value instanceof Uint8Array)) {
			throw new Error('Expected Uint8Array for key and value')
		}
		return [key, value]
	})
}

function describeTerm(term: DecodedValue): string {
	if (term === null) return 'nil'
	if (Array.isArray(term)) return `LIST(${term.length})`
	if (term instanceof Map) return `MAP(${term.size})`
	if (term instanceof Uint8Array) return 'BYTES'
	return typeof term
}

/*
 * Helper functions for encoding and decoding
 */
function appendBytes(out: number[], bytes: Uint8Array | number[]): void {
	for (const b of bytes) {
		out.push(b)
	}
}

function compareBytes(a: Uint8Array | number[], b: Uint8Array | number[]): number {
	const n = Math.min(a.length, b.length)
	for (let i = 0; i < n; i++) {
		if (a[i] !== b[i]) return a[i] - b[i]
	}
	return a.length - b.length // shorter wins if prefix equal
}

function encodeKeyBytes(k: SerializableValue): number[] {
	const tmp: number[] = []
	encodeTerm(k, tmp)
	return tmp
}

function encodeVarint(n: number | bigint, out: number[]): void {
	let value = typeof n === 'bigint' ? n : BigInt(n)

	if (value === 0n) {
		out.push(0)
		return
	}

	const isNegative = value < 0n
	if (isNegative) value = -value

	// build big-endian magnitude
	const magBytes: number[] = []
	while (value > 0n) {
		magBytes.push(Number(value & 0xffn))
		value >>= 8n
	}
	magBytes.reverse() // now big-endian

	const len = magBytes.length
	if (len === 0 || len > 16) {
		throw new Error('bad_varint_length')
	}

	// Rust also rejects leading zero in decode; we don't generate those here
	if (magBytes[0] === 0) {
		throw new Error('varint_leading_zero')
	}

	const header = ((isNegative ? 1 : 0) << 7) | len
	out.push(header)
	appendBytes(out, magBytes)
}

function decodeVarint(data: Uint8Array, ref: DecodeRef): bigint {
	const header = data[ref.offset++]
	if (header === 0) return 0n
	if (header === 0x80) throw new Error('noncanonical_zero')

	const signBit = header >> 7
	const length = header & 0x7f

	let mag = 0n
	for (let i = 0; i < length; i++) {
		mag = (mag << 8n) | BigInt(data[ref.offset++])
	}

	if (signBit === 1) {
		return -mag
	} else {
		return mag
	}
}

function decodeVarintGteZero(data: Uint8Array, ref: DecodeRef): number {
	const n = decodeVarint(data, ref)
	if (n < 0n) {
		throw new Error('length_is_negative')
	}
	if (n > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new Error('length_overflow')
	}
	return Number(n)
}

function encodeTerm(value: SerializableValue, out: number[]): void {
	if (value === null) {
		out.push(TYPE_NULL)
	} else if (typeof value === 'boolean') {
		out.push(value ? TYPE_TRUE : TYPE_FALSE)
	} else if (typeof value === 'number' || typeof value === 'bigint') {
		out.push(TYPE_INT)
		encodeVarint(value, out)
	} else if (typeof value === 'string') {
		out.push(TYPE_BYTES)
		const utf8 = new TextEncoder().encode(value)
		encodeVarint(utf8.length, out)
		appendBytes(out, utf8)
	} else if (value instanceof Uint8Array) {
		out.push(TYPE_BYTES)
		encodeVarint(value.length, out)
		appendBytes(out, value)
	} else if (Array.isArray(value)) {
		out.push(TYPE_LIST)
		encodeVarint(value.length, out)
		for (const element of value) {
			encodeTerm(element, out)
		}
	} else if (
		value instanceof Map ||
		(typeof value === 'object' && !Array.isArray(value) && !(value instanceof Uint8Array))
	) {
		const entries: Array<{ k: SerializableValue; v: SerializableValue; bytes: number[] }> = []
		if (value instanceof Map) {
			for (const [k, v] of value.entries()) {
				const bytes = encodeKeyBytes(k) // encodes key as Term
				entries.push({ k, v, bytes })
			}
		} else {
			for (const k of Object.keys(value)) {
				const v = value[k]
				const bytes = encodeKeyBytes(k) // k is string; still encoded via encodeValue
				entries.push({ k, v, bytes })
			}
		}
		entries.sort((a, b) => compareBytes(a.bytes, b.bytes))

		out.push(TYPE_MAP)
		encodeVarint(entries.length, out)
		for (const entry of entries) {
			encodeTerm(entry.k, out)
			encodeTerm(entry.v, out)
		}
	} else {
		throw new Error(`Unsupported type: ${typeof value}`)
	}
}

function decodeTerm(data: Uint8Array, ref: DecodeRef): DecodedValue {
	if (ref.offset >= data.length) {
		throw new Error('decodeBytes: Out of bounds read')
	}

	const type = data[ref.offset++]

	switch (type) {
		case TYPE_NULL:
			return null
		case TYPE_TRUE:
			return true
		case TYPE_FALSE:
			return false
		case TYPE_INT:
			return decodeVarint(data, ref)
		case TYPE_BYTES: {
			const length = decodeVarintGteZero(data, ref)
			const bytes = data.slice(ref.offset, ref.offset + length)
			ref.offset += length
			return bytes
		}
		case TYPE_LIST: {
			const count = decodeVarintGteZero(data, ref)
			const items: DecodedValue[] = new Array(count)
			for (let i = 0; i < count; i++) {
				items[i] = decodeTerm(data, ref)
			}
			return items
		}
		case TYPE_MAP: {
			const count = decodeVarintGteZero(data, ref)

			let prevKeyBytes: Uint8Array | null = null
			const map = new Map<DecodedValue, DecodedValue>()

			for (let idx = 0; idx < count; idx++) {
				// canonical check: track raw key bytes
				const kStart = ref.offset
				const key = decodeTerm(data, ref)
				const kEnd = ref.offset
				const keyBytes = data.slice(kStart, kEnd)

				if (prevKeyBytes !== null) {
					if (compareBytes(keyBytes, prevKeyBytes) <= 0) {
						throw new Error('map_not_canonical')
					}
				}
				prevKeyBytes = keyBytes

				const value = decodeTerm(data, ref)
				map.set(key, value)
			}
			return map
		}
		default:
			throw new Error('decodeBytes: Unknown type')
	}
}
