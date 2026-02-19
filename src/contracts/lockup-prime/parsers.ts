import type { NetworkType } from '../../networks'
import { parseStateNumber } from '../../contract-state'
import { fromAtomicAma } from '../../conversion'

import { LockupPrime } from './helpers'
import type { LockupPrimeVault, RawLockupPrimeVaultData } from './types'
import { isValidLockupPrimeTierKey } from './types'

/**
 * Parse raw vault data string into intermediate format
 * Format: {tier}-{multiplier}-{unlock_epoch}-{amount}
 *
 * @param dataStr - Raw vault data string from contract state
 * @returns Parsed data or null if invalid
 */
export function parseRawVaultData(dataStr: string): RawLockupPrimeVaultData | null {
	const match = dataStr.match(/^([^-]+)-(\d+)-(\d+)-(\d+)$/)
	if (!match) return null

	const tier = match[1]!
	const multiplier = Number.parseInt(match[2]!, 10)
	const unlockEpoch = Number.parseInt(match[3]!, 10)
	const amountFlat = Number.parseInt(match[4]!, 10)

	if (!isValidLockupPrimeTierKey(tier)) return null
	if (Number.isNaN(multiplier) || multiplier <= 0) return null
	if (Number.isNaN(unlockEpoch) || unlockEpoch < 0) return null
	if (Number.isNaN(amountFlat) || amountFlat < 0) return null

	return { tier, multiplier, unlockEpoch, amountFlat }
}

/**
 * Parse vault data from contract state into a fully resolved vault object
 *
 * @param vaultData - Raw vault data from contract state (string or Uint8Array)
 * @param vaultIndex - The vault index
 * @param network - Optional network type (defaults to mainnet)
 * @returns Parsed vault or null if invalid
 */
export function parseVaultData(
	vaultData: string | Uint8Array,
	vaultIndex: number,
	network?: NetworkType
): LockupPrimeVault | null {
	try {
		const dataStr =
			typeof vaultData === 'string' ? vaultData : new TextDecoder().decode(vaultData)

		const rawData = parseRawVaultData(dataStr)
		if (!rawData) return null

		const { tier, multiplier, unlockEpoch, amountFlat } = rawData

		const amount = fromAtomicAma(amountFlat)

		const tierDef = LockupPrime.getTier(tier, network)
		const lockEpoch = tierDef ? unlockEpoch - tierDef.epochs : unlockEpoch

		return {
			tier: tier as LockupPrimeVault['tier'],
			multiplier,
			unlockEpoch,
			lockEpoch,
			amount,
			vaultIndex
		}
	} catch {
		return null
	}
}

/**
 * Parse contract state value to number
 * Delegates to SDK's parseStateNumber for consistency
 */
export function parseContractStateNumber(
	value: string | number | Uint8Array | null | undefined
): number {
	return parseStateNumber(value)
}
