import { describe, it, expect } from 'vitest'

import {
	APY_EPOCH_DENOM,
	buildAllVaultsKeyPrefix,
	buildOwnerVaultsKeyPrefix,
	buildValidatorCommissionKey,
	buildVaultKey,
	daysToEpochs,
	decodeLockupVaultRecord,
	epochFromHeight,
	estimateEpochYieldFlat,
	flatToAma,
	isLockupVaultTier,
	LOCKUP_VAULT_KEY_PREFIX,
	monthsToEpochs,
	parseLockupVaultEntries,
	parseLockupVaultEntry,
	parseValidatorCommissionEntry,
	splitLockupVaultKey,
	summarizeLockupVaults,
	UNLOCK_PERIOD_EPOCHS
} from '../contracts/lockup-vault'
import { toBase58 } from '../encoding'
import { decodeContractState, encode } from '../serialization'
import type { SerializableValue } from '../types'

const enc = (s: string) => new TextEncoder().encode(s)

/** Deterministic 48-byte public key. */
function pk(seed: number): Uint8Array {
	const bytes = new Uint8Array(48)
	for (let i = 0; i < 48; i++) bytes[i] = (seed * 7 + i * 13) % 251
	return bytes
}

const OWNER = pk(1)
const VALIDATOR = pk(2)
const OTHER_VALIDATOR = pk(3)

interface VaultOverrides {
	type?: string
	amount?: bigint
	accrued?: bigint
	rate_bps?: bigint
	created_epoch?: bigint
	mature_epoch?: bigint
	payout_address?: Uint8Array | null
	validator?: Uint8Array | null
	validator_pending?: Uint8Array | null
	validator_pending_epoch?: bigint | null
	unlock_start_epoch?: bigint | null
	unlock_at_epoch?: bigint | null
}

/** Encode a vault the way `Vault::to_term` does on the node. */
function encodeVault(overrides: VaultOverrides = {}): Uint8Array {
	const record = new Map<SerializableValue, SerializableValue>([
		[enc('type'), enc(overrides.type ?? '6m')],
		[enc('amount'), overrides.amount ?? 1_000_000_000_000n],
		[enc('accrued'), overrides.accrued ?? 0n],
		[enc('rate_bps'), overrides.rate_bps ?? 1000n],
		[enc('created_epoch'), overrides.created_epoch ?? 760n],
		[enc('mature_epoch'), overrides.mature_epoch ?? 1072n],
		[enc('payout_address'), overrides.payout_address ?? null],
		[enc('validator'), overrides.validator === undefined ? VALIDATOR : overrides.validator],
		[enc('validator_pending'), overrides.validator_pending ?? null],
		[enc('validator_pending_epoch'), overrides.validator_pending_epoch ?? null],
		[enc('unlock_start_epoch'), overrides.unlock_start_epoch ?? null],
		[enc('unlock_at_epoch'), overrides.unlock_at_epoch ?? null]
	])
	return encode(record)
}

/** Owner-scoped key: the node strips the queried prefix, leaving the index. */
const ownerScopedKey = (index: number) => enc(String(index))

/** Chain-wide key: `{owner48}:{index}`. */
function chainWideKey(owner: Uint8Array, index: number): Uint8Array {
	const suffix = enc(`:${index}`)
	const out = new Uint8Array(owner.length + suffix.length)
	out.set(owner, 0)
	out.set(suffix, owner.length)
	return out
}

describe('LockupVault constants', () => {
	it('daysToEpochs ceil-divides like the node', () => {
		// 21 days x 172_800 blocks/day / 100_000 blocks/epoch = 36.288 -> 37
		expect(daysToEpochs(21)).toBe(37)
		expect(UNLOCK_PERIOD_EPOCHS).toBe(37)
	})

	it('monthsToEpochs matches the tier schedule', () => {
		expect(monthsToEpochs(3)).toBe(156)
		expect(monthsToEpochs(6)).toBe(312)
		expect(monthsToEpochs(12)).toBe(623)
	})

	it('epochFromHeight uses the 100k epoch interval', () => {
		expect(epochFromHeight(77_620_993)).toBe(776)
		expect(epochFromHeight(0)).toBe(0)
	})

	it('isLockupVaultTier recognises the on-chain tiers', () => {
		expect(isLockupVaultTier('12m')).toBe(true)
		expect(isLockupVaultTier('og')).toBe(true)
		expect(isLockupVaultTier('7d')).toBe(false)
	})
})

describe('LockupVault storage keys', () => {
	it('builds an owner-scoped prefix ending in a colon', () => {
		const prefix = buildOwnerVaultsKeyPrefix(OWNER)
		const text = new TextDecoder().decode(prefix.slice(0, LOCKUP_VAULT_KEY_PREFIX.length))
		expect(text).toBe(LOCKUP_VAULT_KEY_PREFIX)
		expect(prefix.length).toBe(LOCKUP_VAULT_KEY_PREFIX.length + 48 + 1)
		expect(prefix[prefix.length - 1]).toBe(0x3a)
	})

	it('accepts a Base58 public key', () => {
		expect(buildOwnerVaultsKeyPrefix(toBase58(OWNER))).toEqual(buildOwnerVaultsKeyPrefix(OWNER))
	})

	it('rejects a public key of the wrong length', () => {
		expect(() => buildOwnerVaultsKeyPrefix(new Uint8Array(32))).toThrow(/48 bytes/)
	})

	it('builds the chain-wide prefix and a single vault key', () => {
		expect(new TextDecoder().decode(buildAllVaultsKeyPrefix())).toBe(LOCKUP_VAULT_KEY_PREFIX)
		const key = buildVaultKey(OWNER, 9)
		expect(new TextDecoder().decode(key.slice(key.length - 2))).toBe(':9')
	})

	it('builds a validator commission key', () => {
		const key = buildValidatorCommissionKey(VALIDATOR)
		expect(new TextDecoder().decode(key.slice(0, 38))).toBe(
			'bic:lockup_vault:validator_commission:'
		)
		expect(key.length).toBe(38 + 48)
	})
})

describe('splitLockupVaultKey', () => {
	it('reads an owner-scoped key as index only', () => {
		expect(splitLockupVaultKey(ownerScopedKey(9))).toEqual({ owner: null, index: 9 })
		expect(splitLockupVaultKey(ownerScopedKey(11))).toEqual({ owner: null, index: 11 })
	})

	it('reads a chain-wide key as owner + index', () => {
		const { owner, index } = splitLockupVaultKey(chainWideKey(OWNER, 42))
		expect(owner).toBe(toBase58(OWNER))
		expect(index).toBe(42)
	})

	it('throws on a non-numeric index', () => {
		expect(() => splitLockupVaultKey(enc('abc'))).toThrow(/Invalid vault index/)
	})
})

describe('decodeLockupVaultRecord', () => {
	it('decodes every field written by Vault::to_term', () => {
		const record = decodeLockupVaultRecord(
			encodeVault({ accrued: 1_542_184_238n, type: '12m', rate_bps: 2000n })
		)
		expect(record.type).toBe('12m')
		expect(record.amount).toBe(1_000_000_000_000n)
		expect(record.accrued).toBe(1_542_184_238n)
		expect(record.rate_bps).toBe(2000n)
		expect(record.validator).toEqual(VALIDATOR)
		expect(record.payout_address).toBeNull()
	})

	it('throws when the blob is not a map', () => {
		expect(() => decodeLockupVaultRecord(encode(42))).toThrow(/vecpak map/)
	})
})

describe('parseLockupVaultEntry', () => {
	it('derives totals, lock length and yield', () => {
		const vault = parseLockupVaultEntry(
			[ownerScopedKey(9), encodeVault({ accrued: 1_542_184_238n })],
			{ currentEpoch: 776 },
			toBase58(OWNER)
		)

		expect(vault.index).toBe(9)
		expect(vault.owner).toBe(toBase58(OWNER))
		expect(vault.tier).toBe('6m')
		expect(vault.principalFlat).toBe(1_000_000_000_000n)
		expect(vault.accruedFlat).toBe(1_542_184_238n)
		expect(vault.totalFlat).toBe(1_001_542_184_238n)
		expect(vault.rateBps).toBe(1000)
		expect(vault.lockEpochs).toBe(312)
		expect(vault.lockMonths).toBe(6)
		expect(vault.compounds).toBe(true)
		expect(vault.validator).toBe(toBase58(VALIDATOR))
		expect(vault.epochYieldFlat).toBe((1_001_542_184_238n * 1000n) / APY_EPOCH_DENOM)
	})

	it('reports a still-locked vault as not matured', () => {
		const vault = parseLockupVaultEntry([ownerScopedKey(1), encodeVault()], {
			currentEpoch: 776
		})
		expect(vault.isMatured).toBe(false)
		expect(vault.epochsUntilMature).toBe(1072 - 776)
		expect(vault.isUnlocking).toBe(false)
		expect(vault.epochsUntilRelease).toBeNull()
	})

	it('reports a matured vault', () => {
		const vault = parseLockupVaultEntry([ownerScopedKey(1), encodeVault()], {
			currentEpoch: 1080
		})
		expect(vault.isMatured).toBe(true)
		expect(vault.epochsUntilMature).toBe(0)
	})

	it('tracks the unlock window', () => {
		const entry: [Uint8Array, Uint8Array] = [
			ownerScopedKey(1),
			encodeVault({ unlock_start_epoch: 1080n, unlock_at_epoch: 1117n })
		]

		const midWindow = parseLockupVaultEntry(entry, { currentEpoch: 1100 })
		expect(midWindow.isUnlocking).toBe(true)
		expect(midWindow.isReleasable).toBe(false)
		expect(midWindow.epochsUntilRelease).toBe(17)

		const elapsed = parseLockupVaultEntry(entry, { currentEpoch: 1117 })
		expect(elapsed.isReleasable).toBe(true)
		expect(elapsed.epochsUntilRelease).toBe(0)
	})

	it('keeps the old validator until a queued change posts', () => {
		const entry: [Uint8Array, Uint8Array] = [
			ownerScopedKey(1),
			encodeVault({
				validator: VALIDATOR,
				validator_pending: OTHER_VALIDATOR,
				validator_pending_epoch: 800n
			})
		]

		const before = parseLockupVaultEntry(entry, { currentEpoch: 799 })
		expect(before.validator).toBe(toBase58(VALIDATOR))
		expect(before.pendingValidator).toBe(toBase58(OTHER_VALIDATOR))
		expect(before.pendingValidatorEpoch).toBe(800)

		const after = parseLockupVaultEntry(entry, { currentEpoch: 800 })
		expect(after.validator).toBe(toBase58(OTHER_VALIDATOR))
		expect(after.pendingValidator).toBeNull()
		expect(after.pendingValidatorEpoch).toBeNull()
	})

	it('treats a queued clear (pending = null) as a clear once it posts', () => {
		const entry: [Uint8Array, Uint8Array] = [
			ownerScopedKey(1),
			encodeVault({
				validator: VALIDATOR,
				validator_pending: null,
				validator_pending_epoch: 800n
			})
		]

		expect(parseLockupVaultEntry(entry, { currentEpoch: 799 }).validator).toBe(
			toBase58(VALIDATOR)
		)
		expect(parseLockupVaultEntry(entry, { currentEpoch: 800 }).validator).toBeNull()
	})

	it('marks a vault with a payout address as non-compounding', () => {
		const vault = parseLockupVaultEntry(
			[ownerScopedKey(1), encodeVault({ payout_address: OTHER_VALIDATOR })],
			{ currentEpoch: 776 }
		)
		expect(vault.compounds).toBe(false)
		expect(vault.payoutAddress).toBe(toBase58(OTHER_VALIDATOR))
	})
})

describe('parseLockupVaultEntries', () => {
	it('sorts by index and skips unparseable records', () => {
		const vaults = parseLockupVaultEntries(
			[
				[ownerScopedKey(11), encodeVault()],
				[ownerScopedKey(9), encodeVault()],
				[ownerScopedKey(3), enc('not a vault')]
			],
			{ currentEpoch: 776 }
		)
		expect(vaults.map((v) => v.index)).toEqual([9, 11])
	})

	it('returns an empty list for no entries', () => {
		expect(parseLockupVaultEntries([], { currentEpoch: 776 })).toEqual([])
	})
})

describe('estimateEpochYieldFlat', () => {
	it('matches the node formula', () => {
		expect(estimateEpochYieldFlat(1_000_000_000_000n, 1000)).toBe(
			(1_000_000_000_000n * 1000n) / APY_EPOCH_DENOM
		)
	})

	it('is zero for the og tier (rate 0)', () => {
		expect(estimateEpochYieldFlat(1_000_000_000_000n, 0)).toBe(0n)
	})
})

describe('flatToAma', () => {
	it('keeps precision past 2^53 atomic units', () => {
		// 111,037,819.29948299 AMA — larger than Number.MAX_SAFE_INTEGER in atomic units
		expect(flatToAma(111_037_819_299_482_990n)).toBeCloseTo(111_037_819.29948299, 6)
	})

	it('handles zero and sub-AMA amounts', () => {
		expect(flatToAma(0n)).toBe(0)
		expect(flatToAma(1n)).toBeCloseTo(1e-9, 12)
	})
})

describe('summarizeLockupVaults', () => {
	const vaults = parseLockupVaultEntries(
		[
			[
				ownerScopedKey(1),
				encodeVault({ amount: 1_000_000_000_000n, accrued: 500_000_000n, rate_bps: 1000n })
			],
			[
				ownerScopedKey(2),
				encodeVault({
					amount: 3_000_000_000_000n,
					accrued: 0n,
					rate_bps: 2000n,
					validator: OTHER_VALIDATOR,
					mature_epoch: 900n
				})
			]
		],
		{ currentEpoch: 776 }
	)

	it('sums principal, accrued and total', () => {
		const summary = summarizeLockupVaults(vaults)
		expect(summary.totalPrincipalFlat).toBe(4_000_000_000_000n)
		expect(summary.totalAccruedFlat).toBe(500_000_000n)
		expect(summary.totalStakedFlat).toBe(4_000_500_000_000n)
		expect(summary.totalStaked).toBeCloseTo(4000.5, 6)
		expect(summary.vaultCount).toBe(2)
	})

	it('weights APY by stake', () => {
		const summary = summarizeLockupVaults(vaults)
		// (1000.5 AMA @ 1000bps + 3000 AMA @ 2000bps) / 4000.5 AMA ~= 1750bps
		expect(summary.weightedApyBps).toBe(1749)
		expect(summary.weightedApyPercent).toBeCloseTo(17.49, 2)
	})

	it('reports the earliest maturity among locked vaults', () => {
		expect(summarizeLockupVaults(vaults).nextMatureEpoch).toBe(900)
	})

	it('groups stake by backing validator', () => {
		const summary = summarizeLockupVaults(vaults)
		expect(summary.stakeByValidator[toBase58(VALIDATOR)]).toBe(1_000_500_000_000n)
		expect(summary.stakeByValidator[toBase58(OTHER_VALIDATOR)]).toBe(3_000_000_000_000n)
	})

	it('counts vaults by lifecycle state', () => {
		const mixed = parseLockupVaultEntries(
			[
				[ownerScopedKey(1), encodeVault({ mature_epoch: 2000n })],
				[ownerScopedKey(2), encodeVault({ mature_epoch: 700n })],
				[
					ownerScopedKey(3),
					encodeVault({ unlock_start_epoch: 700n, unlock_at_epoch: 737n })
				],
				[
					ownerScopedKey(4),
					encodeVault({ unlock_start_epoch: 700n, unlock_at_epoch: 900n })
				]
			],
			{ currentEpoch: 776 }
		)
		const summary = summarizeLockupVaults(mixed)
		expect(summary.lockedCount).toBe(1)
		expect(summary.maturedCount).toBe(1)
		expect(summary.unlockingCount).toBe(2)
		expect(summary.releasableCount).toBe(1)
	})

	it('returns a zeroed summary for no vaults', () => {
		const summary = summarizeLockupVaults([])
		expect(summary.totalStakedFlat).toBe(0n)
		expect(summary.totalStaked).toBe(0)
		expect(summary.weightedApyBps).toBe(0)
		expect(summary.nextMatureEpoch).toBeNull()
		expect(summary.stakeByValidator).toEqual({})
	})
})

describe('parseValidatorCommissionEntry', () => {
	const commission = (bps: bigint, pendingBps: bigint, pendingEpoch: bigint) =>
		encode(
			new Map<SerializableValue, SerializableValue>([
				[enc('bps'), bps],
				[enc('pending_bps'), pendingBps],
				[enc('pending_epoch'), pendingEpoch]
			])
		)

	it('uses the old rate before a queued raise posts', () => {
		const parsed = parseValidatorCommissionEntry([VALIDATOR, commission(500n, 1500n, 800n)], {
			currentEpoch: 799
		})
		expect(parsed.bps).toBe(500)
		expect(parsed.pendingBps).toBe(1500)
		expect(parsed.pendingEpoch).toBe(800)
	})

	it('uses the new rate once the raise posts', () => {
		const parsed = parseValidatorCommissionEntry([VALIDATOR, commission(500n, 1500n, 800n)], {
			currentEpoch: 800
		})
		expect(parsed.bps).toBe(1500)
		expect(parsed.pendingBps).toBeNull()
	})

	it('applies a cut immediately (pending_epoch = call epoch)', () => {
		const parsed = parseValidatorCommissionEntry([VALIDATOR, commission(200n, 200n, 776n)], {
			currentEpoch: 776
		})
		expect(parsed.bps).toBe(200)
		expect(parsed.pendingBps).toBeNull()
	})
})

describe('empty prefix responses', () => {
	it('decodes the node’s empty-list answer as no entries', () => {
		// A prefix matching nothing (an account with no vaults) comes back as an
		// empty LIST, not an empty map — the common case for an unstaked wallet.
		expect(decodeContractState(encode([]))).toEqual([])
		expect(decodeContractState(new Uint8Array(0))).toEqual([])
	})

	it('summarizes an empty vault set to a zero position', () => {
		const summary = summarizeLockupVaults(
			parseLockupVaultEntries(decodeContractState(encode([])), { currentEpoch: 776 })
		)
		expect(summary.totalStaked).toBe(0)
		expect(summary.vaultCount).toBe(0)
	})

	it('still rejects a non-empty non-map body', () => {
		expect(() => decodeContractState(encode([1n, 2n]))).toThrow(/Expected MAP type/)
	})
})
