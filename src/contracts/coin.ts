/**
 * Coin Contract (Special Case)
 *
 * The Coin contract is a built-in native contract with no ABI file.
 * It differs from deployed (RISC-V) contracts:
 * - First arg (recipient) is raw binary Uint8Array from fromBase58(), not a UTF-8 string
 * - Amount is converted to exact atomic units with toAtomicAmaExact()
 *
 * This module provides a dedicated builder that handles these special encodings
 * while returning a standard ContractCall for uniform consumption by TransactionBuilder.
 */

import { toAtomicAmaExact } from '../conversion'
import { fromBase58 } from '../encoding'
import type { ContractCall } from './contract-call'

/**
 * Parameters for building a Coin transfer call
 */
export interface CoinTransferParams {
	/** Base58-encoded recipient address */
	recipient: string
	/** Amount in human-readable units (e.g. 10.5 or '10.5'); pass a string for exact large amounts */
	amount: number | string
	/** Token symbol (e.g. 'AMA') */
	symbol: string
}

/**
 * Build a Coin transfer ContractCall.
 *
 * Handles the special encoding requirements of the Coin contract:
 * - recipient is decoded from Base58 to raw Uint8Array
 * - amount is converted to exact atomic units via toAtomicAmaExact(), which throws on
 *   invalid, negative or over-precise amounts
 *
 * @example
 * ```ts
 * const call = buildCoinTransfer({
 *   recipient: '5Kd3N...',
 *   amount: 10.5,
 *   symbol: 'AMA'
 * })
 * TransactionBuilder.signCall(privateKey, call)
 * ```
 */
export function buildCoinTransfer(params: CoinTransferParams): ContractCall {
	return {
		contract: 'Coin',
		method: 'transfer',
		args: [
			fromBase58(params.recipient),
			toAtomicAmaExact(params.amount).toString(),
			params.symbol
		]
	}
}
