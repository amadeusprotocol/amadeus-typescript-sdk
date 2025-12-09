import { describe, it, expect } from 'vitest'
import {
	generateKeypair,
	generatePrivateKey,
	getPublicKey,
	derivePublicKeyFromSeedBase58,
	deriveSkAndSeed64FromBase58Seed,
	seed64ToKeypair
} from '../crypto'
import { toBase58 } from '../encoding'
import { AMADEUS_SEED_BYTE_LENGTH, AMADEUS_PUBLIC_KEY_BYTE_LENGTH } from '../constants'

describe('Crypto Utilities', () => {
	describe('Key Generation', () => {
		it('generates a valid private key', () => {
			const seed = generatePrivateKey()

			expect(seed).toBeInstanceOf(Uint8Array)
			expect(seed.length).toBe(AMADEUS_SEED_BYTE_LENGTH)
		})

		it('generates a valid keypair', () => {
			const keypair = generateKeypair()

			expect(keypair).toHaveProperty('publicKey')
			expect(keypair).toHaveProperty('privateKey')
			expect(keypair.publicKey).toBeTypeOf('string')
			expect(keypair.privateKey).toBeTypeOf('string')
			expect(keypair.publicKey.length).toBeGreaterThan(0)
			expect(keypair.privateKey.length).toBeGreaterThan(0)
		})

		it('generates different keypairs each time', () => {
			const keypair1 = generateKeypair()
			const keypair2 = generateKeypair()

			expect(keypair1.publicKey).not.toBe(keypair2.publicKey)
			expect(keypair1.privateKey).not.toBe(keypair2.privateKey)
		})
	})

	describe('Key Derivation', () => {
		it('derives public key from seed', () => {
			const seed = generatePrivateKey()
			const publicKey = getPublicKey(seed)

			expect(publicKey).toBeInstanceOf(Uint8Array)
			expect(publicKey.length).toBe(AMADEUS_PUBLIC_KEY_BYTE_LENGTH)
		})

		it('derives keypair from seed64', () => {
			const seed64 = generatePrivateKey()
			const [pk, sk] = seed64ToKeypair(seed64)

			expect(pk).toBeInstanceOf(Uint8Array)
			expect(sk).toBeInstanceOf(Uint8Array)
			expect(pk.length).toBe(AMADEUS_PUBLIC_KEY_BYTE_LENGTH)
			expect(sk.length).toBe(32)
		})

		it('derives public key from Base58 seed', () => {
			const keypair = generateKeypair()
			const derivedPublicKey = derivePublicKeyFromSeedBase58(keypair.privateKey)

			expect(derivedPublicKey).toBe(keypair.publicKey)
		})

		it('derives sk and seed64 from Base58 seed', () => {
			const keypair = generateKeypair()
			const { sk, seed64 } = deriveSkAndSeed64FromBase58Seed(keypair.privateKey)

			expect(sk).toBeInstanceOf(Uint8Array)
			expect(seed64).toBeInstanceOf(Uint8Array)
			expect(sk.length).toBe(32)
			expect(seed64.length).toBe(AMADEUS_SEED_BYTE_LENGTH)
		})

		it('throws on invalid Base58 seed', () => {
			expect(() => derivePublicKeyFromSeedBase58('invalid')).toThrow()
			expect(() => deriveSkAndSeed64FromBase58Seed('invalid')).toThrow()
		})

		it('throws on wrong length seed', () => {
			const shortSeed = toBase58(new Uint8Array(32))
			expect(() => derivePublicKeyFromSeedBase58(shortSeed)).toThrow()
		})
	})
})
