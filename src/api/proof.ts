/**
 * Proof API
 *
 * Provides methods for querying validator proofs
 */

import type { AmadeusClient } from '../client'
import type { ProofValidators } from '../types'
import { Base58HashSchema } from '../schemas'
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
}
