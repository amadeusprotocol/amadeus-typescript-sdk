/**
 * LockupVault parsers.
 *
 * Turns raw `get_prefix` entries into `LockupVaultEntry` values. Every derived
 * field is resolved against a reference epoch, because the chain's own view of a
 * vault is epoch-dependent: a queued validator change is not live until its
 * epoch, and maturity/unlock are epoch comparisons.
 */

import { toBase58 } from '../../encoding'
import { decode } from '../../serialization'
import type { DecodedValue } from '../../types'

import {
	APY_EPOCH_DENOM,
	DAYS_PER_MONTH,
	EPOCHS_PER_DAY,
	LOCKUP_VAULT_KEY_PREFIX
} from './constants'
import type { LockupVaultEntry, RawLockupVaultRecord, ValidatorCommission } from './types'

const COLON = 0x3a
const PUBLIC_KEY_LENGTH = 48
const EPOCHS_PER_MONTH = EPOCHS_PER_DAY * DAYS_PER_MONTH

/** A `[key, value]` pair as returned by a contract prefix query. */
export type ContractStateEntry = readonly [Uint8Array, Uint8Array]

/** Options controlling how vault records are interpreted. */
export interface ParseLockupVaultOptions {
	/**
	 * Epoch to resolve the vault against — `floor(chainHeight / EPOCH_INTERVAL)`.
	 * Decides which validator is live and whether the vault is matured/releasable.
	 */
	currentEpoch: number
}

const decoder = new TextDecoder()

function mapKeyToString(key: DecodedValue): string {
	if (key instanceof Uint8Array) return decoder.decode(key)
	return String(key)
}

function asBigInt(value: DecodedValue | undefined): bigint {
	if (typeof value === 'bigint') return value
	throw new Error('Expected integer in vault record')
}

function asOptionalBigInt(value: DecodedValue | undefined): bigint | null {
	if (value === null || value === undefined) return null
	if (typeof value === 'bigint') return value
	throw new Error('Expected integer or nil in vault record')
}

function asOptionalBytes(value: DecodedValue | undefined): Uint8Array | null {
	if (value === null || value === undefined) return null
	if (value instanceof Uint8Array) return value
	throw new Error('Expected binary or nil in vault record')
}

/**
 * Decode a vault value blob into its raw on-chain fields.
 *
 * @throws If the blob is not a vecpak map with the expected fields.
 */
export function decodeLockupVaultRecord(value: Uint8Array): RawLockupVaultRecord {
	const term = decode(value)
	if (!(term instanceof Map)) {
		throw new Error('Expected vault record to be a vecpak map')
	}

	const fields = new Map<string, DecodedValue>()
	for (const [key, fieldValue] of term.entries()) {
		fields.set(mapKeyToString(key), fieldValue)
	}

	const typeBytes = fields.get('type')
	if (!(typeBytes instanceof Uint8Array)) {
		throw new Error('Expected vault `type` to be binary')
	}

	return {
		type: decoder.decode(typeBytes),
		amount: asBigInt(fields.get('amount')),
		accrued: asBigInt(fields.get('accrued')),
		rate_bps: asBigInt(fields.get('rate_bps')),
		created_epoch: asBigInt(fields.get('created_epoch')),
		mature_epoch: asBigInt(fields.get('mature_epoch')),
		payout_address: asOptionalBytes(fields.get('payout_address')),
		validator: asOptionalBytes(fields.get('validator')),
		validator_pending: asOptionalBytes(fields.get('validator_pending')),
		validator_pending_epoch: asOptionalBigInt(fields.get('validator_pending_epoch')),
		unlock_start_epoch: asOptionalBigInt(fields.get('unlock_start_epoch')),
		unlock_at_epoch: asOptionalBigInt(fields.get('unlock_at_epoch'))
	}
}

/**
 * Split a prefix-query key into owner and vault index.
 *
 * Two shapes reach this, depending on the prefix that was queried, because the
 * node strips the queried prefix from the keys it returns:
 * - owner-scoped (`...vault:{owner}:`) → `"9"`, owner is implied by the query
 * - chain-wide (`...vault:`) → `{owner48}:{index}`
 */
export function splitLockupVaultKey(key: Uint8Array): { owner: string | null; index: number } {
	const hasOwner = key.length > PUBLIC_KEY_LENGTH && key[PUBLIC_KEY_LENGTH] === COLON
	const owner = hasOwner ? toBase58(key.slice(0, PUBLIC_KEY_LENGTH)) : null
	const indexBytes = hasOwner ? key.slice(PUBLIC_KEY_LENGTH + 1) : key
	const index = Number.parseInt(decoder.decode(indexBytes), 10)

	if (!Number.isInteger(index) || index < 0) {
		throw new Error(`Invalid vault index in key: ${decoder.decode(indexBytes)}`)
	}

	return { owner, index }
}

/**
 * Yield a vault earns in one epoch: `(principal + accrued) * rate_bps / APY_EPOCH_DENOM`.
 * Integer division, matching `pay_epoch_yield` in the node.
 *
 * This is the vault's gross entitlement. What is actually credited can be lower —
 * the epoch budget is shared pro rata when dues exceed it, an `reduction_pct`
 * scales payouts, and the backing validator's commission is skimmed off the top.
 */
export function estimateEpochYieldFlat(totalFlat: bigint, rateBps: number): bigint {
	if (totalFlat <= 0n || rateBps <= 0) return 0n
	return (totalFlat * BigInt(rateBps)) / APY_EPOCH_DENOM
}

/**
 * Parse one `[key, value]` entry into a vault.
 *
 * @param entry - Key/value as returned by a contract prefix query
 * @param options - Reference epoch to resolve epoch-dependent fields against
 * @param owner - Owner Base58, used when the key is owner-scoped (index only)
 */
export function parseLockupVaultEntry(
	entry: ContractStateEntry,
	options: ParseLockupVaultOptions,
	owner?: string | null
): LockupVaultEntry {
	const [key, value] = entry
	const { owner: keyOwner, index } = splitLockupVaultKey(key)
	const record = decodeLockupVaultRecord(value)
	const { currentEpoch } = options

	const principalFlat = record.amount
	const accruedFlat = record.accrued
	const totalFlat = principalFlat + accruedFlat
	const rateBps = Number(record.rate_bps)
	const createdEpoch = Number(record.created_epoch)
	const matureEpoch = Number(record.mature_epoch)
	const lockEpochs = Math.max(0, matureEpoch - createdEpoch)

	// A queued validator change is not live until its epoch. Before then the old
	// validator still backs the vault; a queued change to `null` is a clear.
	const pendingEpochRaw = record.validator_pending_epoch
	const pendingEpoch = pendingEpochRaw === null ? null : Number(pendingEpochRaw)
	const pendingApplied = pendingEpoch !== null && currentEpoch >= pendingEpoch
	const liveValidator = pendingApplied ? record.validator_pending : record.validator
	const queuedValidator = pendingApplied ? null : record.validator_pending

	const unlockStartEpoch =
		record.unlock_start_epoch === null ? null : Number(record.unlock_start_epoch)
	const unlockAtEpoch = record.unlock_at_epoch === null ? null : Number(record.unlock_at_epoch)

	return {
		index,
		owner: keyOwner ?? owner ?? null,
		tier: record.type,
		principalFlat,
		accruedFlat,
		totalFlat,
		rateBps,
		createdEpoch,
		matureEpoch,
		lockEpochs,
		lockMonths: Math.round(lockEpochs / EPOCHS_PER_MONTH),
		payoutAddress: record.payout_address ? toBase58(record.payout_address) : null,
		compounds: record.payout_address === null,
		validator: liveValidator ? toBase58(liveValidator) : null,
		pendingValidator: queuedValidator ? toBase58(queuedValidator) : null,
		pendingValidatorEpoch: pendingApplied ? null : pendingEpoch,
		unlockStartEpoch,
		unlockAtEpoch,
		isMatured: currentEpoch >= matureEpoch,
		isUnlocking: unlockStartEpoch !== null,
		isReleasable: unlockAtEpoch !== null && currentEpoch >= unlockAtEpoch,
		epochsUntilMature: Math.max(0, matureEpoch - currentEpoch),
		epochsUntilRelease:
			unlockAtEpoch === null ? null : Math.max(0, unlockAtEpoch - currentEpoch),
		epochYieldFlat: estimateEpochYieldFlat(totalFlat, rateBps)
	}
}

/**
 * Parse a full prefix-query response into vaults, ordered by index.
 *
 * Entries that fail to decode are skipped rather than failing the whole read —
 * one malformed record must not blank out a user's entire staking position.
 *
 * @param entries - `[key, value]` pairs from `sdk.contract.getPrefixEntries`
 * @param options - Reference epoch to resolve epoch-dependent fields against
 * @param owner - Owner Base58, used when the keys are owner-scoped (index only)
 */
export function parseLockupVaultEntries(
	entries: readonly ContractStateEntry[],
	options: ParseLockupVaultOptions,
	owner?: string | null
): LockupVaultEntry[] {
	const vaults: LockupVaultEntry[] = []
	for (const entry of entries) {
		try {
			vaults.push(parseLockupVaultEntry(entry, options, owner))
		} catch {
			// Skip unparseable records — see above.
		}
	}
	return vaults.sort((a, b) => a.index - b.index)
}

/**
 * Resolve a validator's commission record against a reference epoch.
 *
 * Cuts apply immediately (stored with `pending_epoch` = the epoch of the call);
 * raises queue, so before `pending_epoch` the old rate is still what's charged.
 */
export function parseValidatorCommissionEntry(
	entry: ContractStateEntry,
	options: ParseLockupVaultOptions
): ValidatorCommission {
	const [key, value] = entry
	const validatorBytes =
		key.length > PUBLIC_KEY_LENGTH ? key.slice(key.length - PUBLIC_KEY_LENGTH) : key
	const term = decode(value)
	if (!(term instanceof Map)) {
		throw new Error('Expected commission record to be a vecpak map')
	}

	const fields = new Map<string, DecodedValue>()
	for (const [fieldKey, fieldValue] of term.entries()) {
		fields.set(mapKeyToString(fieldKey), fieldValue)
	}

	const bps = Number(asBigInt(fields.get('bps')))
	const pendingBps = Number(asBigInt(fields.get('pending_bps')))
	const pendingEpoch = Number(asBigInt(fields.get('pending_epoch')))
	const applied = options.currentEpoch >= pendingEpoch

	return {
		validator: toBase58(validatorBytes),
		bps: applied ? pendingBps : bps,
		pendingBps: applied ? null : pendingBps,
		pendingEpoch: applied ? null : pendingEpoch
	}
}

/** Parse every validator commission record, keyed by validator Base58. */
export function parseValidatorCommissions(
	entries: readonly ContractStateEntry[],
	options: ParseLockupVaultOptions
): Record<string, ValidatorCommission> {
	const out: Record<string, ValidatorCommission> = {}
	for (const entry of entries) {
		try {
			const commission = parseValidatorCommissionEntry(entry, options)
			out[commission.validator] = commission
		} catch {
			// Skip unparseable records.
		}
	}
	return out
}

/** Full storage key for a vault, for callers that need the un-stripped key. */
export function lockupVaultStorageKey(owner: string, index: number): string {
	return `${LOCKUP_VAULT_KEY_PREFIX}${owner}:${index}`
}
