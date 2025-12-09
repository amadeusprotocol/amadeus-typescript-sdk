/**
 * Chain API
 *
 * Provides methods for querying blockchain data
 */

import type { AmadeusClient } from '../client'
import type {
	TransactionFilters,
	GetTipResponse,
	GetStatsResponse,
	GetByHashResponse,
	GetByHeightResponse,
	GetTransactionsInEntryResponse,
	GetTransactionEventsByAccountResponse,
	Transaction
} from '../types'
import { Base58HashSchema, TransactionFiltersSchema } from '../schemas'
import { Schema } from 'effect'
import { validate } from '../validation'

export class ChainAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Get the current chain tip (latest entry)
	 *
	 * @returns Promise resolving to the latest chain entry
	 *
	 * @example
	 * ```ts
	 * const { entry } = await sdk.chain.getTip()
	 * console.log('Current height:', entry.height)
	 * ```
	 */
	async getTip(): Promise<GetTipResponse> {
		return this.client.get<GetTipResponse>('/api/chain/tip')
	}

	/**
	 * Get chain statistics
	 *
	 * @returns Promise resolving to chain statistics
	 *
	 * @example
	 * ```ts
	 * const { stats } = await sdk.chain.getStats()
	 * console.log('Total entries:', stats.total_entries)
	 * ```
	 */
	async getStats(): Promise<GetStatsResponse> {
		return this.client.get<GetStatsResponse>('/api/chain/stats')
	}

	/**
	 * Get entry by hash
	 *
	 * @param hash - Entry hash (Base58 encoded)
	 * @param filterOnFunction - Optional function filter
	 * @returns Promise resolving to chain entry
	 * @throws {Error} If hash is invalid
	 *
	 * @example
	 * ```ts
	 * const { entry } = await sdk.chain.getByHash('5Kd3N...')
	 * ```
	 */
	async getByHash(hash: string, filterOnFunction?: string): Promise<GetByHashResponse> {
		validate(Base58HashSchema, hash)
		return this.client.get<GetByHashResponse>(`/api/chain/hash/${hash}`, {
			filter_on_function: filterOnFunction
		})
	}

	/**
	 * Get entries by height
	 *
	 * @param height - Block height (must be >= 0)
	 * @returns Promise resolving to chain entries at the specified height
	 * @throws {Error} If height is invalid
	 *
	 * @example
	 * ```ts
	 * const { entries } = await sdk.chain.getByHeight(1000)
	 * ```
	 */
	async getByHeight(height: number): Promise<GetByHeightResponse> {
		validate(Schema.NonNegativeInt, height)
		return this.client.get<GetByHeightResponse>(`/api/chain/height/${height}`)
	}

	/**
	 * Get entries by height with transactions
	 *
	 * @param height - Block height (must be >= 0)
	 * @returns Promise resolving to chain entries with transactions at the specified height
	 * @throws {Error} If height is invalid
	 *
	 * @example
	 * ```ts
	 * const { entries } = await sdk.chain.getByHeightWithTxs(1000)
	 * ```
	 */
	async getByHeightWithTxs(height: number): Promise<GetByHeightResponse> {
		validate(Schema.NonNegativeInt, height)
		return this.client.get<GetByHeightResponse>(`/api/chain/height_with_txs/${height}`)
	}

	/**
	 * Get a specific transaction by ID
	 *
	 * @param txid - Transaction ID (Base58 encoded)
	 * @returns Promise resolving to transaction data
	 * @throws {Error} If transaction ID is invalid
	 *
	 * @example
	 * ```ts
	 * const tx = await sdk.chain.getTransaction('5Kd3N...')
	 * ```
	 */
	async getTransaction(txid: string): Promise<Transaction> {
		validate(Base58HashSchema, txid)
		return this.client.get<Transaction>(`/api/chain/tx/${txid}`)
	}

	/**
	 * Get transactions in a specific entry
	 *
	 * @param entryHash - Entry hash (Base58 encoded)
	 * @returns Promise resolving to transactions in the entry
	 * @throws {Error} If entry hash is invalid
	 *
	 * @example
	 * ```ts
	 * const { txs } = await sdk.chain.getTransactionsInEntry('5Kd3N...')
	 * ```
	 */
	async getTransactionsInEntry(entryHash: string): Promise<GetTransactionsInEntryResponse> {
		validate(Base58HashSchema, entryHash)
		return this.client.get<GetTransactionsInEntryResponse>(
			`/api/chain/txs_in_entry/${entryHash}`
		)
	}

	/**
	 * Get transaction events by account with filtering
	 *
	 * @param account - Account address (Base58 encoded)
	 * @param filters - Optional filters for transactions
	 * @returns Promise resolving to transaction events
	 * @throws {Error} If account address is invalid
	 *
	 * @example
	 * ```ts
	 * const { txs, cursor } = await sdk.chain.getTransactionEventsByAccount('5Kd3N...', {
	 *   limit: 10,
	 *   sort: 'desc'
	 * })
	 * ```
	 */
	async getTransactionEventsByAccount(
		account: string,
		filters: TransactionFilters = {}
	): Promise<GetTransactionEventsByAccountResponse> {
		validate(Base58HashSchema, account)
		validate(TransactionFiltersSchema, filters)

		return this.client.get<GetTransactionEventsByAccountResponse>(
			`/api/chain/tx_events_by_account/${account}`,
			filters as Record<string, unknown>
		)
	}
}
