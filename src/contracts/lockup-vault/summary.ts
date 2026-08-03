/**
 * Aggregation over an account's vaults.
 *
 * "How much have I staked" is the sum of `principal + accrued` across every
 * open vault. Matured and unlocking vaults still count: the chain only stops
 * counting a vault once its unlock window elapses and the funds are credited
 * back to the owner (`close_matured_and_sum_stakes`), and until then they keep
 * backing their validator and earning yield.
 */

import { APY_EPOCH_DENOM, BPS_DENOM, EPOCHS_PER_YEAR } from './constants'
import type { LockupVaultEntry, StakingSummary } from './types'

const ATOMIC_PER_AMA = 1_000_000_000n

/**
 * Convert an atomic amount to AMA without losing precision on large balances.
 *
 * `Number(flat) / 1e9` breaks above ~9M AMA (2^53 atomic units), which real
 * staking positions exceed, so split the integer and fractional parts first.
 */
export function flatToAma(flat: bigint): number {
	const negative = flat < 0n
	const magnitude = negative ? -flat : flat
	const whole = magnitude / ATOMIC_PER_AMA
	const fraction = magnitude % ATOMIC_PER_AMA
	const value = Number(whole) + Number(fraction) / Number(ATOMIC_PER_AMA)
	return negative ? -value : value
}

const EMPTY_SUMMARY: StakingSummary = {
	totalStakedFlat: 0n,
	totalStaked: 0,
	totalPrincipalFlat: 0n,
	totalPrincipal: 0,
	totalAccruedFlat: 0n,
	totalAccrued: 0,
	vaultCount: 0,
	lockedCount: 0,
	maturedCount: 0,
	unlockingCount: 0,
	releasableCount: 0,
	weightedApyBps: 0,
	weightedApyPercent: 0,
	epochYieldFlat: 0n,
	annualYieldFlat: 0n,
	annualYield: 0,
	nextMatureEpoch: null,
	stakeByValidator: {}
}

/**
 * Roll a list of vaults up into one staking position.
 *
 * @param vaults - Parsed vaults, typically all vaults owned by one account
 * @returns Totals, counts, stake-weighted APY, and per-validator stake
 *
 * @example
 * ```ts
 * const summary = summarizeLockupVaults(vaults)
 * console.log(`Staked: ${summary.totalStaked} AMA at ${summary.weightedApyPercent}%`)
 * ```
 */
export function summarizeLockupVaults(vaults: readonly LockupVaultEntry[]): StakingSummary {
	if (vaults.length === 0) return { ...EMPTY_SUMMARY, stakeByValidator: {} }

	let totalStakedFlat = 0n
	let totalPrincipalFlat = 0n
	let totalAccruedFlat = 0n
	let epochYieldFlat = 0n
	let annualYieldFlat = 0n
	let weightedRate = 0n
	let lockedCount = 0
	let maturedCount = 0
	let unlockingCount = 0
	let releasableCount = 0
	let nextMatureEpoch: number | null = null
	const stakeByValidator: Record<string, bigint> = {}

	for (const vault of vaults) {
		totalStakedFlat += vault.totalFlat
		totalPrincipalFlat += vault.principalFlat
		totalAccruedFlat += vault.accruedFlat
		epochYieldFlat += vault.epochYieldFlat
		annualYieldFlat += (vault.totalFlat * BigInt(vault.rateBps)) / BigInt(BPS_DENOM)
		weightedRate += vault.totalFlat * BigInt(vault.rateBps)

		if (vault.isReleasable) releasableCount++
		if (vault.isUnlocking) unlockingCount++
		else if (vault.isMatured) maturedCount++
		else {
			lockedCount++
			if (nextMatureEpoch === null || vault.matureEpoch < nextMatureEpoch) {
				nextMatureEpoch = vault.matureEpoch
			}
		}

		if (vault.validator) {
			stakeByValidator[vault.validator] =
				(stakeByValidator[vault.validator] ?? 0n) + vault.totalFlat
		}
	}

	const weightedApyBps = totalStakedFlat > 0n ? Number(weightedRate / totalStakedFlat) : 0

	return {
		totalStakedFlat,
		totalStaked: flatToAma(totalStakedFlat),
		totalPrincipalFlat,
		totalPrincipal: flatToAma(totalPrincipalFlat),
		totalAccruedFlat,
		totalAccrued: flatToAma(totalAccruedFlat),
		vaultCount: vaults.length,
		lockedCount,
		maturedCount,
		unlockingCount,
		releasableCount,
		weightedApyBps,
		weightedApyPercent: weightedApyBps / 100,
		epochYieldFlat,
		annualYieldFlat,
		annualYield: flatToAma(annualYieldFlat),
		nextMatureEpoch,
		stakeByValidator
	}
}

/**
 * Yield an amount at a given rate earns over a span of epochs, in atomic units.
 * Uses the same per-epoch integer division the chain does, so short spans match
 * what is actually credited rather than an annualised approximation.
 */
export function estimateYieldOverEpochs(
	totalFlat: bigint,
	rateBps: number,
	epochs: number
): bigint {
	if (totalFlat <= 0n || rateBps <= 0 || epochs <= 0) return 0n
	return ((totalFlat * BigInt(rateBps)) / APY_EPOCH_DENOM) * BigInt(Math.floor(epochs))
}

/** Approximate epochs remaining expressed in days (1.728 epochs per day). */
export function epochsToDaysRemaining(epochs: number): number {
	return epochs / (EPOCHS_PER_YEAR / 365)
}
