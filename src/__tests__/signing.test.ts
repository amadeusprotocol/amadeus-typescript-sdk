import { describe, it, expect, vi } from 'vitest'

import { generatePrivateKey, seed64ToKeypair } from '../crypto'
import { toBase58 } from '../encoding'
import { buildUnsigned, normalizeSignerSk, signUnsigned } from '../signing'

const ARGS = ['destination', '1000000000', 'AMA']

describe('signing', () => {
	// Date.now() only has millisecond resolution, so two transactions built inside
	// the same millisecond used to receive the same nonce — and with it the same
	// encoded bytes, the same hash and the same txHash, which the chain cannot
	// tell apart from a resubmission of the first transaction.
	describe('nonce generation', () => {
		it('never issues the same nonce twice inside one millisecond', () => {
			const [pk] = seed64ToKeypair(generatePrivateKey())
			const clock = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
			try {
				const a = buildUnsigned(pk, 'Coin', 'transfer', ARGS)
				const b = buildUnsigned(pk, 'Coin', 'transfer', ARGS)
				expect(b.tx.nonce > a.tx.nonce).toBe(true)
				expect(Buffer.from(b.hash)).not.toEqual(Buffer.from(a.hash))
			} finally {
				clock.mockRestore()
			}
		})

		it('keeps nonces increasing when the clock steps backwards', () => {
			const [pk] = seed64ToKeypair(generatePrivateKey())
			const clock = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
			try {
				const a = buildUnsigned(pk, 'Coin', 'transfer', ARGS)
				clock.mockReturnValue(1_600_000_000_000)
				const b = buildUnsigned(pk, 'Coin', 'transfer', ARGS)
				expect(b.tx.nonce > a.tx.nonce).toBe(true)
			} finally {
				clock.mockRestore()
			}
		})
	})

	describe('normalizeSignerSk', () => {
		it('treats a 64-byte seed the same whether it arrives as Base58 or as bytes', () => {
			const seed64 = generatePrivateKey()
			const [pk, sk32] = seed64ToKeypair(seed64)

			expect(normalizeSignerSk(toBase58(seed64))).toEqual(sk32)
			// The byte form previously reached bls.sign unreduced, which rejected it
			// with "invalid private key: expected ui8a of size 32" — even though
			// generatePrivateKey() returns exactly these 64 bytes.
			expect(normalizeSignerSk(seed64)).toEqual(sk32)

			const unsigned = buildUnsigned(pk, 'Coin', 'transfer', ARGS)
			const viaBase58 = signUnsigned(unsigned, toBase58(seed64))
			const viaBytes = signUnsigned(unsigned, seed64)
			expect(viaBytes.txPacked).toEqual(viaBase58.txPacked)
			expect(viaBytes.txHash).toBe(viaBase58.txHash)
		})

		it('passes an already-derived 32-byte scalar through unchanged', () => {
			const [, sk32] = seed64ToKeypair(generatePrivateKey())
			expect(normalizeSignerSk(sk32)).toBe(sk32)
		})

		it('rejects a byte length that cannot be a key', () => {
			expect(() => normalizeSignerSk(new Uint8Array(7))).toThrow(
				/expected 32-byte scalar or 64-byte seed, got 7 bytes/
			)
		})
	})
})
