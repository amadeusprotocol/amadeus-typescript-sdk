import { bls12_381 as bls } from '@noble/curves/bls12-381'
import { describe, expect, it } from 'vitest'

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
