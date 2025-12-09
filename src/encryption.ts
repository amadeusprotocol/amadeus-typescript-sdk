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
 * PBKDF2 iterations for key derivation (100,000 iterations for security)
 * Matches web wallet implementation for consistency
 */
const PBKDF2_ITERATIONS = 100_000

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
 * @param iterations - Number of PBKDF2 iterations (default: 100,000)
 * @returns Derived AES-GCM key
 */
export async function deriveKey(
	password: string,
	salt: Uint8Array | ArrayBuffer,
	iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
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
 * @returns Encrypted payload with encryptedData, IV, and salt (all Base64 encoded)
 *
 * @example
 * ```ts
 * const encrypted = await encryptWithPassword('sensitive data', 'my-password')
 * // Store encrypted.encryptedData, encrypted.iv, encrypted.salt
 * ```
 */
export async function encryptWithPassword(
	plaintext: string,
	password: string
): Promise<EncryptedPayload> {
	const enc = new TextEncoder()
	const iv = generateIV()
	const salt = generateSalt()
	const key = await deriveKey(password, salt)

	const ivBuffer = uint8ArrayToArrayBuffer(iv)
	const encryptedBuf = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: ivBuffer },
		key,
		enc.encode(plaintext)
	)

	return {
		encryptedData: uint8ArrayToBase64(new Uint8Array(encryptedBuf)),
		iv: uint8ArrayToBase64(iv),
		salt: uint8ArrayToBase64(salt)
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
	const ivBytes = base64ToUint8Array(payload.iv)
	const saltBytes = base64ToUint8Array(payload.salt)
	const encryptedBytes = base64ToUint8Array(payload.encryptedData)

	const key = await deriveKey(password, saltBytes)
	const iv = uint8ArrayToArrayBuffer(ivBytes)
	const encrypted = uint8ArrayToArrayBuffer(encryptedBytes)

	try {
		const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
		return dec.decode(plaintextBuf)
	} catch {
		throw new Error('Decryption failed. Incorrect password or corrupted data.')
	}
}
