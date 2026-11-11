import { describe, it, expect } from 'vitest'
import { AMA_TOKEN_DECIMALS_MULTIPLIER, AMA_TRANSFER_FEE } from '../constants'
import { TransactionBuilder } from '../transaction-builder'
import { generateKeypair } from '../crypto'
import { fromBase58 } from '../encoding'
import { encode } from '../serialization'

// Node protocol.rs values, in atomic units
const TX_BUDGET = 10_000_000
const TX_EXEC_LOCK = 2_000_000
const COST_PER_BYTE_HISTORICAL = 1_111

describe('AMA_TRANSFER_FEE', () => {
	it('stays 0.02 AMA, which wallets hold back', () => {
		expect(AMA_TRANSFER_FEE).toBe(0.02)
	})

	it('covers the per-tx budget the chain locks', () => {
		expect(AMA_TRANSFER_FEE * AMA_TOKEN_DECIMALS_MULTIPLIER).toBeGreaterThanOrEqual(TX_BUDGET)
	})

	it('a standard transfer fits the budget with room for storage', () => {
		const signer = generateKeypair()
		const recipient = generateKeypair()
		const amounts = [0.000000001, 1.5, 999999999]
		const historyCosts = amounts.map((amount) => {
			const unsigned = TransactionBuilder.buildTransfer(
				{ recipient: recipient.publicKey, amount, symbol: 'AMA' },
				fromBase58(signer.publicKey)
			)
			return encode(unsigned.tx).length * COST_PER_BYTE_HISTORICAL
		})

		historyCosts.forEach((historyCost) => {
			expect(historyCost + TX_EXEC_LOCK).toBeLessThan(TX_BUDGET / 2)
		})
	})
})
