import { fromAtomicAma } from '../../conversion'

import type { LockupVault, RawLockupVaultData } from './types'

/**
 * Parse raw lockup vault data string into intermediate format
 * Format: {unlock_height}-{amount}-{symbol}
 *
 * @param dataStr - Raw vault data string from contract state
 * @returns Parsed data or null if invalid
 */
export function parseRawLockupVaultData(dataStr: string): RawLockupVaultData | null {
	const match = dataStr.match(/^(\d+)-(\d+)-([A-Za-z]+)$/)
	if (!match) return null

	const unlockHeight = Number.parseInt(match[1]!, 10)
	const amountFlat = Number.parseInt(match[2]!, 10)
	const symbol = match[3]!

	if (Number.isNaN(unlockHeight) || unlockHeight < 0) return null
	if (Number.isNaN(amountFlat) || amountFlat < 0) return null
	if (symbol !== 'AMA') return null

	return { unlockHeight, amountFlat, symbol }
}

/**
 * Parse lockup vault data from contract state
 * Format: {unlock_height}-{amount}-{symbol}
 * These vaults are locked for 5 epochs (100,000 * 5 = 500,000 heights)
 *
 * @param vaultData - Raw vault data from contract state (string or Uint8Array)
 * @param vaultIndex - The vault index
 * @returns Parsed vault or null if invalid
 */
export function parseLockupVaultData(
	vaultData: string | Uint8Array,
	vaultIndex: number
): LockupVault | null {
	try {
		const dataStr =
			typeof vaultData === 'string' ? vaultData : new TextDecoder().decode(vaultData)

		const rawData = parseRawLockupVaultData(dataStr)
		if (!rawData) return null

		const { unlockHeight, amountFlat } = rawData

		const amount = fromAtomicAma(amountFlat)

		// Regular lockup vaults created from early unlock are locked for 5 epochs
		// 5 epochs = 100,000 * 5 = 500,000 heights
		const lockHeight = Math.max(0, unlockHeight - 500_000)

		// Approximate epochs: 1 epoch ~ 100,000 heights
		const unlockEpoch = Math.floor(unlockHeight / 100_000)
		const lockEpoch = Math.floor(lockHeight / 100_000)

		return {
			unlockEpoch,
			lockEpoch,
			amount,
			vaultIndex,
			vaultType: 'vesting',
			unlockHeight
		}
	} catch {
		return null
	}
}
