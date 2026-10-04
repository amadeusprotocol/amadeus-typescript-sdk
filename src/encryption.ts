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
 * PBKDF2 iterations used when a payload does not specify otherwise.
 *
 * Retained at 100,000 for cross-wallet ecosystem synchronization. Mobile clients
 * enforce conservative bounds, so bumping the default requires a coordinated rollout.
 */
export const DEFAULT_PBKDF2_ITERATIONS = 100_000

/**
 * Iteration count assumed for a legacy payload that records no metadata.
 */
const LEGACY_PBKDF2_ITERATIONS = 100_000

/**
 * Maximum permitted PBKDF2 iteration count.
 *
 * Defends against CPU exhaustion and browser UI freezes caused by tampered,
 * unauthenticated payload headers (e.g. malicious payloads claiming 2,000,000,000 iterations).
 */
export const MAX_PBKDF2_ITERATIONS = 10_000_000

/**
 * Minimum permitted PBKDF2 iteration count.
 */
export const MIN_PBKDF2_ITERATIONS = 1_000

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
	if (
		!Number.isInteger(iterations) ||
		iterations < MIN_PBKDF2_ITERATIONS ||
		iterations > MAX_PBKDF2_ITERATIONS
	) {
		throw new Error(
			`PBKDF2 iterations must be an integer between ${MIN_PBKDF2_ITERATIONS} and ${MAX_PBKDF2_ITERATIONS}`
		)
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
 */
export interface EncryptedPayload {
	/** Encrypted data (Base64 encoded) */
	encryptedData: string
	/** Initialization vector (Base64 encoded) */
	iv: string
	/** Salt used for key derivation (Base64 encoded) */
	salt: string
	/** Key derivation function algorithm */
	kdf?: string
	/** PBKDF2 iteration count */
	iterations?: number
}

/**
 * Encrypt plaintext with a password using AES-GCM
 *
 * @param plaintext - Plaintext string to encrypt
 * @param password - Password for encryption
 * @param iterations - PBKDF2 iterations to use; recorded in payload. Defaults to DEFAULT_PBKDF2_ITERATIONS (100,000).
 * @returns Encrypted payload
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
 * @throws {Error} If decryption fails, an unsupported KDF is provided, or iterations exceed safety limits
 */
export async function decryptWithPassword(
	payload: EncryptedPayload,
	password: string
): Promise<string> {
	const dec = new TextDecoder()

	if (payload.kdf !== undefined && payload.kdf !== KDF_PBKDF2_SHA256) {
		throw new Error(`Unsupported key derivation function: ${payload.kdf}`)
	}

	const iterations = payload.iterations ?? LEGACY_PBKDF2_ITERATIONS
	if (
		typeof iterations !== 'number' ||
		!Number.isInteger(iterations) ||
		iterations < MIN_PBKDF2_ITERATIONS ||
		iterations > MAX_PBKDF2_ITERATIONS
	) {
		throw new Error(
			`Invalid or unsafe PBKDF2 iteration count: ${iterations}. Maximum allowed is ${MAX_PBKDF2_ITERATIONS}.`
		)
	}

	const ivBytes = base64ToUint8Array(payload.iv)
	const saltBytes = base64ToUint8Array(payload.salt)
	const encryptedBytes = base64ToUint8Array(payload.encryptedData)

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
