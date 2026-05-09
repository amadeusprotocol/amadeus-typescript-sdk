/**
 * Transaction API
 *
 * Provides methods for submitting transactions and querying transaction data
 */

import type { AmadeusClient } from '../client'
import type {
	SubmitTransactionResponse,
	SubmitAndWaitTransactionResponse,
	SubmitAndWaitOptions,
	GetTransactionsInEntryResponse,
	Transaction
} from '../types'
import { Base58HashSchema, TransactionDataSchema } from '../schemas'
import { validate } from '../validation'

export class TransactionAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Submit a transaction to the network
	 *
	 * @param txPacked - Packed transaction as Uint8Array or Base58 string
	 * @returns Promise resolving to submission result
	 * @throws {AmadeusSDKError} If transaction data is invalid
	 *
	 * @example
	 * ```ts
	 * const result = await sdk.transaction.submit(txPacked)
	 * if (result.error === 'ok') {
	 *   console.log('Transaction hash:', result.hash)
	 * }
	 * ```
	 */
	async submit(txPacked: Uint8Array | string): Promise<SubmitTransactionResponse> {
		validate(TransactionDataSchema, txPacked)
		return this.client.post<SubmitTransactionResponse>('/api/tx/submit', txPacked)
	}

	/**
	 * Submit a transaction and wait for confirmation.
	 *
	 * Pass `{ finalized: true }` to wait for finality (consensus reached) instead
	 * of just confirmation. Default behavior is to return as soon as the tx is
	 * included in an entry.
	 *
	 * @example
	 * ```ts
	 * // Wait for confirmation only (fast)
	 * const result = await sdk.transaction.submitAndWait(txPacked)
	 *
	 * // Wait for finality (slower but stronger guarantee)
	 * const finalized = await sdk.transaction.submitAndWait(txPacked, { finalized: true })
	 * ```
	 */
	async submitAndWait(
		txPacked: Uint8Array | string,
		options: SubmitAndWaitOptions = {}
	): Promise<SubmitAndWaitTransactionResponse> {
		validate(TransactionDataSchema, txPacked)
		const endpoint = options.finalized
			? '/api/tx/submit_and_wait?finalized=true'
			: '/api/tx/submit_and_wait'
		return this.client.post<SubmitAndWaitTransactionResponse>(endpoint, txPacked)
	}

	/**
	 * Get transaction by ID
	 *
	 * @param txid - Transaction ID (Base58 encoded)
	 * @returns Promise resolving to transaction data
	 * @throws {AmadeusSDKError} If transaction ID is invalid
	 *
	 * @example
	 * ```ts
	 * const tx = await sdk.transaction.get('5Kd3N...')
	 * ```
	 */
	async get(txid: string): Promise<Transaction> {
		validate(Base58HashSchema, txid)
		return this.client.get<Transaction>(`/api/chain/tx/${txid}`)
	}

	/**
	 * Get transactions by entry hash
	 *
	 * @param entryHash - Entry hash (Base58 encoded)
	 * @returns Promise resolving to transactions in the entry
	 * @throws {AmadeusSDKError} If entry hash is invalid
	 *
	 * @example
	 * ```ts
	 * const { txs } = await sdk.transaction.getByEntry('5Kd3N...')
	 * ```
	 */
	async getByEntry(entryHash: string): Promise<GetTransactionsInEntryResponse> {
		validate(Base58HashSchema, entryHash)
		return this.client.get<GetTransactionsInEntryResponse>(
			`/api/chain/txs_in_entry/${entryHash}`
		)
	}
}
