/**
 * Proof API
 *
 * Provides methods for querying contract state, validator record and block proofs
 */

import type { AmadeusClient } from '../client'
import type {
	ProofValidators,
	ContractStateProof,
	ValidatorRecordProof,
	BlockProof,
	BlockProofOptions
} from '../types'
import { AmadeusSDKError } from '../types'
import { Base58HashSchema } from '../schemas'
import { toBase58 } from '../encoding'
import { validate } from '../validation'
import { Schema } from 'effect'

export class ProofAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Get validator proof for an entry hash
	 *
	 * @deprecated The node has no `/api/proof/validators/{hash}` route (it answers 404), so
	 *   this always throws. Use `getValidatorRecord(height)` for the proven validator set.
	 * @param entryHash - Entry hash (Base58 encoded)
	 * @throws {AmadeusSDKError} Always
	 */
	async getValidators(entryHash: string): Promise<ProofValidators> {
		validate(Base58HashSchema, entryHash)
		throw new AmadeusSDKError(
			'proof.getValidators is deprecated: the node has no /api/proof/validators route, use proof.getValidatorRecord(height)',
			404
		)
	}

	/**
	 * Get the validator set record for a height, proven against the contract state root of
	 * block `height - 1` (the block that wrote it).
	 *
	 * Verify the proof against the state root from `/api/chain/consensus/{entry_height}`.
	 *
	 * Records exist only at heights where the validator set was written (epoch starts such as
	 * 90500000); any other height answers 404.
	 *
	 * @param height - Height whose validator record to prove (must be >= 1)
	 * @returns Promise resolving to the Base58 key, value and HB-SMT proof
	 * @throws {AmadeusSDKError} With status 404 when no record was written at that height
	 *
	 * @example
	 * ```ts
	 * const { entry_height, value, proof } = await sdk.proof.getValidatorRecord(90500000)
	 * ```
	 */
	async getValidatorRecord(height: number): Promise<ValidatorRecordProof> {
		validate(Schema.NonNegativeInt, height)
		return this.client.get<ValidatorRecordProof>(`/api/proof/validator_record/${height}`)
	}

	/**
	 * Get an MMR inclusion proof that the canonical block at `height` is committed in the chain.
	 *
	 * Proves against the latest rooted MMR by default, or the MMR committed by the header at
	 * `options.atHeight`. Trust `root_chain` only from a header whose signature you verified.
	 *
	 * @param height - Height of the block to prove
	 * @param options - Optional `atHeight` selecting the MMR state to prove against
	 * @throws {AmadeusSDKError} On node errors such as `target_not_rooted`,
	 *   `commitment_not_rooted`, `pruned_history` or `proof_too_costly`
	 *
	 * @example
	 * ```ts
	 * const proof = await sdk.proof.getBlockProof(90500000, { atHeight: 90540000 })
	 * ```
	 */
	async getBlockProof(height: number, options: BlockProofOptions = {}): Promise<BlockProof> {
		validate(Schema.NonNegativeInt, height)
		if (options.atHeight !== undefined) validate(Schema.NonNegativeInt, options.atHeight)
		return this.client.get<BlockProof>(`/api/proof/block/${height}`, {
			at_height: options.atHeight
		})
	}

	/**
	 * Get an HB-SMT proof for a contract state key, taken at the current tip.
	 *
	 * The proof is an inclusion proof when the key exists (`terminus` carries the value hash)
	 * and an exclusion proof (`terminus: 'empty'`) when it does not.
	 *
	 * @param key - Contract state key, either raw bytes or already-Base58-encoded
	 *
	 * @example
	 * ```ts
	 * const { root_contractstate, proofs } = await sdk.proof.getContractStateProof(
	 *   new TextEncoder().encode('bic:epoch:segment_vr_hash')
	 * )
	 * console.log(proofs[0].proof.terminus)
	 * ```
	 */
	getContractStateProof(key: Uint8Array | string): Promise<ContractStateProof>
	/**
	 * @deprecated The node no longer verifies a value (`/api/proof/contractstate/{key}/{value}`
	 *   fails with HTTP 520), so passing `value` always throws. Fetch the proof and compare
	 *   `proofs[0].proof.terminus.value_hash` yourself.
	 */
	getContractStateProof(
		key: Uint8Array | string,
		value?: Uint8Array | string
	): Promise<ContractStateProof>
	async getContractStateProof(
		key: Uint8Array | string,
		value?: Uint8Array | string
	): Promise<ContractStateProof> {
		if (value !== undefined) {
			throw new AmadeusSDKError(
				'proof.getContractStateProof(key, value) is deprecated: the node no longer verifies values, call it with the key only'
			)
		}
		const keyB58 = typeof key === 'string' ? key : toBase58(key)
		return this.client.get<ContractStateProof>(`/api/proof/contractstate/${keyB58}`)
	}
}
