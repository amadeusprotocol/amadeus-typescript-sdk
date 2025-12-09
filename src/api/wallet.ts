/**
 * Wallet API
 *
 * Provides methods for querying wallet balances and information
 */

import type { AmadeusClient } from '../client'
import type { WalletBalance, GetAllBalancesResponse } from '../types'
import { Base58AddressSchema, NonEmptyStringSchema } from '../schemas'
import { validate } from '../validation'

export class WalletAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Get balance for a specific address and symbol
	 *
	 * @param address - Base58 encoded wallet address
	 * @param symbol - Token symbol (default: 'AMA')
	 * @returns Promise resolving to wallet balance
	 * @throws {AmadeusSDKError} If address is invalid
	 *
	 * @example
	 * ```ts
	 * const balance = await sdk.wallet.getBalance('5Kd3N...', 'AMA')
	 * ```
	 */
	async getBalance(address: string, symbol: string = 'AMA'): Promise<WalletBalance> {
		validate(Base58AddressSchema, address)
		validate(NonEmptyStringSchema, symbol)

		const url =
			symbol === 'AMA'
				? `/api/wallet/balance/${address}`
				: `/api/wallet/balance/${address}/${symbol}`
		return this.client.get<WalletBalance>(url)
	}

	/**
	 * Get all balances for an address
	 *
	 * @param address - Base58 encoded wallet address
	 * @returns Promise resolving to all wallet balances
	 * @throws {AmadeusSDKError} If address is invalid
	 *
	 * @example
	 * ```ts
	 * const { balances } = await sdk.wallet.getAllBalances('5Kd3N...')
	 * ```
	 */
	async getAllBalances(address: string): Promise<GetAllBalancesResponse> {
		validate(Base58AddressSchema, address)
		return this.client.get<GetAllBalancesResponse>(`/api/wallet/balance_all/${address}`)
	}
}
