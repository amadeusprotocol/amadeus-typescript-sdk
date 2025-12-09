/**
 * Contract API
 *
 * Provides methods for interacting with smart contracts
 */

import type { AmadeusClient } from '../client'
import type { ValidateBytecodeResponse, GetRichlistResponse, ContractDataValue } from '../types'
import { BytecodeSchema, ContractKeySchema } from '../schemas'
import { validate } from '../validation'

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
}
