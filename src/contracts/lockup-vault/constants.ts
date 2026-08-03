/**
 * LockupVault (staking) constants.
 *
 * Mirrors `consensus/bic/lockup_vault.rs` in the node. Every value here is a
 * consensus constant — changing one silently desyncs the displayed numbers from
 * what the chain actually pays, so keep this file in lockstep with the node.
 */

/** Contract name as registered on-chain (`TX.build(.., "LockupVault", ..)`). */
export const LOCKUP_VAULT_CONTRACT = 'LockupVault'

/** Key prefix for vault records: `bic:lockup_vault:vault:{owner48}:{index}` */
export const LOCKUP_VAULT_KEY_PREFIX = 'bic:lockup_vault:vault:'

/** Key prefix for per-validator commission: `bic:lockup_vault:validator_commission:{validator48}` */
export const LOCKUP_VAULT_COMMISSION_KEY_PREFIX = 'bic:lockup_vault:validator_commission:'

/** Blocks per epoch (`EPOCH_INTERVAL`). */
export const EPOCH_INTERVAL = 100_000

/** Blocks produced per day at 500ms per block (86_400_000 / 500). */
export const BLOCKS_PER_DAY = 172_800

/** Epochs per day — 1.728. Derived, kept explicit for display math. */
export const EPOCHS_PER_DAY = BLOCKS_PER_DAY / EPOCH_INTERVAL

/** Days per month used by the lock schedule. */
export const DAYS_PER_MONTH = 30

/** Minimum amount to open a vault: 1,000 AMA (atomic). */
export const MIN_VAULT_AMOUNT_FLAT = 1_000n * 1_000_000_000n

/**
 * Stake at which a vault-backed validator counts as a validator: 1,000,000 AMA.
 * Only relevant when classifying validators, not for an owner's own totals.
 */
export const VALIDATOR_MIN_STAKE_FLAT = 1_000_000n * 1_000_000_000n

/** Longest lock an `og` vault may request. */
export const MAX_LOCK_MONTHS = 1200

/**
 * Yield denominator: 10,000 bps x 630.72 epochs per 365-day year.
 * Per-epoch yield = (amount + accrued) * rate_bps / APY_EPOCH_DENOM.
 */
export const APY_EPOCH_DENOM = 6_307_200n

/** Epochs in a 365-day year (630.72), the annualisation factor for `rate_bps`. */
export const EPOCHS_PER_YEAR = 630.72

/** Additive bonus (bps) locked in by 12m vaults created before `BONUS_END_EPOCH`. */
export const BONUS_RATE_BPS = 500

/** First epoch at which new 12m vaults no longer lock the bonus. */
export const BONUS_END_EPOCH = 1150

/** Epochs a validator set/clear waits before it goes live. */
export const VALIDATOR_CHANGE_QUEUE_EPOCHS = 2

/** Epochs a commission *raise* waits before it applies (cuts are instant). */
export const COMMISSION_RAISE_QUEUE_EPOCHS = VALIDATOR_CHANGE_QUEUE_EPOCHS + 1

/** Full basis points (100%). */
export const BPS_DENOM = 10_000

/**
 * Ceil-divide days into epochs, exactly as the node's `days_to_epochs`.
 */
export function daysToEpochs(days: number): number {
	return Math.ceil((days * BLOCKS_PER_DAY) / EPOCH_INTERVAL)
}

/** Lock length in epochs for a whole number of 30-day months. */
export function monthsToEpochs(months: number): number {
	return daysToEpochs(months * DAYS_PER_MONTH)
}

/** Epochs a matured vault waits after `unlock` before funds are released (21 days). */
export const UNLOCK_PERIOD_EPOCHS = daysToEpochs(21)

/** Epoch a block height falls in. */
export function epochFromHeight(height: number): number {
	return Math.floor(height / EPOCH_INTERVAL)
}

/** Approximate days for a span of epochs. */
export function epochsToDays(epochs: number): number {
	return epochs / EPOCHS_PER_DAY
}
