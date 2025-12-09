/**
 * Epoch API
 *
 * Provides methods for querying epoch and validator information
 */

import type { AmadeusClient } from '../client'
import type { EpochScore, GetEmissionAddressResponse, GetSolInEpochResponse } from '../types'
import { Base58PublicKeySchema } from '../schemas'
import { Schema } from 'effect'
import { validate } from '../validation'

export class EpochAPI {
	constructor(private client: AmadeusClient) {}

	/**
	 * Get epoch score for all validators or a specific validator
	 *
	 * @param publicKey - Optional validator public key (Base58 encoded)
	 * @returns Promise resolving to epoch score(s)
	 * @throws {Error} If public key is invalid
	 *
	 * @example
	 * ```ts
	 * // Get all scores
	 * const scores = await sdk.epoch.getScore()
	 *
	 * // Get specific validator score
	 * const score = await sdk.epoch.getScore('5Kd3N...')
	 * ```
	 */
	async getScore(publicKey?: string): Promise<EpochScore> {
		if (publicKey) {
			validate(Base58PublicKeySchema, publicKey)
		}
		const url = publicKey ? `/api/epoch/score/${publicKey}` : '/api/epoch/score'
		return this.client.get<EpochScore>(url)
	}

	/**
	 * Get emission address for a public key
	 *
	 * @param publicKey - Validator public key (Base58 encoded)
	 * @returns Promise resolving to emission address
	 * @throws {Error} If public key is invalid
	 *
	 * @example
	 * ```ts
	 * const { emission_address } = await sdk.epoch.getEmissionAddress('5Kd3N...')
	 * ```
	 */
	async getEmissionAddress(publicKey: string): Promise<GetEmissionAddressResponse> {
		validate(Base58PublicKeySchema, publicKey)
		return this.client.get<GetEmissionAddressResponse>(
			`/api/epoch/get_emission_address/${publicKey}`
		)
	}

	/**
	 * Get solution in epoch
	 *
	 * @param epoch - Epoch number (must be >= 0)
	 * @param solHash - Solution hash as string or Uint8Array
	 * @returns Promise resolving to solution data
	 * @throws {Error} If parameters are invalid
	 *
	 * @example
	 * ```ts
	 * const sol = await sdk.epoch.getSolInEpoch(100, '5Kd3N...')
	 * ```
	 */
	async getSolInEpoch(
		epoch: number,
		solHash: string | Uint8Array
	): Promise<GetSolInEpochResponse> {
		validate(Schema.NonNegativeInt, epoch)

		if (!solHash) {
			throw new Error('Solution hash is required')
		}

		const hash = typeof solHash === 'string' ? solHash : solHash.toString()
		return this.client.get<GetSolInEpochResponse>(`/api/epoch/sol_in_epoch/${epoch}/${hash}`)
	}

	/**
	 * Get all epoch scores as array of [pk, score] tuples
	 */
	async getAllScores(): Promise<[string, number][]> {
		const result = await this.getScore()
		return Array.isArray(result) ? result : []
	}

	/**
	 * Get epoch score for a specific validator
	 */
	async getValidatorScore(publicKey: string): Promise<number> {
		const result = await this.getScore(publicKey)
		if (Array.isArray(result)) {
			throw new Error('Unexpected array response for single validator score')
		}
		return result.score
	}

	/**
	 * Get top validators by score
	 */
	async getTopValidators(limit: number = 10): Promise<[string, number][]> {
		const scores = await this.getAllScores()
		return scores.sort((a, b) => b[1] - a[1]).slice(0, limit)
	}
}
