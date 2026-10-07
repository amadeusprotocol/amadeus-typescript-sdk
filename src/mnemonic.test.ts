import { bls12_381 as bls } from '@noble/curves/bls12-381'
import * as bip39 from '@scure/bip39'
import { describe, expect, it } from 'vitest'

import { deriveSkAndSeed64FromBase58Seed, getPublicKey } from './crypto'
import { toBase58 } from './encoding'
import { deriveChildSK, deriveChildSKMultiple, deriveMasterSK, skToBytes } from './eip2333'
import { mnemonicToSeedBase58, validateMnemonic } from './mnemonic'

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
