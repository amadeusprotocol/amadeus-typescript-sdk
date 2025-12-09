/**
 * Encoding/Decoding Utilities
 *
 * Provides general-purpose encoding and decoding functions for converting
 * between different binary formats (Uint8Array, ArrayBuffer, Base64, Base58)
 */

import bs58 from 'bs58'

// ============================================================================
// Base64 Encoding/Decoding
// ============================================================================

/**
 * Check if Buffer is available (Node.js environment)
 */
function isBufferAvailable(): boolean {
	return typeof Buffer !== 'undefined' && Buffer.from !== undefined
}

/**
 * Convert Uint8Array to Base64 string
 *
 * Uses Node.js Buffer when available (more efficient), falls back to btoa for browsers.
 *
 * @param bytes - Bytes to encode
 * @returns Base64 encoded string
 *
 * @example
 * ```ts
 * const base64 = uint8ArrayToBase64(new Uint8Array([1, 2, 3]))
 * ```
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
	if (isBufferAvailable()) {
		// Node.js: Use Buffer for better performance
		return Buffer.from(bytes).toString('base64')
	}
	// Browser: Use btoa (available in Node.js 18+ and all modern browsers)
	let binary = ''
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i])
	}
	return btoa(binary)
}

/**
 * Convert Base64 string to Uint8Array
 *
 * Uses Node.js Buffer when available (more efficient), falls back to atob for browsers.
 *
 * @param base64 - Base64 encoded string
 * @returns Decoded bytes
 *
 * @example
 * ```ts
 * const bytes = base64ToUint8Array('AQID')
 * ```
 */
export function base64ToUint8Array(base64: string): Uint8Array {
	if (isBufferAvailable()) {
		// Node.js: Use Buffer for better performance
		return new Uint8Array(Buffer.from(base64, 'base64'))
	}
	// Browser: Use atob (available in Node.js 18+ and all modern browsers)
	const binaryString = atob(base64)
	const bytes = new Uint8Array(binaryString.length)
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i)
	}
	return bytes
}

/**
 * Convert ArrayBuffer to Base64 string
 *
 * @param buffer - Buffer to encode
 * @returns Base64 encoded string
 *
 * @example
 * ```ts
 * const base64 = arrayBufferToBase64(new ArrayBuffer(8))
 * ```
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	return uint8ArrayToBase64(bytes)
}

/**
 * Convert Base64 string to ArrayBuffer
 *
 * @param base64 - Base64 encoded string
 * @returns Decoded buffer
 *
 * @example
 * ```ts
 * const buffer = base64ToArrayBuffer('AQID')
 * ```
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const bytes = base64ToUint8Array(base64)
	const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
	return buffer as ArrayBuffer
}

// ============================================================================
// ArrayBuffer/Uint8Array Conversions
// ============================================================================

/**
 * Convert Uint8Array to ArrayBuffer
 *
 * @param bytes - The Uint8Array to convert
 * @returns ArrayBuffer
 *
 * @example
 * ```ts
 * const buffer = uint8ArrayToArrayBuffer(new Uint8Array([1, 2, 3]))
 * ```
 */
export function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
		return bytes.buffer as ArrayBuffer
	}
	return bytes.slice().buffer
}

/**
 * Convert ArrayBuffer to Uint8Array
 *
 * @param buffer - The ArrayBuffer to convert
 * @returns Uint8Array view of the buffer
 *
 * @example
 * ```ts
 * const bytes = arrayBufferToUint8Array(new ArrayBuffer(8))
 * ```
 */
export function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
	return new Uint8Array(buffer)
}

// ============================================================================
// Base58 Encoding/Decoding
// ============================================================================

/**
 * Encode a Uint8Array to Base58 string
 *
 * @param buf - The bytes to encode
 * @returns Base58 encoded string
 *
 * @example
 * ```ts
 * const encoded = toBase58(new Uint8Array([1, 2, 3]))
 * ```
 */
export function toBase58(buf: Uint8Array): string {
	return bs58.encode(buf)
}

/**
 * Decode a Base58 string to Uint8Array
 *
 * @param str - The Base58 string to decode
 * @returns Decoded bytes as Uint8Array
 * @throws Error if the string is invalid Base58
 *
 * @example
 * ```ts
 * const decoded = fromBase58('5Kd3N...')
 * ```
 */
export function fromBase58(str: string): Uint8Array {
	return bs58.decode(str)
}
