import { bls12_381 as bls } from '@noble/curves/bls12-381'
import { describe, expect, it, vi } from 'vitest'

import { deriveSkAndSeed64FromBase58Seed, generateKeypair, getPublicKey } from './crypto'
import { fromBase58 } from './encoding'
import { NetworkType } from './networks'
import { decode } from './serialization'
import { buildUnsigned, signContractCall, signUnsigned, txDstForNetwork } from './signing'

const MAINNET_DST = 'AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_TX_'
const TESTNET_DST = 'AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_TX_TESTNET_'

/** Pull a top-level field (value is a Uint8Array) out of a packed tx envelope. */
function fieldOf(packed: Uint8Array, name: string): Uint8Array {
	const map = decode(packed) as Map<unknown, unknown>
	for (const [k, v] of map) {
		const key = new TextDecoder().decode(k as Uint8Array)
		if (key === name) return v as Uint8Array
	}
	throw new Error(`field ${name} not found`)
}

function signatureVerifiesUnder(packed: Uint8Array, signerPk: Uint8Array, dst: string): boolean {
	const signature = fieldOf(packed, 'signature')
	const hash = fieldOf(packed, 'hash')
	return bls.verify(signature, hash, signerPk, { DST: dst })
}

describe('txDstForNetwork', () => {
	it('maps testnet to the testnet DST and everything else to mainnet', () => {
		expect(txDstForNetwork(NetworkType.TESTNET)).toBe(TESTNET_DST)
		expect(txDstForNetwork(NetworkType.MAINNET)).toBe(MAINNET_DST)
		expect(txDstForNetwork(NetworkType.CUSTOM)).toBe(MAINNET_DST)
		expect(txDstForNetwork(undefined)).toBe(MAINNET_DST)
	})
})

describe('signUnsigned network binding', () => {
	const kp = generateKeypair()
	const { seed64, sk } = deriveSkAndSeed64FromBase58Seed(kp.privateKey)
	const signerPk = getPublicKey(seed64)
	const unsigned = buildUnsigned(signerPk, 'Coin', 'transfer', [
		fromBase58(kp.publicKey),
		'AMA',
		1000n
	])

	it('defaults to mainnet (byte-identical to explicit mainnet)', () => {
		const def = signUnsigned(unsigned, sk)
		const main = signUnsigned(unsigned, sk, NetworkType.MAINNET)
		expect(Buffer.from(def.txPacked)).toEqual(Buffer.from(main.txPacked))
	})

	it('testnet produces a different signature that only verifies under the testnet DST', () => {
		const main = signUnsigned(unsigned, sk, NetworkType.MAINNET)
		const test = signUnsigned(unsigned, sk, NetworkType.TESTNET)

		// Same tx + hash, different signature — the only difference is the DST.
		expect(Buffer.from(fieldOf(test.txPacked, 'hash'))).toEqual(
			Buffer.from(fieldOf(main.txPacked, 'hash'))
		)
		expect(Buffer.from(fieldOf(test.txPacked, 'signature'))).not.toEqual(
			Buffer.from(fieldOf(main.txPacked, 'signature'))
		)

		// Each signature verifies under its own DST and is rejected under the other —
		// this is what makes a testnet tx unreplayable on mainnet and vice versa.
		expect(signatureVerifiesUnder(main.txPacked, signerPk, MAINNET_DST)).toBe(true)
		expect(signatureVerifiesUnder(main.txPacked, signerPk, TESTNET_DST)).toBe(false)
		expect(signatureVerifiesUnder(test.txPacked, signerPk, TESTNET_DST)).toBe(true)
		expect(signatureVerifiesUnder(test.txPacked, signerPk, MAINNET_DST)).toBe(false)
	})
})

describe('signContractCall network binding', () => {
	const kp = generateKeypair()
	const { seed64 } = deriveSkAndSeed64FromBase58Seed(kp.privateKey)
	const signerPk = getPublicKey(seed64)
	const call = {
		contract: 'Coin',
		method: 'transfer',
		args: [fromBase58(kp.publicKey), 'AMA', 1000n]
	}

	it('signs with the requested network DST', () => {
		const test = signContractCall(kp.privateKey, call, NetworkType.TESTNET)
		expect(signatureVerifiesUnder(test.txPacked, signerPk, TESTNET_DST)).toBe(true)
		expect(signatureVerifiesUnder(test.txPacked, signerPk, MAINNET_DST)).toBe(false)
	})
})

describe('transaction nonces', () => {
	// Signing costs ~13ms per tx and would spread the loop across milliseconds, hiding collisions
	it('stay unique and strictly increasing for 1000 txs built in a tight loop', () => {
		const signerPk = fromBase58(generateKeypair().publicKey)
		const nonces = Array.from(
			{ length: 1000 },
			() => buildUnsigned(signerPk, 'Coin', 'transfer', []).tx.nonce
		)

		expect(new Set(nonces).size).toBe(1000)
		nonces.slice(1).forEach((nonce, index) => expect(nonce).toBeGreaterThan(nonces[index]))
	})

	it('differ between signed txs made in the same millisecond', () => {
		const { privateKey } = generateKeypair()
		const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now())
		const nonces = Array.from({ length: 5 }, () => {
			const { txPacked } = signContractCall(privateKey, {
				contract: 'Coin',
				method: 'transfer',
				args: []
			})
			const tx = decode(txPacked) as Map<Uint8Array, unknown>
			const fields = [...tx].find(([key]) => new TextDecoder().decode(key) === 'tx')?.[1]
			return [...(fields as Map<Uint8Array, unknown>)].find(
				([key]) => new TextDecoder().decode(key) === 'nonce'
			)?.[1] as bigint
		})
		clock.mockRestore()

		nonces.slice(1).forEach((nonce, index) => expect(nonce).toBeGreaterThan(nonces[index]))
	})

	it('follow the clock once it moves past the last nonce', () => {
		const signerPk = fromBase58(generateKeypair().publicKey)
		const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_000)
		const nonce = buildUnsigned(signerPk, 'Coin', 'transfer', []).tx.nonce
		const expected = BigInt(Date.now()) * 1_000_000n
		clock.mockRestore()

		expect(nonce).toBe(expected)
	})
})
