import { NetworkType } from '../../networks'

import { LOCKUP_PRIME_ABI } from './abi'
import type {
	LockupPrimeAbiError,
	LockupPrimeAbiFunction,
	LockupPrimeAbiStorageKey,
	LockupPrimeTierKey,
	LockupTier
} from './types'

/**
 * Network-specific tier configurations
 * Testnet uses shorter durations for testing unlock functionality
 */
const TIER_CONFIG = {
	[NetworkType.MAINNET]: {
		epochs: {
			'7d': 10,
			'30d': 45,
			'90d': 135,
			'180d': 270,
			'365d': 547
		},
		durationDays: {
			'7d': 7,
			'30d': 30,
			'90d': 90,
			'180d': 180,
			'365d': 365
		},
		labels: {
			'7d': '7 Days',
			'30d': '30 Days',
			'90d': '90 Days',
			'180d': '180 Days',
			'365d': '365 Days'
		}
	},
	[NetworkType.TESTNET]: {
		epochs: {
			'7d': 1,
			'30d': 3,
			'90d': 9,
			'180d': 18,
			'365d': 36
		},
		durationDays: {
			'7d': 1,
			'30d': 3,
			'90d': 9,
			'180d': 18,
			'365d': 36
		},
		labels: {
			'7d': '1 Day',
			'30d': '3 Days',
			'90d': '9 Days',
			'180d': '18 Days',
			'365d': '36 Days'
		}
	}
} as const

/** PP rate per day per 1K AMA (same for both networks) */
export const RATE_MAP: Record<string, number> = {
	'7d': 18.6,
	'30d': 21.1,
	'90d': 33.3,
	'180d': 43.2,
	'365d': 66.7
}

/**
 * Get tier config for the specified network (defaults to mainnet)
 */
function getTierConfig(network?: NetworkType) {
	if (network === NetworkType.TESTNET) {
		return TIER_CONFIG[NetworkType.TESTNET]
	}
	return TIER_CONFIG[NetworkType.MAINNET]
}

/**
 * LockupPrime Contract Interface
 * Provides access to contract ABI, tier configurations, and transaction building utilities
 */
export class LockupPrime {
	/** Get function ABI by name */
	static getFunction(name: string): LockupPrimeAbiFunction | undefined {
		return LOCKUP_PRIME_ABI.abi.find(
			(f) => f.name === name
		) as unknown as LockupPrimeAbiFunction
	}

	/** Get error by code */
	static getError(code: string): LockupPrimeAbiError | undefined {
		return LOCKUP_PRIME_ABI.errors.find((e) => e.code === code)
	}

	/** Get storage key by name */
	static getStorageKey(name: string): LockupPrimeAbiStorageKey | undefined {
		return LOCKUP_PRIME_ABI.storage.keys.find((k) => k.name === name)
	}

	/**
	 * Get tier configuration from ABI constants
	 * @param tierKey - The tier identifier (e.g., '7d', '30d')
	 * @param network - Optional network type (defaults to mainnet)
	 */
	static getTier(
		tierKey: LockupPrimeTierKey | string,
		network?: NetworkType
	): LockupTier | undefined {
		const tier = LOCKUP_PRIME_ABI.constants.tiers[tierKey as LockupPrimeTierKey]
		if (!tier) return undefined

		const config = getTierConfig(network)

		return {
			tier: tierKey,
			epochs: config.epochs[tierKey as keyof typeof config.epochs] ?? 0,
			multiplier: tier.multiplier,
			label: config.labels[tierKey as keyof typeof config.labels] ?? tier.label,
			durationDays: config.durationDays[tierKey as keyof typeof config.durationDays] ?? 0,
			rate: RATE_MAP[tierKey]
		}
	}

	/**
	 * Get all available tiers
	 * @param network - Optional network type (defaults to mainnet)
	 */
	static getAvailableTiers(network?: NetworkType): LockupTier[] {
		return Object.entries(LOCKUP_PRIME_ABI.constants.tiers)
			.map(([key]) => this.getTier(key, network)!)
			.filter((tier): tier is LockupTier => tier !== undefined)
	}

	/**
	 * Build transaction arguments for a function
	 * @deprecated Use `buildContractCall(LOCKUP_PRIME_ABI, functionName, params)` or the typed builders
	 * (`buildLockupPrimeLock`, `buildLockupPrimeUnlock`, `buildLockupPrimeDailyCheckin`) instead.
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
		return LOCKUP_PRIME_ABI.contractName
	}

	/** Get key prefix for a storage key name */
	static getKeyPrefix(keyName: string): string | undefined {
		const storageKey = this.getStorageKey(keyName)
		return storageKey?.pattern.split('{')[0]
	}
}
