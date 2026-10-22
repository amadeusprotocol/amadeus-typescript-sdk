/**
 * BIP39 Mnemonic Utilities for Amadeus Protocol
 *
 * This module provides BIP39 mnemonic generation, validation, and seed derivation
 * for use with Amadeus Protocol wallets.
 */

import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { AMADEUS_SEED_BYTE_LENGTH } from './constants'
import { derivePublicKeyFromSeedBase58 } from './crypto'
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
 * Canonical form of a typed or pasted phrase: trimmed, lowercased, single-spaced.
 * scure/bip39 splits on single spaces, so store and compare phrases in this form.
 *
 * @example
 * ```ts
 * normalizeMnemonic('  Abandon\n abandon ... ABOUT ') // 'abandon abandon ... about'
 * ```
 */
export function normalizeMnemonic(mnemonic: string): string {
	return mnemonic.trim().toLowerCase().split(/\s+/).join(' ')
}

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
	return bip39.validateMnemonic(normalizeMnemonic(mnemonic), wordlist)
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
 * Changed in 1.4.0: earlier versions returned the raw 64-byte BIP39 seed, which
 * opens a different account for the same phrase. Use
 * {@link mnemonicToCandidateKeypairs} to recover wallets created that way.
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
	const bip39Seed = bip39.mnemonicToSeedSync(normalizeMnemonic(mnemonic))
	const masterSK = deriveMasterSK(new Uint8Array(bip39Seed))
	const skBigEndian = skToBytes(deriveChildSKMultiple(masterSK, AMADEUS_BLS_HD_PATH))

	// reduce512To256LE reads the seed little-endian, so storing sk little-endian
	// in the low 32 bytes (rest zero) round-trips back to the same sk.
	const seed64 = new Uint8Array(AMADEUS_SEED_BYTE_LENGTH)
	for (let i = 0; i < 32; i++) seed64[i] = skBigEndian[31 - i]
	return toBase58(seed64)
}

/**
 * The pre-1.4.0 Amadeus derivation: the raw 64-byte BIP39 seed is used directly
 * as the Amadeus seed (reduced mod the BLS order at sign time). Kept ONLY so
 * {@link mnemonicToCandidateKeypairs} can recognise wallets created by older
 * extension/app builds. Do not use for new wallets — it is non-standard and
 * does not match the hub / Prime Hub / cli-wallet.
 */
function legacyMnemonicToSeedBase58(mnemonic: string): string {
	return toBase58(new Uint8Array(bip39.mnemonicToSeedSync(normalizeMnemonic(mnemonic))))
}

/** An HD derivation scheme a mnemonic can resolve under. */
export type HdDerivation = 'eip2333' | 'legacy'

/**
 * A candidate account a mnemonic resolves to under one derivation scheme.
 * `seed` is a vault-compatible base58 64-byte seed (no vault format change);
 * `publicKey` is the base58 account address it opens.
 */
export interface MnemonicCandidate {
	derivation: HdDerivation
	seed: string
	publicKey: string
}

/**
 * Derive every account a mnemonic could belong to, so an importer can open the
 * one that actually has history instead of stranding the user on an empty
 * address.
 *
 * Returns the standard `eip2333` candidate first (the derivation every Amadeus
 * signer now uses — hub, Prime Hub, cli-wallet, and the wallet since the HD-path
 * fix) and the `legacy` candidate second (wallets created by pre-fix extension /
 * app builds). To choose which candidate to open on import, use
 * {@link resolveMnemonicImport}.
 *
 * This does NOT verify the BIP39 checksum or wordlist: a phrase with a typo
 * still derives two plausible-looking but wrong accounts. Call
 * {@link validateMnemonic} first, or use {@link resolveCandidateForAddress}
 * when the expected address is known.
 *
 * @param mnemonic - BIP39 mnemonic phrase
 * @returns Candidates, standard derivation first
 *
 * @example
 * ```ts
 * const [standard, legacy] = mnemonicToCandidateKeypairs(mnemonic)
 * ```
 */
export function mnemonicToCandidateKeypairs(mnemonic: string): MnemonicCandidate[] {
	const eip2333Seed = mnemonicToSeedBase58(mnemonic)
	const legacySeed = legacyMnemonicToSeedBase58(mnemonic)
	return [
		{
			derivation: 'eip2333',
			seed: eip2333Seed,
			publicKey: derivePublicKeyFromSeedBase58(eip2333Seed)
		},
		{
			derivation: 'legacy',
			seed: legacySeed,
			publicKey: derivePublicKeyFromSeedBase58(legacySeed)
		}
	]
}

/**
 * Find which derivation of a mnemonic opens a known address.
 *
 * Use this when the wallet address is known (e.g. copied from the wallet UI)
 * and you need the matching seed, for instance to sign an API token as that
 * account. The phrase is validated before deriving; the address is trimmed and
 * compared exactly, since base58 is case-sensitive.
 *
 * @param mnemonic - BIP39 mnemonic phrase
 * @param address - Base58 public key the mnemonic is expected to open
 * @returns The matching candidate, or `null` if neither derivation opens `address`
 * @throws Error if the mnemonic fails the BIP39 wordlist or checksum check
 *
 * @example
 * ```ts
 * const candidate = resolveCandidateForAddress(mnemonic, walletAddress)
 * if (!candidate) throw new Error('This phrase does not open that address')
 * console.log(candidate.derivation) // 'eip2333' or 'legacy'
 * ```
 */
export function resolveCandidateForAddress(
	mnemonic: string,
	address: string
): MnemonicCandidate | null {
	if (!validateMnemonic(mnemonic)) {
		throw new Error(
			'Invalid mnemonic: not a valid BIP39 phrase (unknown word, wrong word count or bad checksum)'
		)
	}
	const target = address.trim()
	return (
		mnemonicToCandidateKeypairs(mnemonic).find((candidate) => candidate.publicKey === target) ??
		null
	)
}

/**
 * Find which derivation of a mnemonic produced a stored seed.
 *
 * Use this for accounts saved with both a seed and its phrase but without a
 * recorded derivation, e.g. to tell a user that the phrase opens a different
 * address in other wallets. The seed is compared exactly. The phrase is not
 * validated: a malformed phrase (e.g. a wrong word count) cannot have derived a
 * stored seed, so it returns `null` instead of throwing.
 *
 * @param mnemonic - BIP39 mnemonic phrase
 * @param seed - Base58 64-byte seed, as stored in the vault
 * @returns `'eip2333'` or `'legacy'`, or `null` if neither derivation produces `seed`
 *   or the phrase cannot be derived
 *
 * @example
 * ```ts
 * const derivation = derivationForSeed(account.mnemonic, account.seed)
 * if (derivation === 'legacy') showLegacyNotice()
 * ```
 */
export function derivationForSeed(mnemonic: string, seed: string): HdDerivation | null {
	let candidates: MnemonicCandidate[]
	try {
		candidates = mnemonicToCandidateKeypairs(mnemonic)
	} catch {
		return null
	}
	return candidates.find((candidate) => candidate.seed === seed)?.derivation ?? null
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
