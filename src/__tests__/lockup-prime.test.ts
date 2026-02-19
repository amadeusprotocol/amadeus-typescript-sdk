import { describe, it, expect } from 'vitest'
import { NetworkType } from '../networks'
import {
	isValidLockupPrimeTierKey,
	LOCKUP_PRIME_TIER_KEYS,
	LockupPrime,
	parseRawVaultData,
	parseVaultData,
	parseContractStateNumber,
	buildLockupPrimeVaultKeyPrefix,
	buildDailyStreakKey,
	buildNextCheckinEpochKey,
	extractLockupPrimeVaultIndexFromKey,
	LOCKUP_PRIME_ABI
} from '../contracts/lockup-prime'

describe('LockupPrime Contract', () => {
	describe('isValidLockupPrimeTierKey', () => {
		it('returns true for valid tier keys', () => {
			for (const key of LOCKUP_PRIME_TIER_KEYS) {
				expect(isValidLockupPrimeTierKey(key)).toBe(true)
			}
		})

		it('returns false for invalid tier keys', () => {
			expect(isValidLockupPrimeTierKey('1d')).toBe(false)
			expect(isValidLockupPrimeTierKey('999d')).toBe(false)
			expect(isValidLockupPrimeTierKey('')).toBe(false)
			expect(isValidLockupPrimeTierKey('foo')).toBe(false)
		})
	})

	describe('LockupPrime class', () => {
		it('getFunction returns function ABI by name', () => {
			const lock = LockupPrime.getFunction('lock')
			expect(lock).toBeDefined()
			expect(lock!.name).toBe('lock')
			expect(lock!.inputs.length).toBe(2)

			const unlock = LockupPrime.getFunction('unlock')
			expect(unlock).toBeDefined()
			expect(unlock!.name).toBe('unlock')

			const checkin = LockupPrime.getFunction('daily_checkin')
			expect(checkin).toBeDefined()
		})

		it('getFunction returns undefined for unknown function', () => {
			expect(LockupPrime.getFunction('nonexistent')).toBeUndefined()
		})

		it('getError returns error by code', () => {
			const err = LockupPrime.getError('INVALID_TIER')
			expect(err).toBeDefined()
			expect(err!.code).toBe('INVALID_TIER')
		})

		it('getError returns undefined for unknown code', () => {
			expect(LockupPrime.getError('UNKNOWN')).toBeUndefined()
		})

		it('getTier returns mainnet tier config by default', () => {
			const tier = LockupPrime.getTier('30d')
			expect(tier).toBeDefined()
			expect(tier!.epochs).toBe(45)
			expect(tier!.multiplier).toBe(17)
			expect(tier!.durationDays).toBe(30)
			expect(tier!.label).toBe('30 Days')
			expect(tier!.rate).toBe(21.1)
		})

		it('getTier returns testnet tier config', () => {
			const tier = LockupPrime.getTier('30d', NetworkType.TESTNET)
			expect(tier).toBeDefined()
			expect(tier!.epochs).toBe(3)
			expect(tier!.durationDays).toBe(3)
			expect(tier!.label).toBe('3 Days')
		})

		it('getTier returns undefined for invalid tier', () => {
			expect(LockupPrime.getTier('invalid')).toBeUndefined()
		})

		it('getAvailableTiers returns all tiers for mainnet', () => {
			const tiers = LockupPrime.getAvailableTiers()
			expect(tiers.length).toBe(5)
			expect(tiers.map((t) => t.tier)).toEqual(['7d', '30d', '90d', '180d', '365d'])
		})

		it('getAvailableTiers returns testnet tiers', () => {
			const tiers = LockupPrime.getAvailableTiers(NetworkType.TESTNET)
			expect(tiers.length).toBe(5)
			expect(tiers[0]!.epochs).toBe(1) // 7d testnet = 1 epoch
		})

		it('buildArgs builds correct arguments', () => {
			const args = LockupPrime.buildArgs('lock', {
				amount: '1000000000',
				tier: '30d'
			})
			expect(args.length).toBe(2)
			expect(new TextDecoder().decode(args[0])).toBe('1000000000')
			expect(new TextDecoder().decode(args[1])).toBe('30d')
		})

		it('buildArgs throws for unknown function', () => {
			expect(() => LockupPrime.buildArgs('nonexistent', {})).toThrow(
				'Function nonexistent not found'
			)
		})

		it('buildArgs throws for missing parameter', () => {
			expect(() => LockupPrime.buildArgs('lock', { amount: '100' })).toThrow(
				'Missing parameter: tier'
			)
		})

		it('getContractName returns correct name', () => {
			expect(LockupPrime.getContractName()).toBe('LockupPrime')
		})

		it('getKeyPrefix returns prefix for vault', () => {
			expect(LockupPrime.getKeyPrefix('vault')).toBe('bic:lockup_prime:vault:')
		})
	})

	describe('parseRawVaultData', () => {
		it('parses valid vault data string', () => {
			const result = parseRawVaultData('30d-17-145-1000000000000')
			expect(result).not.toBeNull()
			expect(result!.tier).toBe('30d')
			expect(result!.multiplier).toBe(17)
			expect(result!.unlockEpoch).toBe(145)
			expect(result!.amountFlat).toBe(1000000000000)
		})

		it('returns null for invalid format', () => {
			expect(parseRawVaultData('invalid')).toBeNull()
			expect(parseRawVaultData('')).toBeNull()
			expect(parseRawVaultData('30d-17-145')).toBeNull() // missing amount
			expect(parseRawVaultData('30d-17-145-abc')).toBeNull() // non-numeric amount
		})

		it('returns null for invalid tier', () => {
			expect(parseRawVaultData('99d-17-145-1000')).toBeNull()
		})

		it('returns null for negative/zero multiplier', () => {
			expect(parseRawVaultData('30d-0-145-1000')).toBeNull()
		})
	})

	describe('parseVaultData', () => {
		it('parses valid string vault data', () => {
			const result = parseVaultData('30d-17-145-1000000000', 0)
			expect(result).not.toBeNull()
			expect(result!.tier).toBe('30d')
			expect(result!.multiplier).toBe(17)
			expect(result!.unlockEpoch).toBe(145)
			expect(result!.amount).toBe(1) // 1000000000 / 1e9 = 1 AMA
			expect(result!.vaultIndex).toBe(0)
		})

		it('parses Uint8Array vault data', () => {
			const data = new TextEncoder().encode('7d-13-100-5000000000')
			const result = parseVaultData(data, 3)
			expect(result).not.toBeNull()
			expect(result!.tier).toBe('7d')
			expect(result!.vaultIndex).toBe(3)
			expect(result!.amount).toBe(5) // 5 AMA
		})

		it('calculates lockEpoch correctly (mainnet)', () => {
			// 30d mainnet = 45 epochs, unlockEpoch=145
			const result = parseVaultData('30d-17-145-1000000000', 0)
			expect(result).not.toBeNull()
			expect(result!.lockEpoch).toBe(100) // 145 - 45
		})

		it('calculates lockEpoch with testnet network', () => {
			// 30d testnet = 3 epochs, unlockEpoch=10
			const result = parseVaultData('30d-17-10-1000000000', 0, NetworkType.TESTNET)
			expect(result).not.toBeNull()
			expect(result!.lockEpoch).toBe(7) // 10 - 3
		})

		it('returns null for invalid data', () => {
			expect(parseVaultData('invalid', 0)).toBeNull()
			expect(parseVaultData('', 0)).toBeNull()
		})
	})

	describe('parseContractStateNumber', () => {
		it('delegates to parseStateNumber', () => {
			expect(parseContractStateNumber('42')).toBe(42)
			expect(parseContractStateNumber(null)).toBe(0)
			expect(parseContractStateNumber(undefined)).toBe(0)
			expect(parseContractStateNumber(100)).toBe(100)
		})
	})

	describe('Storage Keys', () => {
		const fakeAccount = new Uint8Array(48).fill(0xab)

		it('buildLockupPrimeVaultKeyPrefix builds correct prefix', () => {
			const key = buildLockupPrimeVaultKeyPrefix(fakeAccount)
			const prefix = 'bic:lockup_prime:vault:'
			const decoded = new TextDecoder().decode(key.slice(0, prefix.length))
			expect(decoded).toBe(prefix)
			// Ends with ':'
			expect(key[key.length - 1]).toBe(0x3a)
			// Total = prefix(23) + account(48) + colon(1) = 72
			expect(key.length).toBe(prefix.length + 48 + 1)
		})

		it('buildDailyStreakKey builds correct key', () => {
			const key = buildDailyStreakKey(fakeAccount)
			const prefix = 'bic:lockup_prime:daily_streak:'
			const decoded = new TextDecoder().decode(key.slice(0, prefix.length))
			expect(decoded).toBe(prefix)
			// No trailing colon
			expect(key[key.length - 1]).toBe(0xab) // last byte of account
		})

		it('buildNextCheckinEpochKey builds correct key', () => {
			const key = buildNextCheckinEpochKey(fakeAccount)
			const prefix = 'bic:lockup_prime:next_checkin_epoch:'
			const decoded = new TextDecoder().decode(key.slice(0, prefix.length))
			expect(decoded).toBe(prefix)
		})
	})

	describe('extractLockupPrimeVaultIndexFromKey', () => {
		it('extracts index from short key (prefix query suffix)', () => {
			expect(extractLockupPrimeVaultIndexFromKey('0')).toBe(0)
			expect(extractLockupPrimeVaultIndexFromKey('42')).toBe(42)
		})

		it('extracts index from full key with colon', () => {
			expect(extractLockupPrimeVaultIndexFromKey('prefix:5')).toBe(5)
		})

		it('returns null for vault data format', () => {
			expect(extractLockupPrimeVaultIndexFromKey('7d-13-10-100000000000')).toBeNull()
			expect(extractLockupPrimeVaultIndexFromKey('30d-17-145-5000000000')).toBeNull()
		})

		it('works with Uint8Array input', () => {
			const key = new TextEncoder().encode('5')
			expect(extractLockupPrimeVaultIndexFromKey(key)).toBe(5)
		})

		it('returns null for non-numeric keys', () => {
			expect(extractLockupPrimeVaultIndexFromKey('abc')).toBeNull()
		})
	})

	describe('ABI structure', () => {
		it('has correct contract name and version', () => {
			expect(LOCKUP_PRIME_ABI.contractName).toBe('LockupPrime')
			expect(LOCKUP_PRIME_ABI.contractVersion).toBe('1.0.0')
		})

		it('has 3 functions defined', () => {
			expect(LOCKUP_PRIME_ABI.abi.length).toBe(3)
		})

		it('has 5 tiers defined', () => {
			expect(Object.keys(LOCKUP_PRIME_ABI.constants.tiers).length).toBe(5)
		})
	})
})
