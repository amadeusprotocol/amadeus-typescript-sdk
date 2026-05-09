/**
 * Proof API
 *
 * Provides methods for querying validator proofs
 */

import type { AmadeusClient } from '../client'
import type { ProofValidators, ContractStateProof } from '../types'
import { Base58HashSchema } from '../schemas'
import { toBase58 } from '../encoding'
import { validate } from '../validation'

export class ProofAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Get validator proof for an entry hash
	 *
	 * @param entryHash - Entry hash (Base58 encoded)
	 * @returns Promise resolving to validator proof data
	 * @throws {Error} If entry hash is invalid
	 *
	 * @example
	 * ```ts
	 * const proof = await sdk.proof.getValidators('5Kd3N...')
	 * ```
	 */
	async getValidators(entryHash: string): Promise<ProofValidators> {
		validate(Base58HashSchema, entryHash)
		return this.client.get<ProofValidators>(`/api/proof/validators/${entryHash}`)
	}

	/**
	 * Get a merkle proof for a contract state entry.
	 *
	 * If `value` is supplied the node also verifies the proof and returns
	 * `result: true | false` indicating whether the value matches the proof.
	 *
	 * @param key - Contract state key, either raw bytes or already-Base58-encoded
	 * @param value - Optional value to verify against the proof (raw bytes or Base58)
	 *
	 * @example
	 * ```ts
	 * // Just fetch the proof
	 * const proof = await sdk.proof.getContractStateProof(
	 *   new TextEncoder().encode('account:5Kd3N...:balance:AMA')
	 * )
	 *
	 * // Fetch and verify the value
	 * const verified = await sdk.proof.getContractStateProof(key, expectedValueBytes)
	 * if (verified.result) console.log('matches')
	 * ```
	 */
	async getContractStateProof(
		key: Uint8Array | string,
		value?: Uint8Array | string
	): Promise<ContractStateProof> {
		const keyB58 = typeof key === 'string' ? key : toBase58(key)
		const path = `/api/proof/contractstate/${keyB58}`
		if (value === undefined) {
			return this.client.get<ContractStateProof>(path)
		}
		const valueB58 = typeof value === 'string' ? value : toBase58(value)
		return this.client.get<ContractStateProof>(`${path}/${valueB58}`)
	}
}
