/**
 * BIP39 Mnemonic Utilities for Amadeus Protocol
 *
 * This module provides BIP39 mnemonic generation, validation, and seed derivation
 * for use with Amadeus Protocol wallets.
 */

import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { AMADEUS_SEED_BYTE_LENGTH } from './constants'
import { deriveChildSKMultiple, deriveMasterSK, skToBytes } from './eip2333'
import { toBase58 } from './encoding'

/**
 * Amadeus HD derivation path (EIP-2333 BLS12-381), all hardened:
 * `m/12381'/36969'/0'/0'/0'`. 12381 is the BLS purpose (EIP-2334); 36969 is
 * the Amadeus SLIP-0044 coin type. This is the standard shared with the hub,
 * Prime Hub and cli-wallet, so a mnemonic resolves to the same account across
 * every Amadeus wallet.
 */
const AMADEUS_BLS_HD_PATH = [12381, 36969, 0, 0, 0]

/**
 * Generate a new 12-word BIP39 mnemonic
 *
 * @returns 12-word mnemonic phrase
 *
 * @example
 * ```ts
 * const mnemonic = generateMnemonic()
 * // "abandon ability able about above absent absorb abstract absurd abuse access accident"
 * ```
 */
export function generateMnemonic(): string {
	return bip39.generateMnemonic(wordlist, 128) // 128 bits = 12 words
}

/**
 * Validate a BIP39 mnemonic phrase
 *
 * @param mnemonic - Mnemonic phrase to validate
 * @returns true if the mnemonic is valid
 *
 * @example
 * ```ts
 * const isValid = validateMnemonic('abandon ability able ...')
 * ```
 */
export function validateMnemonic(mnemonic: string): boolean {
	return bip39.validateMnemonic(mnemonic.trim().toLowerCase(), wordlist)
}

/**
 * Derive an Amadeus seed (base58-encoded 64 bytes) from a BIP39 mnemonic.
 *
 * Uses the standard Amadeus HD derivation: the BIP39 seed is run through
 * EIP-2333 BLS12-381 key derivation along `m/12381'/36969'/0'/0'/0'` to get
 * the 32-byte BLS secret key. That key is then embedded little-endian into the
 * low 32 bytes of the returned 64-byte Amadeus seed, so the SDK's
 * {@link reduce512To256LE} recovers the exact same secret key — making the
 * derived account byte-identical to the hub, Prime Hub and cli-wallet.
 *
 * @param mnemonic - BIP39 mnemonic phrase
 * @returns Base58-encoded 64-byte seed
 *
 * @example
 * ```ts
 * const seed = mnemonicToSeedBase58('abandon ability able ...')
 * ```
 */
export function mnemonicToSeedBase58(mnemonic: string): string {
	const bip39Seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase())
	const masterSK = deriveMasterSK(new Uint8Array(bip39Seed))
	const skBigEndian = skToBytes(deriveChildSKMultiple(masterSK, AMADEUS_BLS_HD_PATH))

	// reduce512To256LE reads the seed little-endian, so storing sk little-endian
	// in the low 32 bytes (rest zero) round-trips back to the same sk.
	const seed64 = new Uint8Array(AMADEUS_SEED_BYTE_LENGTH)
	for (let i = 0; i < 32; i++) seed64[i] = skBigEndian[31 - i]
	return toBase58(seed64)
}

/**
 * Detect whether input is a mnemonic phrase or a raw private key.
 *
 * @param input - User input string
 * @returns 'mnemonic' if the input looks like a word-based mnemonic, or 'seed' if it looks like a base58-encoded key
 *
 * @example
 * ```ts
 * const type = detectInputType('abandon ability able ...')
 * // 'mnemonic'
 * ```
 */
export function detectInputType(input: string): 'mnemonic' | 'seed' {
	const trimmed = input.trim()
	const words = trimmed.split(/\s+/)
	// BIP39 mnemonics are 12 or 24 words
	if (words.length === 12 || words.length === 24) {
		// Check if all words look like English words (no numbers, no special chars)
		const allWords = words.every((w) => /^[a-zA-Z]+$/.test(w))
		if (allWords) return 'mnemonic'
	}
	return 'seed'
}

/**
 * Vault data format that supports both mnemonic and raw seed storage.
 * When decrypted, old vaults return a plain base58 string,
 * new vaults return a JSON string with this shape.
 */
export interface VaultSecretData {
	seed: string
	mnemonic?: string
}

/**
 * Encode vault secret data as a string for encryption.
 * Always stores as JSON to include the optional mnemonic.
 *
 * @param seed - Base58-encoded seed
 * @param mnemonic - Optional BIP39 mnemonic phrase
 * @returns JSON string for vault encryption
 *
 * @example
 * ```ts
 * const vaultData = encodeVaultSecret(seed, mnemonic)
 * const encrypted = await encryptWithPassword(vaultData, password)
 * ```
 */
export function encodeVaultSecret(seed: string, mnemonic?: string): string {
	const data: VaultSecretData = { seed }
	if (mnemonic) {
		data.mnemonic = mnemonic
	}
	return JSON.stringify(data)
}

/**
 * Decode vault secret data from a decrypted string.
 * Handles both old format (plain base58 seed) and new format (JSON with seed + mnemonic).
 *
 * @param decrypted - Decrypted vault string
 * @returns Parsed vault secret data
 *
 * @example
 * ```ts
 * const decrypted = await decryptWithPassword(encrypted, password)
 * const { seed, mnemonic } = decodeVaultSecret(decrypted)
 * ```
 */
export function decodeVaultSecret(decrypted: string): VaultSecretData {
	try {
		const parsed = JSON.parse(decrypted)
		if (parsed && typeof parsed.seed === 'string') {
			return {
				seed: parsed.seed,
				mnemonic: parsed.mnemonic || undefined
			}
		}
	} catch {
		// Not JSON — old format, plain base58 seed
	}
	return { seed: decrypted }
}
