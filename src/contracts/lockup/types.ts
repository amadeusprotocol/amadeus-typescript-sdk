/**
 * Type Definitions for Lockup smart contract
 *
 * Replaces Zod schemas with plain TypeScript types.
 */

// ── Vault Types ─────────────────────────────────────────────────────

/** Parsed Lockup vault (vesting vault) */
export interface LockupVault {
	unlockEpoch: number
	lockEpoch: number
	amount: number
	vaultIndex: number
	vaultType: 'vesting'
	unlockHeight?: number
}

/** Intermediate parse result from raw vault data string */
export interface RawLockupVaultData {
	unlockHeight: number
	amountFlat: number
	symbol: string
}

// ── ABI Types ───────────────────────────────────────────────────────

export interface LockupAbiFunction {
	type: 'function'
	name: string
	inputs: LockupAbiInput[]
	outputs: LockupAbiOutput[]
	stateMutability: 'nonpayable' | 'payable' | 'view' | 'pure'
	description?: string
	requirements?: string[]
	storage?: {
		reads?: LockupAbiStorageRead[]
		writes?: LockupAbiStorageWrite[]
	}
}

export interface LockupAbiInput {
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

export interface LockupAbiOutput {
	name: string
	type: string
	description?: string
}

export interface LockupAbiError {
	name: string
	code: string
	description: string
}

export interface LockupAbiStorage {
	keys: LockupAbiStorageKey[]
}

export interface LockupAbiStorageKey {
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

export interface LockupAbiStorageRead {
	key: string
	description?: string
	value?: string
}

export interface LockupAbiStorageWrite {
	key: string
	value?: string
	operation?: 'increment' | 'decrement' | 'create' | 'delete' | 'mint'
	amount?: string
	duration?: string
	description?: string
	condition?: string
	writes?: LockupAbiStorageWrite[]
}

// ── Deprecated Aliases (backward compatibility) ─────────────────────

/** @deprecated Use `LockupVault` instead */
export type LockupVaultSchema = LockupVault
