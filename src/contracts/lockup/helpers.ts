import { LOCKUP_ABI } from './abi'
import type { LockupAbiError, LockupAbiFunction, LockupAbiStorageKey } from './types'

/**
 * Lockup Contract Interface
 * Provides access to contract ABI and transaction building utilities
 */
export class Lockup {
	/** Get function ABI by name */
	static getFunction(name: string): LockupAbiFunction | undefined {
		return LOCKUP_ABI.abi.find((f) => f.name === name) as unknown as LockupAbiFunction
	}

	/** Get error by code */
	static getError(_code: string): LockupAbiError | undefined {
		return undefined
	}

	/** Get storage key by name */
	static getStorageKey(name: string): LockupAbiStorageKey | undefined {
		return LOCKUP_ABI.storage.keys.find((k) => k.name === name)
	}

	/**
	 * Build transaction arguments for a function
	 * @deprecated Use `buildContractCall(LOCKUP_ABI, functionName, params)` or
	 * the typed builder `buildLockupUnlock({ vaultIndex })` instead.
	 */
	static buildArgs(functionName: string, params: Record<string, any>): Uint8Array[] {
		const func = this.getFunction(functionName)
		if (!func) {
			throw new Error(`Function ${functionName} not found`)
		}

		const args: Uint8Array[] = []
		for (const input of func.inputs) {
			const value = params[input.name]
			if (value === undefined) {
				throw new Error(`Missing parameter: ${input.name}`)
			}
			args.push(new TextEncoder().encode(String(value)))
		}
		return args
	}

	/** Get contract name */
	static getContractName(): string {
		return LOCKUP_ABI.contractName
	}

	/** Get key prefix for a storage key name */
	static getKeyPrefix(keyName: string): string | undefined {
		const storageKey = this.getStorageKey(keyName)
		return storageKey?.pattern.split('{')[0]
	}
}
