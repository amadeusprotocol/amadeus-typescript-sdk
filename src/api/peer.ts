/**
 * Peer API
 *
 * Provides methods for querying network peer information
 */

import type { AmadeusClient } from '../client'
import type {
	GetNodesResponse,
	GetTrainersResponse,
	GetRemovedTrainersResponse,
	GetANRsResponse,
	GetANRByPkResponse
} from '../types'
import { Base58PublicKeySchema } from '../schemas'
import { validate } from '../validation'

export class PeerAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Get all nodes in the network
	 *
	 * @returns Promise resolving to network nodes
	 *
	 * @example
	 * ```ts
	 * const { nodes } = await sdk.peer.getNodes()
	 * ```
	 */
	async getNodes(): Promise<GetNodesResponse> {
		return this.client.get<GetNodesResponse>('/api/peer/nodes')
	}

	/**
	 * Get all trainers (validators)
	 *
	 * @returns Promise resolving to trainer nodes
	 *
	 * @example
	 * ```ts
	 * const { trainers } = await sdk.peer.getTrainers()
	 * ```
	 */
	async getTrainers(): Promise<GetTrainersResponse> {
		return this.client.get<GetTrainersResponse>('/api/peer/trainers')
	}

	/**
	 * Get removed trainers
	 *
	 * @returns Promise resolving to removed trainer nodes
	 *
	 * @example
	 * ```ts
	 * const { removed_trainers } = await sdk.peer.getRemovedTrainers()
	 * ```
	 */
	async getRemovedTrainers(): Promise<GetRemovedTrainersResponse> {
		return this.client.get<GetRemovedTrainersResponse>('/api/peer/removed_trainers')
	}

	/**
	 * Get all ANR (Autonomous Network Registry) entries
	 *
	 * @returns Promise resolving to ANR entries
	 *
	 * @example
	 * ```ts
	 * const { anrs } = await sdk.peer.getANRs()
	 * ```
	 */
	async getANRs(): Promise<GetANRsResponse> {
		return this.client.get<GetANRsResponse>('/api/peer/anr')
	}

	/**
	 * Get ANR validators only
	 *
	 * @returns Promise resolving to ANR validator entries
	 *
	 * @example
	 * ```ts
	 * const { anrs } = await sdk.peer.getANRValidators()
	 * ```
	 */
	async getANRValidators(): Promise<GetANRsResponse> {
		return this.client.get<GetANRsResponse>('/api/peer/anr_validators')
	}

	/**
	 * Get ANR entry by public key
	 *
	 * @param publicKey - Public key (Base58 encoded)
	 * @returns Promise resolving to ANR entry
	 * @throws {Error} If public key is invalid
	 *
	 * @example
	 * ```ts
	 * const { anr } = await sdk.peer.getANRByPk('5Kd3N...')
	 * ```
	 */
	async getANRByPk(publicKey: string): Promise<GetANRByPkResponse> {
		validate(Base58PublicKeySchema, publicKey)
		return this.client.get<GetANRByPkResponse>(`/api/peer/anr/${publicKey}`)
	}
}
