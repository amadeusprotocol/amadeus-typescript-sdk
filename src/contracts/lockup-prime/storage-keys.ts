import { LockupPrime } from './helpers'

/**
 * Generic function to build a storage key for an account
 */
function buildStorageKey(
	keyName: string,
	accountBinary: Uint8Array,
	appendColon = false
): Uint8Array {
	const storageKey = LockupPrime.getStorageKey(keyName)
	if (!storageKey) {
		throw new Error(`Storage key '${keyName}' not found in ABI`)
	}

	const prefix = LockupPrime.getKeyPrefix(keyName)
	if (!prefix) {
		throw new Error(`Could not extract prefix for storage key '${keyName}'`)
	}

	const prefixBytes = new TextEncoder().encode(prefix)
	const resultLength = prefixBytes.length + accountBinary.length + (appendColon ? 1 : 0)
	const result = new Uint8Array(resultLength)

	result.set(prefixBytes, 0)
	result.set(accountBinary, prefixBytes.length)

	if (appendColon) {
		result[result.length - 1] = 0x3a // ':'
	}

	return result
}

/**
 * Build vault key prefix for an account
 * Format: bic:lockup_prime:vault:{account_48bytes}:
 */
export function buildLockupPrimeVaultKeyPrefix(accountBinary: Uint8Array): Uint8Array {
	return buildStorageKey('vault', accountBinary, true)
}

/**
 * Build daily streak key for an account
 * Format: bic:lockup_prime:daily_streak:{account_48bytes}
 */
export function buildDailyStreakKey(accountBinary: Uint8Array): Uint8Array {
	return buildStorageKey('daily_streak', accountBinary, false)
}

/**
 * Build next check-in epoch key for an account
 * Format: bic:lockup_prime:next_checkin_epoch:{account_48bytes}
 */
export function buildNextCheckinEpochKey(accountBinary: Uint8Array): Uint8Array {
	return buildStorageKey('next_checkin_epoch', accountBinary, false)
}

/**
 * Extract vault index from key
 * Key format: bic:lockup_prime:vault:{account_48bytes}:{vault_index}
 *
 * Note: When using prefix queries, the key might be:
 * - Full key: bic:lockup_prime:vault:{account_48bytes}:{vault_index}
 * - Suffix only: {vault_index} (just the part after the prefix)
 */
export function extractLockupPrimeVaultIndexFromKey(key: string | Uint8Array): number | null {
	try {
		const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key
		const keyStr = typeof key === 'string' ? key : new TextDecoder().decode(key)

		// Check if key is vault data format FIRST
		// If key looks like vault data (e.g., '7d-13-10-100000000000'), don't try to extract index
		const isVaultDataFormat = /^[^-]+-\d+-\d+-\d+$/.test(keyStr)
		if (isVaultDataFormat) {
			return null
		}

		// If the key is very short (likely just the vault index suffix from prefix query)
		if (keyBytes.length < 10) {
			const directParse = parseInt(keyStr, 10)
			if (!isNaN(directParse) && directParse >= 0) {
				return directParse
			}
		}

		// Find the last colon (':') byte (0x3A)
		let lastColonIndex = -1
		for (let i = keyBytes.length - 1; i >= 0; i--) {
			if (keyBytes[i] === 0x3a) {
				lastColonIndex = i
				break
			}
		}

		if (lastColonIndex === -1 || lastColonIndex === keyBytes.length - 1) {
			const wholeKeyParse = parseInt(keyStr, 10)
			return isNaN(wholeKeyParse) ? null : wholeKeyParse
		}

		// Extract vault index from after the last colon
		const indexBytes = keyBytes.slice(lastColonIndex + 1)
		const indexStr = new TextDecoder().decode(indexBytes)
		const vaultIndex = parseInt(indexStr, 10)

		return isNaN(vaultIndex) ? null : vaultIndex
	} catch {
		return null
	}
}
