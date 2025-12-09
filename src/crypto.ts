/**
 * Cryptographic Utilities for Amadeus Protocol
 *
 * This module provides cryptographic functions for key generation and BLS12-381 operations
 * used by the Amadeus protocol.
 */

import { bls12_381 as bls } from '@noble/curves/bls12-381'

import { AMADEUS_SEED_BYTE_LENGTH } from './constants'
import { toBase58, fromBase58 } from './encoding'

// Constant: BLS12-381 group order
const BLS12_381_ORDER = BigInt('0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001')

import type { KeyPair } from './types'

// ============================================================================
// BLS12-381 KEY OPERATIONS
// ============================================================================

/**
 * Reduce a 64-byte seed to a 32-byte private key compatible with BLS12-381
 *
 * @param bytes64 - 64-byte seed
 * @returns 32-byte private key
 * @throws Error if input is not exactly 64 bytes
 */
export function reduce512To256LE(bytes64: Uint8Array): Uint8Array {
	if (!(bytes64 instanceof Uint8Array) || bytes64.length !== AMADEUS_SEED_BYTE_LENGTH) {
		throw new Error('Expected 64-byte Uint8Array')
	}

	// Convert 64 bytes LE -> BigInt
	let x = BigInt(0)
	for (let i = 0; i < AMADEUS_SEED_BYTE_LENGTH; i++) {
		x += BigInt(bytes64[i]) << (BigInt(8) * BigInt(i))
	}

	// Reduce mod the group order
	x = x % BLS12_381_ORDER

	// Convert to 32-byte BIG-ENDIAN
	const out = new Uint8Array(32)
	for (let i = 31; i >= 0; i--) {
		out[i] = Number(x & BigInt(0xff))
		x >>= BigInt(8)
	}

	return out
}

/**
 * Derive a keypair from a 64-byte seed
 *
 * @param seed64 - 64-byte seed
 * @returns Tuple of [publicKey, privateKey] as Uint8Array
 *
 * @example
 * ```ts
 * const [pk, sk] = seed64ToKeypair(seed64)
 * ```
 */
export function seed64ToKeypair(seed64: Uint8Array): [Uint8Array, Uint8Array] {
	const sk = reduce512To256LE(seed64)
	const pk = bls.longSignatures.getPublicKey(sk).toBytes()
	return [pk, sk]
}

/**
 * Get public key from a 64-byte seed
 *
 * @param seed64 - 64-byte seed
 * @returns Public key as Uint8Array
 *
 * @example
 * ```ts
 * const publicKey = getPublicKey(seed64)
 * ```
 */
export function getPublicKey(seed64: Uint8Array): Uint8Array {
	const [pk] = seed64ToKeypair(seed64)
	return pk
}

/**
 * Derive secret key and seed64 from a Base58 encoded seed
 *
 * @param base58Seed64 - Base58 encoded 64-byte seed
 * @returns Object containing sk (secret key) and seed64
 * @throws Error if the seed is invalid
 *
 * @example
 * ```ts
 * const { sk, seed64 } = deriveSkAndSeed64FromBase58Seed(base58Seed)
 * ```
 */
export function deriveSkAndSeed64FromBase58Seed(base58Seed64: string): {
	sk: Uint8Array
	seed64: Uint8Array
} {
	const seed64 = fromBase58(base58Seed64)
	if (seed64.length !== AMADEUS_SEED_BYTE_LENGTH) {
		throw new Error('Invalid base58Seed: Must be 64 bytes (512 bits) long.')
	}
	const sk = reduce512To256LE(seed64)

	return {
		sk,
		seed64
	}
}

/**
 * Derive public key from a Base58 encoded seed
 *
 * @param base58Seed - Base58 encoded 64-byte seed
 * @returns Base58 encoded public key
 * @throws Error if the seed is invalid
 *
 * @example
 * ```ts
 * const publicKey = derivePublicKeyFromSeedBase58(base58Seed)
 * ```
 */
export function derivePublicKeyFromSeedBase58(base58Seed: string): string {
	if (!base58Seed) {
		throw new Error('Invalid base58Seed: Must be a non-empty base58 string.')
	}
	const seed64 = fromBase58(base58Seed)
	if (seed64.length !== AMADEUS_SEED_BYTE_LENGTH) {
		throw new Error('Invalid base58Seed: Must be 64 bytes (512 bits) long.')
	}
	const publicKey = getPublicKey(seed64)
	return toBase58(publicKey)
}

// ============================================================================
// KEY GENERATION
// ============================================================================

/**
 * Generate a cryptographically secure random private key (64-byte seed)
 *
 * @returns 64-byte seed as Uint8Array
 *
 * @example
 * ```ts
 * const seed = generatePrivateKey()
 * ```
 */
export function generatePrivateKey(): Uint8Array {
	const seed = new Uint8Array(AMADEUS_SEED_BYTE_LENGTH)
	crypto.getRandomValues(seed)
	return seed
}

/**
 * Generate a new keypair
 *
 * @returns KeyPair object with Base58 encoded publicKey and privateKey
 *
 * @example
 * ```ts
 * const keypair = generateKeypair()
 * console.log(keypair.publicKey)  // Base58 public key
 * console.log(keypair.privateKey)  // Base58 private key (seed)
 * ```
 */
export function generateKeypair(): KeyPair {
	const seed64 = generatePrivateKey()
	const [pk] = seed64ToKeypair(seed64)

	return {
		publicKey: toBase58(pk),
		privateKey: toBase58(seed64)
	}
}
