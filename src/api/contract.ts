/**
 * Contract API
 *
 * Provides methods for interacting with smart contracts
 */

import type { AmadeusClient } from '../client'
import type {
	ValidateBytecodeResponse,
	GetRichlistResponse,
	ContractDataValue,
	ContractViewParams,
	ContractViewResponse,
	SerializableValue
} from '../types'
import { BytecodeSchema, ContractKeySchema } from '../schemas'
import { validate } from '../validation'
import { encode } from '../serialization'

export class ContractAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Validate contract bytecode
	 *
	 * @param bytecode - Contract bytecode as Uint8Array or ArrayBuffer
	 * @returns Promise resolving to validation result
	 * @throws {AmadeusSDKError} If bytecode is invalid or empty
	 *
	 * @example
	 * ```ts
	 * const result = await sdk.contract.validateBytecode(wasmBytecode)
	 * ```
	 */
	async validateBytecode(bytecode: Uint8Array | ArrayBuffer): Promise<ValidateBytecodeResponse> {
		validate(BytecodeSchema, bytecode)
		const body = bytecode instanceof ArrayBuffer ? new Uint8Array(bytecode) : bytecode
		return this.client.post<ValidateBytecodeResponse>('/api/contract/validate_bytecode', body)
	}

	/**
	 * Get contract data by key
	 *
	 * @param key - Contract key as Uint8Array or Base58 string
	 * @returns Promise resolving to contract data value (JSON-serializable)
	 * @throws {AmadeusSDKError} If key is invalid
	 *
	 * @example
	 * ```ts
	 * const data = await sdk.contract.get(keyBytes)
	 * ```
	 */
	async get(key: Uint8Array | string): Promise<ContractDataValue> {
		validate(ContractKeySchema, key)
		return this.client.post<ContractDataValue>('/api/contract/get', key)
	}

	/**
	 * Get contract data by key prefix
	 *
	 * @param key - Contract key prefix as Uint8Array or Base58 string
	 * @returns Promise resolving to contract data matching the prefix (array of key-value pairs)
	 * @throws {AmadeusSDKError} If key is invalid
	 *
	 * @example
	 * ```ts
	 * const data = await sdk.contract.getPrefix(keyPrefix)
	 * ```
	 */
	async getPrefix(key: Uint8Array | string): Promise<ContractDataValue[]> {
		validate(ContractKeySchema, key)
		return this.client.post<ContractDataValue[]>('/api/contract/get_prefix', key)
	}

	/**
	 * Get contract richlist (token holders)
	 *
	 * @returns Promise resolving to richlist entries
	 *
	 * @example
	 * ```ts
	 * const { richlist } = await sdk.contract.getRichlist()
	 * ```
	 */
	async getRichlist(): Promise<GetRichlistResponse> {
		return this.client.get<GetRichlistResponse>('/api/contract/richlist')
	}

	/**
	 * Execute a contract function in read-only (view) mode against the current chain tip.
	 *
	 * No transaction is created and no state is mutated. Useful for querying contract
	 * state through the contract's own logic (e.g. computed balances, vault status).
	 *
	 * @param params - Contract, function, args, and optional caller pk
	 * @returns Promise resolving to `{ success, result, logs }`
	 *
	 * @example
	 * ```ts
	 * const { success, result } = await sdk.contract.view({
	 *   contract: 'LockupPrime',
	 *   function: 'view_balance',
	 *   args: ['my_vault']
	 * })
	 * ```
	 */
	async view(params: ContractViewParams): Promise<ContractViewResponse> {
		const body: Record<string, SerializableValue> = {
			contract: params.contract,
			function: params.function,
			args: params.args ?? []
		}
		if (params.pk) body.pk = params.pk
		return this.client.post<ContractViewResponse>('/api/contract/view', encode(body))
	}
}
