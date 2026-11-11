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
import { AmadeusSDKError } from '../types'
import { BytecodeSchema, ContractKeySchema } from '../schemas'
import { validate } from '../validation'
import { encode } from '../serialization'
import { fromBase58 } from '../encoding'
import { AMADEUS_PUBLIC_KEY_BYTE_LENGTH } from '../constants'
import { prefixPagePath, readAllPrefixPages } from '../contract-state'

export class ContractAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Validate contract bytecode
	 *
	 * @deprecated The node has no `/api/contract/validate_bytecode` route (it answers 404), so
	 *   this always throws. Contracts are RISC-V and are checked when `Contract.deploy` runs.
	 * @param bytecode - Contract bytecode as Uint8Array or ArrayBuffer
	 * @throws {AmadeusSDKError} Always
	 */
	async validateBytecode(bytecode: Uint8Array | ArrayBuffer): Promise<ValidateBytecodeResponse> {
		validate(BytecodeSchema, bytecode)
		throw new AmadeusSDKError(
			'contract.validateBytecode is deprecated: the node has no /api/contract/validate_bytecode route',
			404
		)
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
	 * Get contract data by key prefix as decoded `[key, value]` byte pairs.
	 *
	 * `/api/contract/get_prefix` answers with VecPack binary pages of
	 * `{ rows, cursor }` (at most 1,000 rows / 1 MiB each); this follows the
	 * cursor and returns every row. `getPrefix()` cannot read the binary body.
	 *
	 * Keys come back with the queried prefix stripped: querying
	 * `bic:lockup_vault:vault:{owner}:` yields keys that are just the vault index.
	 *
	 * @param key - Prefix bytes, or a plain string sent as UTF-8. Contract key
	 *   prefixes are raw byte strings (`bic:lockup_vault:vault:`), not Base58 —
	 *   anything containing a public key must be passed as bytes.
	 * @returns Promise resolving to `[key, value]` pairs of raw bytes
	 * @throws {AmadeusSDKError} On an empty prefix, an HTTP error (the node rejects
	 *   prefixes under 8 bytes) or a page that does not decode
	 *
	 * @example
	 * ```ts
	 * const entries = await sdk.contract.getPrefixEntries(
	 *   buildOwnerVaultsKeyPrefix(publicKey)
	 * )
	 * ```
	 */
	async getPrefixEntries(key: Uint8Array | string): Promise<Array<[Uint8Array, Uint8Array]>> {
		const prefix = typeof key === 'string' ? new TextEncoder().encode(key) : key
		if (prefix.length === 0) {
			throw new AmadeusSDKError('Contract key prefix must not be empty')
		}
		return readAllPrefixPages((cursor) =>
			this.client.postBinary(prefixPagePath(cursor, '/api/contract/get_prefix'), prefix)
		)
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
	 * No transaction is created and no state is mutated. Useful for querying a deployed
	 * contract's state through its own logic.
	 *
	 * The node runs the contract as deployed code only when `contract` is its 48-byte
	 * public key, so a Base58 address is decoded to raw bytes before it is sent.
	 *
	 * Built-in contracts (`Coin`, `LockupPrime`, `Nft`, ...) have no view functions: an unknown
	 * function answers `{ success: false, result: 'invalid_bic_action' }`, and a real action fails
	 * on its first write (`exec_cannot_write_during_view`) or on its args. Read their state with
	 * `get` / `getPrefixEntries` instead.
	 *
	 * @param params - Contract, function, args, and optional caller pk
	 * @returns Promise resolving to `{ success, result, logs }`
	 *
	 * @example
	 * ```ts
	 * const { success, result } = await sdk.contract.view({
	 *   contract: '5Kd3N...', // deployed contract address (Base58) or its raw bytes
	 *   function: 'get_counter',
	 *   args: []
	 * })
	 * ```
	 */
	async view(params: ContractViewParams): Promise<ContractViewResponse> {
		const body: Record<string, SerializableValue> = {
			contract: toViewContract(params.contract),
			function: params.function,
			args: params.args ?? []
		}
		if (params.pk) body.pk = params.pk
		return this.client.post<ContractViewResponse>('/api/contract/view', encode(body))
	}
}

function toViewContract(contract: string | Uint8Array): string | Uint8Array {
	if (typeof contract !== 'string') return contract
	const decoded = tryFromBase58(contract)
	return decoded?.length === AMADEUS_PUBLIC_KEY_BYTE_LENGTH ? decoded : contract
}

function tryFromBase58(value: string): Uint8Array | null {
	try {
		return fromBase58(value)
	} catch {
		return null
	}
}
