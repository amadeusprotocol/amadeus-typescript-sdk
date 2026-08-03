/**
 * Staking API
 *
 * Read access to an account's LockupVault position. Wraps the raw contract
 * prefix read, the epoch resolution and the vecpak decoding so a wallet only has
 * to ask "how much has this account staked".
 */

import type { AmadeusClient } from '../client'
import {
	buildAllValidatorCommissionsKeyPrefix,
	buildAllVaultsKeyPrefix,
	buildOwnerVaultsKeyPrefix,
	epochFromHeight,
	parseLockupVaultEntries,
	parseValidatorCommissions,
	summarizeLockupVaults
} from '../contracts/lockup-vault'
import type {
	LockupVaultEntry,
	PublicKeyInput,
	StakingSummary,
	ValidatorCommission
} from '../contracts/lockup-vault'
import { ChainAPI } from './chain'
import { ContractAPI } from './contract'

/** Options shared by staking reads. */
export interface StakingQueryOptions {
	/**
	 * Reference epoch. Omit to read the chain tip and derive it — pass it
	 * explicitly when making several calls so they resolve against one epoch
	 * and to save a round trip.
	 */
	currentEpoch?: number
}

/** An account's staking position: the vaults plus their rolled-up totals. */
export interface StakingPosition extends StakingSummary {
	/** Every open vault owned by the account, ordered by index. */
	vaults: LockupVaultEntry[]
	/** Epoch the position was resolved against. */
	epoch: number
}

export class StakingAPI {
	private contract: ContractAPI
	private chain: ChainAPI

	constructor(client: AmadeusClient) {
		this.contract = new ContractAPI(client)
		this.chain = new ChainAPI(client)
	}

	/**
	 * Current epoch, derived from the chain tip height.
	 *
	 * @returns Promise resolving to the epoch number
	 */
	async getCurrentEpoch(): Promise<number> {
		const { stats } = await this.chain.getStats()
		return epochFromHeight(stats.height)
	}

	private async resolveEpoch(options?: StakingQueryOptions): Promise<number> {
		return options?.currentEpoch ?? (await this.getCurrentEpoch())
	}

	/**
	 * Get every vault owned by an account.
	 *
	 * @param publicKey - Account public key (Base58 or raw 48 bytes)
	 * @param options - Optional reference epoch
	 * @returns Promise resolving to the account's vaults, ordered by index
	 *
	 * @example
	 * ```ts
	 * const vaults = await sdk.staking.getVaults('5Kd3N...')
	 * ```
	 */
	async getVaults(
		publicKey: PublicKeyInput,
		options?: StakingQueryOptions
	): Promise<LockupVaultEntry[]> {
		const currentEpoch = await this.resolveEpoch(options)
		const entries = await this.contract.getPrefixEntries(buildOwnerVaultsKeyPrefix(publicKey))
		const owner = typeof publicKey === 'string' ? publicKey : null
		return parseLockupVaultEntries(entries, { currentEpoch }, owner)
	}

	/**
	 * Get an account's staking position: its vaults plus the rolled-up totals.
	 *
	 * `totalStaked` is the number to show as "staked" — principal plus the yield
	 * already compounded into the vaults.
	 *
	 * @param publicKey - Account public key (Base58 or raw 48 bytes)
	 * @param options - Optional reference epoch
	 *
	 * @example
	 * ```ts
	 * const position = await sdk.staking.getPosition('5Kd3N...')
	 * console.log(`${position.totalStaked} AMA across ${position.vaultCount} vaults`)
	 * ```
	 */
	async getPosition(
		publicKey: PublicKeyInput,
		options?: StakingQueryOptions
	): Promise<StakingPosition> {
		const currentEpoch = await this.resolveEpoch(options)
		const vaults = await this.getVaults(publicKey, { currentEpoch })
		return { ...summarizeLockupVaults(vaults), vaults, epoch: currentEpoch }
	}

	/**
	 * Get every vault on the chain. Useful for explorer-style views; for a
	 * single account prefer `getVaults`, which reads far less.
	 *
	 * @param options - Optional reference epoch
	 */
	async getAllVaults(options?: StakingQueryOptions): Promise<LockupVaultEntry[]> {
		const currentEpoch = await this.resolveEpoch(options)
		const entries = await this.contract.getPrefixEntries(buildAllVaultsKeyPrefix())
		return parseLockupVaultEntries(entries, { currentEpoch })
	}

	/**
	 * Get every validator's commission, keyed by validator Base58.
	 *
	 * Commission is skimmed off the yield of vaults backing that validator, so
	 * it is what turns a vault's gross APY into what the owner actually receives.
	 *
	 * @param options - Optional reference epoch
	 */
	async getValidatorCommissions(
		options?: StakingQueryOptions
	): Promise<Record<string, ValidatorCommission>> {
		const currentEpoch = await this.resolveEpoch(options)
		const entries = await this.contract.getPrefixEntries(
			buildAllValidatorCommissionsKeyPrefix()
		)
		return parseValidatorCommissions(entries, { currentEpoch })
	}
}
