/**
 * Type Definitions for LockupPrime smart contract
 *
 * Replaces Zod schemas with plain TypeScript types and type guards.
 */

// ── Tier Key Union ──────────────────────────────────────────────────

/** Valid lockup prime tier keys */
export type LockupPrimeTierKey = '7d' | '30d' | '90d' | '180d' | '365d'

/** Runtime array of all valid tier keys (for validation) */
export const LOCKUP_PRIME_TIER_KEYS: readonly LockupPrimeTierKey[] = [
	'7d',
	'30d',
	'90d',
	'180d',
	'365d'
] as const

/** Type guard to check if a string is a valid tier key */
export function isValidLockupPrimeTierKey(value: string): value is LockupPrimeTierKey {
	return (LOCKUP_PRIME_TIER_KEYS as readonly string[]).includes(value)
}

// ── Vault Types ─────────────────────────────────────────────────────

/** Parsed LockupPrime vault */
export interface LockupPrimeVault {
	tier: LockupPrimeTierKey
	multiplier: number
	unlockEpoch: number
	lockEpoch: number
	amount: number
	vaultIndex: number
}

/** Intermediate parse result from raw vault data string */
export interface RawLockupPrimeVaultData {
	tier: string
	multiplier: number
	unlockEpoch: number
	amountFlat: number
}

/** Extended tier information with UI-specific fields */
export interface LockupTier {
	tier: string
	epochs: number
	multiplier: number
	label: string
	durationDays: number
	rate?: number
}

// ── ABI Types ───────────────────────────────────────────────────────

export interface LockupPrimeAbiFunction {
	type: 'function'
	name: string
	inputs: LockupPrimeAbiInput[]
	outputs: LockupPrimeAbiOutput[]
	stateMutability: 'nonpayable' | 'payable' | 'view' | 'pure'
	description?: string
	requirements?: string[]
	storage?: {
		reads?: LockupPrimeAbiStorageRead[]
		writes?: LockupPrimeAbiStorageWrite[]
	}
}

export interface LockupPrimeAbiInput {
	name: string
	type: string
	description?: string
	validation?: {
		min?: string
		max?: string
		type?: string
	}
	enum?: string[]
}

export interface LockupPrimeAbiOutput {
	name: string
	type: string
	description?: string
}

export interface LockupPrimeAbiError {
	name: string
	code: string
	description: string
}

export interface LockupPrimeAbiStorage {
	keys: LockupPrimeAbiStorageKey[]
}

export interface LockupPrimeAbiStorageKey {
	name: string
	pattern: string
	type: 'mapping' | 'value' | 'array'
	description: string
	valueFormat?: string
	valueSchema?: Record<string, any>
	query?: {
		method: string
		endpoint: string
		prefix?: string
		key?: string
		description: string
	}
}

export interface LockupPrimeAbiStorageRead {
	key: string
	description?: string
	value?: string
}

export interface LockupPrimeAbiStorageWrite {
	key: string
	value?: string
	operation?: 'increment' | 'decrement' | 'create' | 'delete' | 'mint'
	amount?: string
	duration?: string
	description?: string
	condition?: string
	writes?: LockupPrimeAbiStorageWrite[]
}

export interface LockupPrimeAbiConstant {
	tiers: Record<LockupPrimeTierKey, { epochs: number; multiplier: number; label: string }>
	values: Record<string, string>
}

// ── Deprecated Aliases (backward compatibility) ─────────────────────

/** @deprecated Use `LockupPrimeVault` instead */
export type LockupPrimeVaultSchema = LockupPrimeVault

/** @deprecated Use `LockupPrimeTierKey` instead */
export type LockupTiersSchema = LockupPrimeTierKey
