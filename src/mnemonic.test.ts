import { bls12_381 as bls } from '@noble/curves/bls12-381'
import * as bip39 from '@scure/bip39'
import { describe, expect, it } from 'vitest'

import { deriveSkAndSeed64FromBase58Seed, getPublicKey, secretKeyToSeedBase58 } from './crypto'
import { fromBase58, toBase58 } from './encoding'
import { deriveChildSK, deriveChildSKMultiple, deriveMasterSK, skToBytes } from './eip2333'
import { mnemonicToCandidateKeypairs, mnemonicToSeedBase58, validateMnemonic } from './mnemonic'

const hex = (s: string) => Uint8Array.from((s.match(/../g) ?? []).map((b) => parseInt(b, 16)))
const toHex = (u: Uint8Array) => Buffer.from(u).toString('hex')

const AMADEUS_BLS_HD_PATH = [12381, 36969, 0, 0, 0]

describe('EIP-2333 derivation (official test vectors)', () => {
	// https://eips.ethereum.org/EIPS/eip-2333#test-cases
	const cases = [
		{
			seed: 'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04',
			master:
				6083874454709270928345386274498605044986640685124978867557563392430687146096n,
			index: 0,
			child: 20397789859736650942317412262472558107875392172444076792671091975210932703118n
		},
		{
			seed: 'd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
			master:
				19022158461524446591288038168518313374041767046816487870552872741050760015818n,
			index: 42,
			child: 31372231650479070279774297061823572166496564838472787488249775572789064611981n
		}
	]

	for (const c of cases) {
		it(`matches the spec for index ${c.index}`, () => {
			const master = deriveMasterSK(hex(c.seed))
			expect(master).toBe(c.master)
			expect(deriveChildSK(master, c.index)).toBe(c.child)
		})
	}
})

describe('mnemonicToSeedBase58', () => {
	const MNEMONIC =
		'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

	it('is deterministic and normalizes case/whitespace', () => {
		const a = mnemonicToSeedBase58(MNEMONIC)
		expect(mnemonicToSeedBase58(`  ${MNEMONIC.toUpperCase()}  `)).toBe(a)
		expect(validateMnemonic(MNEMONIC)).toBe(true)
	})

	it('derives the SDK seed so it recovers the EIP-2333 BLS key (hub / Prime Hub / cli-wallet standard)', () => {
		// Independent reference: exactly what @/utils/blsWallet.ts does in the hubs.
		const refSeed = bip39.mnemonicToSeedSync(MNEMONIC)
		const refSk = skToBytes(
			deriveChildSKMultiple(deriveMasterSK(new Uint8Array(refSeed)), AMADEUS_BLS_HD_PATH)
		)
		const refPk = bls.getPublicKey(refSk)

		// What the SDK produces, run through the real signing pipeline.
		const seedB58 = mnemonicToSeedBase58(MNEMONIC)
		const { sk } = deriveSkAndSeed64FromBase58Seed(seedB58)
		const pk = getPublicKey(deriveSkAndSeed64FromBase58Seed(seedB58).seed64)

		expect(toHex(sk)).toBe(toHex(refSk))
		expect(toHex(pk)).toBe(toHex(refPk))
	})

	it('produces the expected frozen public key (regression guard)', () => {
		const seedB58 = mnemonicToSeedBase58(MNEMONIC)
		const pk = getPublicKey(deriveSkAndSeed64FromBase58Seed(seedB58).seed64)
		expect(toHex(pk)).toBe(
			'b598b45e8c846e57bd6b220726db54af982cf66d04e65537a84a7d62e67b3aebc3a3d9b28b5a524790b32fdaaa0fe9ba'
		)
	})

	it('returns a base58-encoded 64-byte seed', () => {
		const { seed64 } = deriveSkAndSeed64FromBase58Seed(mnemonicToSeedBase58(MNEMONIC))
		expect(seed64.length).toBe(64)
		// sk lives little-endian in the low 32 bytes; the high 32 are zero padding.
		expect(toHex(seed64.slice(32))).toBe('0'.repeat(64))
	})

	it('keeps the round-trip stable through base58', () => {
		const seedB58 = mnemonicToSeedBase58(MNEMONIC)
		const { seed64 } = deriveSkAndSeed64FromBase58Seed(seedB58)
		expect(toBase58(seed64)).toBe(seedB58)
	})
})

describe('mnemonicToCandidateKeypairs', () => {
	const MNEMONIC =
		'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

	it('returns the standard (eip2333) candidate first, legacy second', () => {
		const [a, b] = mnemonicToCandidateKeypairs(MNEMONIC)
		expect(a.derivation).toBe('eip2333')
		expect(b.derivation).toBe('legacy')
	})

	it('standard candidate matches the hub / EIP-2333 account', () => {
		const [std] = mnemonicToCandidateKeypairs(MNEMONIC)
		expect(std.seed).toBe(mnemonicToSeedBase58(MNEMONIC))
		expect(toHex(fromBase58(std.publicKey))).toBe(
			'b598b45e8c846e57bd6b220726db54af982cf66d04e65537a84a7d62e67b3aebc3a3d9b28b5a524790b32fdaaa0fe9ba'
		)
	})

	it('legacy candidate reproduces the pre-fix (raw BIP39 seed) account', () => {
		const [, legacy] = mnemonicToCandidateKeypairs(MNEMONIC)
		const bip39Seed = new Uint8Array(bip39.mnemonicToSeedSync(MNEMONIC))
		expect(legacy.seed).toBe(toBase58(bip39Seed))
		expect(toHex(fromBase58(legacy.publicKey))).toBe(toHex(getPublicKey(bip39Seed)))
	})

	it('the two candidates are different accounts (the whole point)', () => {
		const [std, legacy] = mnemonicToCandidateKeypairs(MNEMONIC)
		expect(std.publicKey).not.toBe(legacy.publicKey)
		expect(std.seed).not.toBe(legacy.seed)
	})

	it('both candidate seeds are vault-compatible 64-byte base58', () => {
		for (const c of mnemonicToCandidateKeypairs(MNEMONIC)) {
			expect(fromBase58(c.seed).length).toBe(64)
		}
	})
})

describe('secretKeyToSeedBase58 (raw 32-byte key import)', () => {
	const MNEMONIC =
		'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

	it('imports a raw 32-byte BLS key to the account it signs as', () => {
		// A hub / Google export is the raw EIP-2333 secret key (32-byte big-endian).
		const sk = skToBytes(
			deriveChildSKMultiple(
				deriveMasterSK(new Uint8Array(bip39.mnemonicToSeedSync(MNEMONIC))),
				[12381, 36969, 0, 0, 0]
			)
		)
		const seed = secretKeyToSeedBase58(sk)
		const { seed64 } = deriveSkAndSeed64FromBase58Seed(seed)
		const [std] = mnemonicToCandidateKeypairs(MNEMONIC)
		expect(toBase58(getPublicKey(seed64))).toBe(std.publicKey)
	})

	it('rejects a key that is not 32 bytes', () => {
		expect(() => secretKeyToSeedBase58(new Uint8Array(31))).toThrow()
		expect(() => secretKeyToSeedBase58(new Uint8Array(64))).toThrow()
	})
})
