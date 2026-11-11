/**
 * Chain API
 *
 * Provides methods for querying blockchain data
 */

import type { AmadeusClient } from '../client'
import type { MetricsBlockResponse } from './metrics'
import type {
	TransactionFilters,
	GetTipResponse,
	GetStatsResponse,
	GetByHashResponse,
	GetByHeightResponse,
	GetTransactionsInEntryResponse,
	GetTransactionEventsByAccountResponse,
	Transaction,
	TxByFilterParams,
	TxByFilterResponse,
	GetKpiResponse
} from '../types'
import { AmadeusSDKError } from '../types'
import { Base58HashSchema, TransactionFiltersSchema } from '../schemas'
import { Schema } from 'effect'
import { validate } from '../validation'

export class ChainAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Read canonical rooted transaction evidence; timestamps are intentionally unavailable.
	 *
	 * @deprecated The node has no `/api/chain/metrics/block/{height}` route. The request is
	 *   still sent for custom nodes that serve it; a 404 is rethrown as a clear `AmadeusSDKError`.
	 */
	async getMetricsBlock(height: number): Promise<MetricsBlockResponse> {
		if (!Number.isSafeInteger(height) || height < 0) throw new Error('Invalid metrics height')
		try {
			return await this.client.get<MetricsBlockResponse>(`/api/chain/metrics/block/${height}`)
		} catch (error) {
			if (error instanceof AmadeusSDKError && error.status === 404) {
				throw new AmadeusSDKError(
					'chain.getMetricsBlock is deprecated: this node has no /api/chain/metrics/block route',
					404,
					error.response
				)
			}
			throw error
		}
	}

	/**
	 * Get the current chain tip (latest entry)
	 *
	 * @returns Promise resolving to the latest chain entry
	 *
	 * @example
	 * ```ts
	 * const { entry } = await sdk.chain.getTip()
	 * console.log('Current height:', entry.header.height)
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
	 * console.log('Tip height:', stats.height)
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
	 * Get an account's transactions with filtering
	 *
	 * Returns full transaction records, each tagged with `metadata.tx_event`. The node only
	 * pages when `type` is `'sent'` or `'recv'`: without it, sent and received are merged
	 * and `cursor` is always `null`.
	 *
	 * @param account - Account address (Base58 encoded)
	 * @param filters - Optional filters; pass the previous `cursor` back to get the next page
	 * @returns Promise resolving to `{ cursor, txs }`
	 * @throws {Error} If account address is invalid
	 *
	 * @example
	 * ```ts
	 * const page1 = await sdk.chain.getTransactionEventsByAccount('5Kd3N...', {
	 *   type: TransactionEventType.SENT,
	 *   limit: 10,
	 *   sort: 'desc'
	 * })
	 * const page2 = await sdk.chain.getTransactionEventsByAccount('5Kd3N...', {
	 *   type: TransactionEventType.SENT,
	 *   limit: 10,
	 *   sort: 'desc',
	 *   cursor: page1.cursor ?? undefined
	 * })
	 * ```
	 */
	async getTransactionEventsByAccount(
		account: string,
		filters: TransactionFilters = {}
	): Promise<GetTransactionEventsByAccountResponse> {
		validate(Base58HashSchema, account)
		validate(TransactionFiltersSchema, filters)

		// The node reads a plain `cursor` as raw bytes; the Base58 one must go as `cursor_b58`.
		const { cursor, ...rest } = filters
		const query = cursor && !rest.cursor_b58 ? { ...rest, cursor_b58: cursor } : filters
		return this.client.get<GetTransactionEventsByAccountResponse>(
			`/api/chain/tx_events_by_account/${account}`,
			query as Record<string, unknown>
		)
	}

	/**
	 * Query transactions by arbitrary filter (signer, receiver, contract, function).
	 *
	 * All filter fields are optional; provide only the ones you want to constrain.
	 * Returns a cursor for pagination — pass it back as `cursor` in a subsequent call.
	 *
	 * @example
	 * ```ts
	 * const { txs, cursor } = await sdk.chain.getByFilter({
	 *   signer: '5Kd3N...',
	 *   contract: 'Coin',
	 *   function: 'transfer',
	 *   limit: 50,
	 *   sort: 'desc'
	 * })
	 * ```
	 */
	async getByFilter(filters: TxByFilterParams = {}): Promise<TxByFilterResponse> {
		return this.client.get<TxByFilterResponse>(
			'/api/chain/tx_by_filter',
			filters as Record<string, unknown>
		)
	}

	/**
	 * Get protocol-level KPIs (burned, fees, active validators/peers, total tx, UAW, etc.).
	 *
	 * @example
	 * ```ts
	 * const { kpi } = await sdk.chain.getKpi()
	 * console.log('Total tx:', kpi.total_tx)
	 * ```
	 */
	async getKpi(): Promise<GetKpiResponse> {
		return this.client.get<GetKpiResponse>('/api/chain/kpi')
	}
}
