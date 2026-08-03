/**
 * LockupVault (staking) types.
 *
 * A "stake" in Amadeus is a LockupVault: AMA locked for a tier duration, earning
 * `rate_bps` APY, optionally backing a validator. Yield either compounds into the
 * vault (no payout address) or is paid out to a payout address each epoch.
 */

/** Vault tiers. `og` is the open tier (rate 0, caller-chosen lock length). */
export type LockupVaultTier = 'og' | '3m' | '6m' | '12m'

/** Runtime list of known tiers. Unknown tiers from chain data are preserved as-is. */
export const LOCKUP_VAULT_TIERS: readonly LockupVaultTier[] = ['og', '3m', '6m', '12m'] as const

/** Type guard for a known tier key. */
export function isLockupVaultTier(value: string): value is LockupVaultTier {
	return (LOCKUP_VAULT_TIERS as readonly string[]).includes(value)
}

/**
 * Raw vault record as stored on-chain, decoded but not interpreted.
 * Field names match the vecpak proplist written by `Vault::to_term`.
 */
export interface RawLockupVaultRecord {
	type: string
	amount: bigint
	accrued: bigint
	rate_bps: bigint
	created_epoch: bigint
	mature_epoch: bigint
	payout_address: Uint8Array | null
	validator: Uint8Array | null
	validator_pending: Uint8Array | null
	validator_pending_epoch: bigint | null
	unlock_start_epoch: bigint | null
	unlock_at_epoch: bigint | null
}

/**
 * A parsed vault, with the derived fields a wallet needs to render it.
 *
 * Amounts are atomic (`*Flat`, 1 AMA = 1e9) as `bigint` so nothing is lost to
 * float rounding; use `fromAtomicAma` for display.
 */
export interface LockupVaultEntry {
	/** Vault index (unique per chain, not per owner). */
	index: number
	/** Owner public key (Base58), or `null` when parsed from an owner-scoped query. */
	owner: string | null
	/** Tier string as stored on-chain. */
	tier: LockupVaultTier | string
	/** Principal deposited (atomic). */
	principalFlat: bigint
	/** Yield compounded into the vault so far (atomic). */
	accruedFlat: bigint
	/** principal + accrued — the amount actually staked and earning (atomic). */
	totalFlat: bigint
	/** APY in basis points, locked in at creation. */
	rateBps: number
	/** Epoch the vault was created. */
	createdEpoch: number
	/** Epoch the lock expires and `unlock` becomes callable. */
	matureEpoch: number
	/** Lock length in epochs (mature - created). */
	lockEpochs: number
	/** Lock length rounded to whole 30-day months, for display. */
	lockMonths: number
	/** Where yield is paid (Base58), or `null` when it compounds into the vault. */
	payoutAddress: string | null
	/** Whether yield compounds into the vault (no payout address set). */
	compounds: boolean
	/** Validator backing this vault at the reference epoch (Base58), or `null`. */
	validator: string | null
	/** A queued validator change not yet live at the reference epoch (Base58). */
	pendingValidator: string | null
	/** Epoch a queued validator change goes live. */
	pendingValidatorEpoch: number | null
	/** Epoch `unlock` was called, or `null` while still locked/untouched. */
	unlockStartEpoch: number | null
	/** Epoch the 21-day unlock window closes and funds are auto-credited. */
	unlockAtEpoch: number | null
	/** Lock has expired — `unlock` can be called. */
	isMatured: boolean
	/** `unlock` was called; the vault is in its 21-day withdrawal window. */
	isUnlocking: boolean
	/** Unlock window has elapsed; the chain releases the funds at the next epoch. */
	isReleasable: boolean
	/** Epochs left until maturity (0 once matured). */
	epochsUntilMature: number
	/** Epochs left in the unlock window, or `null` when not unlocking. */
	epochsUntilRelease: number | null
	/** Estimated yield this vault earns per epoch at the current rate (atomic). */
	epochYieldFlat: bigint
}

/** Aggregate staking position for one account. */
export interface StakingSummary {
	/** Total staked = sum of (principal + accrued) across vaults (atomic). */
	totalStakedFlat: bigint
	/** Total staked in AMA. */
	totalStaked: number
	/** Sum of principal only (atomic). */
	totalPrincipalFlat: bigint
	/** Sum of principal only, in AMA. */
	totalPrincipal: number
	/** Yield compounded into vaults so far (atomic). */
	totalAccruedFlat: bigint
	/** Yield compounded into vaults so far, in AMA. */
	totalAccrued: number
	/** Number of vaults. */
	vaultCount: number
	/** Vaults still locked (not matured). */
	lockedCount: number
	/** Vaults matured but not yet unlocked. */
	maturedCount: number
	/** Vaults in their 21-day unlock window. */
	unlockingCount: number
	/** Vaults whose unlock window has elapsed. */
	releasableCount: number
	/** Stake-weighted average APY in basis points (0 when nothing is staked). */
	weightedApyBps: number
	/** Stake-weighted average APY as a percentage. */
	weightedApyPercent: number
	/** Estimated yield across all vaults per epoch (atomic). */
	epochYieldFlat: bigint
	/** Estimated yield across all vaults per year (atomic). */
	annualYieldFlat: bigint
	/** Estimated yield across all vaults per year, in AMA. */
	annualYield: number
	/** Earliest maturity epoch among still-locked vaults, or `null`. */
	nextMatureEpoch: number | null
	/** Total staked against each backing validator (Base58 → atomic). */
	stakeByValidator: Record<string, bigint>
}

/** Validator commission record (`bic:lockup_vault:validator_commission:{pk}`). */
export interface ValidatorCommission {
	/** Validator public key (Base58). */
	validator: string
	/** Commission in effect at the reference epoch (bps). */
	bps: number
	/** A queued raise not yet in effect (bps), or `null`. */
	pendingBps: number | null
	/** Epoch a queued raise takes effect, or `null`. */
	pendingEpoch: number | null
}
