/**
 * Password-Based Encryption Utilities
 *
 * Provides secure password-based encryption using PBKDF2 key derivation
 * and AES-GCM encryption. Suitable for encrypting sensitive wallet data.
 */

import { uint8ArrayToBase64, base64ToUint8Array } from './encoding'
import { uint8ArrayToArrayBuffer } from './encoding'

// ============================================================================
// Constants
// ============================================================================

/**
 * PBKDF2 iterations used when a payload does not say otherwise.
 *
 * Kept at 100,000 because that is what already-encrypted vaults were written
 * with, and because the value this replaced was documented as matching the web
 * wallet's own key derivation; raising it unilaterally would make vaults written
 * by this SDK unreadable to any reader still deriving with the old count. (The
 * wallet source in this workspace contains no PBKDF2 code, so that match is the
 * upstream claim, not something verified here.) It is below current guidance
 * (OWASP's Password Storage Cheat Sheet recommends 600,000 for PBKDF2-HMAC-SHA256),
 * so new deployments should pass `RECOMMENDED_PBKDF2_ITERATIONS` explicitly and
 * raise this default once every reader honours the `iterations` field recorded in
 * the payload.
 */
export const DEFAULT_PBKDF2_ITERATIONS = 100_000

/**
 * Iteration count recommended for new vaults. Payloads written with it carry the
 * count, so they decrypt without the caller having to remember it.
 */
export const RECOMMENDED_PBKDF2_ITERATIONS = 600_000

/**
 * Iteration count assumed for a payload that records none. Payloads produced
 * before the `iterations` field existed were all written with this value, so it is
 * the only safe assumption and must not change.
 */
const LEGACY_PBKDF2_ITERATIONS = 100_000

/** The only key derivation function this module implements. */
const KDF_PBKDF2_SHA256 = 'PBKDF2-SHA256'

/**
 * Salt length in bytes (128 bits)
 */
const SALT_LENGTH = 16

/**
 * IV length in bytes for AES-GCM (96 bits)
 */
const IV_LENGTH = 12

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Import password as a PBKDF2 key
 */
async function importPbkdf2Key(password: string): Promise<CryptoKey> {
	const enc = new TextEncoder()
	return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
}

/**
 * Derive a cryptographic key from a password using PBKDF2
 *
 * @param password - Password string
 * @param salt - Salt as Uint8Array or ArrayBuffer
 * @param iterations - Number of PBKDF2 iterations (default: DEFAULT_PBKDF2_ITERATIONS)
 * @returns Derived AES-GCM key
 */
export async function deriveKey(
	password: string,
	salt: Uint8Array | ArrayBuffer,
	iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
	if (!Number.isInteger(iterations) || iterations < 1) {
		throw new Error('PBKDF2 iterations must be a positive integer')
	}
	const baseKey = await importPbkdf2Key(password)
	const saltBuffer = salt instanceof Uint8Array ? uint8ArrayToArrayBuffer(salt) : salt

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: saltBuffer,
			iterations,
			hash: 'SHA-256'
		},
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	)
}

// ============================================================================
// Random Generation
// ============================================================================

/**
 * Generate a cryptographically secure random salt
 *
 * @returns Random salt (16 bytes)
 */
export function generateSalt(): Uint8Array {
	const salt = new Uint8Array(SALT_LENGTH)
	crypto.getRandomValues(salt)
	return salt
}

/**
 * Generate a cryptographically secure random initialization vector
 *
 * @returns Random IV (12 bytes)
 */
export function generateIV(): Uint8Array {
	const iv = new Uint8Array(IV_LENGTH)
	crypto.getRandomValues(iv)
	return iv
}

// ============================================================================
// Encryption/Decryption (Base64 encoding for payloads)
// ============================================================================

/**
 * Encrypted data payload (Base64 encoded)
 *
 * Uses Base64 encoding for binary payloads like vaults (more efficient than Base58).
 * Base58 is reserved for addresses, keys, and hashes.
 */
export interface EncryptedPayload {
	/** Encrypted data (Base64 encoded) */
	encryptedData: string
	/** Initialization vector (Base64 encoded) */
	iv: string
	/** Salt used for key derivation (Base64 encoded) */
	salt: string
	/**
	 * Key derivation function the payload was written with. Absent on payloads
	 * written before this field existed, which were all PBKDF2-SHA256.
	 */
	kdf?: string
	/**
	 * PBKDF2 iteration count the payload was written with.
	 *
	 * Without this field the format could not express the iteration count, so
	 * `deriveKey`'s `iterations` parameter was impossible to honour on the way back
	 * in: `decryptWithPassword` always derived with the default, and a payload
	 * encrypted with any other count failed with "Incorrect password or corrupted
	 * data" — blaming the user's password for a parameter mismatch. Absent means
	 * the legacy 100,000.
	 */
	iterations?: number
}

/**
 * Encrypt plaintext with a password using AES-GCM
 *
 * Uses PBKDF2 for key derivation and Base64 encoding for output.
 * Suitable for encrypting sensitive wallet data like private keys.
 *
 * **Encoding Standard**: Uses Base64 encoding for binary payloads (RFC 4648).
 * Base58 is used for addresses, keys, and hashes elsewhere in the SDK.
 *
 * @param plaintext - Plaintext string to encrypt
 * @param password - Password for encryption
 * @param iterations - PBKDF2 iterations to use; recorded in the payload so
 *   decryption can reproduce the key. Defaults to DEFAULT_PBKDF2_ITERATIONS.
 * @returns Encrypted payload with encryptedData, IV, salt (all Base64 encoded)
 *   and the KDF parameters used
 *
 * @example
 * ```ts
 * const encrypted = await encryptWithPassword('sensitive data', 'my-password')
 * // Store encrypted.encryptedData, encrypted.iv, encrypted.salt
 * ```
 */
export async function encryptWithPassword(
	plaintext: string,
	password: string,
	iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<EncryptedPayload> {
	const enc = new TextEncoder()
	const iv = generateIV()
	const salt = generateSalt()
	const key = await deriveKey(password, salt, iterations)

	const ivBuffer = uint8ArrayToArrayBuffer(iv)
	const encryptedBuf = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: ivBuffer },
		key,
		enc.encode(plaintext)
	)

	return {
		encryptedData: uint8ArrayToBase64(new Uint8Array(encryptedBuf)),
		iv: uint8ArrayToBase64(iv),
		salt: uint8ArrayToBase64(salt),
		// Recorded so decryptWithPassword can derive the same key without the
		// caller having to remember which parameters were used.
		kdf: KDF_PBKDF2_SHA256,
		iterations
	}
}

/**
 * Decrypt encrypted data with a password
 *
 * @param payload - Encrypted payload (Base64 encoded)
 * @param password - Password used for encryption
 * @returns Decrypted plaintext string
 * @throws {Error} If decryption fails (wrong password or corrupted data)
 *
 * @example
 * ```ts
 * const decrypted = await decryptWithPassword(encrypted, 'my-password')
 * ```
 */
export async function decryptWithPassword(
	payload: EncryptedPayload,
	password: string
): Promise<string> {
	const dec = new TextDecoder()
	// An unknown KDF is refused rather than silently decrypted as PBKDF2-SHA256:
	// the resulting failure would be reported as a wrong password.
	if (payload.kdf !== undefined && payload.kdf !== KDF_PBKDF2_SHA256) {
		throw new Error(`Unsupported key derivation function: ${payload.kdf}`)
	}
	const ivBytes = base64ToUint8Array(payload.iv)
	const saltBytes = base64ToUint8Array(payload.salt)
	const encryptedBytes = base64ToUint8Array(payload.encryptedData)

	// A payload that records its iteration count is derived with that count; one
	// that does not predates the field and used the legacy value.
	const iterations = payload.iterations ?? LEGACY_PBKDF2_ITERATIONS
	const key = await deriveKey(password, saltBytes, iterations)
	const iv = uint8ArrayToArrayBuffer(ivBytes)
	const encrypted = uint8ArrayToArrayBuffer(encryptedBytes)

	try {
		const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
		return dec.decode(plaintextBuf)
	} catch {
		throw new Error('Decryption failed. Incorrect password or corrupted data.')
	}
}
