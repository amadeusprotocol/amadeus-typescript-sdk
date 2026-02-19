import { describe, it, expect } from 'vitest'
import {
	Lockup,
	LOCKUP_ABI,
	parseRawLockupVaultData,
	parseLockupVaultData,
	buildLockupVaultKeyPrefix,
	extractLockupVaultIndexFromKey
} from '../contracts/lockup'

describe('Lockup Contract', () => {
	describe('Lockup class', () => {
		it('getFunction returns unlock function', () => {
			const unlock = Lockup.getFunction('unlock')
			expect(unlock).toBeDefined()
			expect(unlock!.name).toBe('unlock')
			expect(unlock!.inputs.length).toBe(1)
			expect(unlock!.inputs[0]!.name).toBe('vaultIndex')
		})

		it('getFunction returns undefined for unknown function', () => {
			expect(Lockup.getFunction('lock')).toBeUndefined()
		})

		it('getError returns undefined (no errors defined)', () => {
			expect(Lockup.getError('ANYTHING')).toBeUndefined()
		})

		it('getStorageKey returns vault key', () => {
			const key = Lockup.getStorageKey('vault')
			expect(key).toBeDefined()
			expect(key!.pattern).toBe('bic:lockup:vault:{account}:{index}')
		})

		it('buildArgs builds unlock arguments', () => {
			const args = Lockup.buildArgs('unlock', { vaultIndex: '5' })
			expect(args.length).toBe(1)
			expect(new TextDecoder().decode(args[0])).toBe('5')
		})

		it('buildArgs throws for unknown function', () => {
			expect(() => Lockup.buildArgs('nonexistent', {})).toThrow(
				'Function nonexistent not found'
			)
		})

		it('buildArgs throws for missing parameter', () => {
			expect(() => Lockup.buildArgs('unlock', {})).toThrow(
				'Missing parameter: vaultIndex'
			)
		})

		it('getContractName returns correct name', () => {
			expect(Lockup.getContractName()).toBe('Lockup')
		})

		it('getKeyPrefix returns prefix for vault', () => {
			expect(Lockup.getKeyPrefix('vault')).toBe('bic:lockup:vault:')
		})
	})

	describe('parseRawLockupVaultData', () => {
		it('parses valid vault data string', () => {
			const result = parseRawLockupVaultData('229427-75000000000000-AMA')
			expect(result).not.toBeNull()
			expect(result!.unlockHeight).toBe(229427)
			expect(result!.amountFlat).toBe(75000000000000)
			expect(result!.symbol).toBe('AMA')
		})

		it('returns null for invalid format', () => {
			expect(parseRawLockupVaultData('invalid')).toBeNull()
			expect(parseRawLockupVaultData('')).toBeNull()
			expect(parseRawLockupVaultData('229427-75000000000000')).toBeNull() // missing symbol
			expect(parseRawLockupVaultData('abc-def-AMA')).toBeNull() // non-numeric
		})

		it('returns null for non-AMA symbol', () => {
			expect(parseRawLockupVaultData('229427-75000000000000-BTC')).toBeNull()
		})

		it('parses zero values', () => {
			const result = parseRawLockupVaultData('0-1000000000-AMA')
			expect(result).not.toBeNull()
			expect(result!.unlockHeight).toBe(0)
		})
	})

	describe('parseLockupVaultData', () => {
		it('parses valid string vault data', () => {
			const result = parseLockupVaultData('500000-1000000000-AMA', 0)
			expect(result).not.toBeNull()
			expect(result!.amount).toBe(1) // 1e9 / 1e9 = 1 AMA
			expect(result!.vaultIndex).toBe(0)
			expect(result!.vaultType).toBe('vesting')
			expect(result!.unlockHeight).toBe(500000)
		})

		it('parses Uint8Array vault data', () => {
			const data = new TextEncoder().encode('600000-5000000000-AMA')
			const result = parseLockupVaultData(data, 3)
			expect(result).not.toBeNull()
			expect(result!.amount).toBe(5) // 5 AMA
			expect(result!.vaultIndex).toBe(3)
		})

		it('calculates lockHeight correctly', () => {
			// lockHeight = max(0, unlockHeight - 500_000)
			const result = parseLockupVaultData('700000-1000000000-AMA', 0)
			expect(result).not.toBeNull()
			// lockHeight = 700000 - 500000 = 200000
			// lockEpoch = floor(200000 / 100000) = 2
			expect(result!.lockEpoch).toBe(2)
			// unlockEpoch = floor(700000 / 100000) = 7
			expect(result!.unlockEpoch).toBe(7)
		})

		it('clamps lockHeight to zero', () => {
			// unlockHeight < 500000: lockHeight should be 0
			const result = parseLockupVaultData('100000-1000000000-AMA', 0)
			expect(result).not.toBeNull()
			expect(result!.lockEpoch).toBe(0) // clamped
			expect(result!.unlockEpoch).toBe(1) // floor(100000/100000) = 1
		})

		it('returns null for invalid data', () => {
			expect(parseLockupVaultData('invalid', 0)).toBeNull()
			expect(parseLockupVaultData('', 0)).toBeNull()
		})
	})

	describe('Storage Keys', () => {
		const fakeAccount = new Uint8Array(48).fill(0xcd)

		it('buildLockupVaultKeyPrefix builds correct prefix', () => {
			const key = buildLockupVaultKeyPrefix(fakeAccount)
			const prefix = 'bic:lockup:vault:'
			const decoded = new TextDecoder().decode(key.slice(0, prefix.length))
			expect(decoded).toBe(prefix)
			// Ends with ':'
			expect(key[key.length - 1]).toBe(0x3a)
			// Total = prefix(17) + account(48) + colon(1) = 66
			expect(key.length).toBe(prefix.length + 48 + 1)
		})
	})

	describe('extractLockupVaultIndexFromKey', () => {
		it('extracts index from short key (prefix query suffix)', () => {
			expect(extractLockupVaultIndexFromKey('0')).toBe(0)
			expect(extractLockupVaultIndexFromKey('42')).toBe(42)
		})

		it('extracts index from full key with colon', () => {
			expect(extractLockupVaultIndexFromKey('prefix:5')).toBe(5)
		})

		it('returns null for vault data format', () => {
			expect(extractLockupVaultIndexFromKey('229427-75000000000000-AMA')).toBeNull()
			expect(extractLockupVaultIndexFromKey('500000-1000000000-AMA')).toBeNull()
		})

		it('works with Uint8Array input', () => {
			const key = new TextEncoder().encode('7')
			expect(extractLockupVaultIndexFromKey(key)).toBe(7)
		})

		it('returns null for non-numeric keys', () => {
			expect(extractLockupVaultIndexFromKey('abc')).toBeNull()
		})
	})

	describe('ABI structure', () => {
		it('has correct contract name and version', () => {
			expect(LOCKUP_ABI.contractName).toBe('Lockup')
			expect(LOCKUP_ABI.contractVersion).toBe('1.0.0')
		})

		it('has 1 function defined', () => {
			expect(LOCKUP_ABI.abi.length).toBe(1)
		})

		it('has empty errors array', () => {
			expect(LOCKUP_ABI.errors.length).toBe(0)
		})
	})
})
