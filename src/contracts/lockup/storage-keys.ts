import { Lockup } from './helpers'

/**
 * Generic function to build a storage key for an account
 */
function buildStorageKey(
	keyName: string,
	accountBinary: Uint8Array,
	appendColon = false
): Uint8Array {
	const storageKey = Lockup.getStorageKey(keyName)
	if (!storageKey) {
		throw new Error(`Storage key '${keyName}' not found in ABI`)
	}

	const prefix = Lockup.getKeyPrefix(keyName)
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
 * Format: bic:lockup:vault:{account_48bytes}:
 */
export function buildLockupVaultKeyPrefix(accountBinary: Uint8Array): Uint8Array {
	return buildStorageKey('vault', accountBinary, true)
}

/**
 * Extract vault index from key
 * Key format: bic:lockup:vault:{account_48bytes}:{vault_index}
 *
 * Note: When using prefix queries, the key might be:
 * - Full key: bic:lockup:vault:{account_48bytes}:{vault_index}
 * - Suffix only: {vault_index} (just the part after the prefix)
 */
export function extractLockupVaultIndexFromKey(key: string | Uint8Array): number | null {
	try {
		const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key
		const keyStr = typeof key === 'string' ? key : new TextDecoder().decode(key)

		// Check if key is vault data format FIRST
		// If key looks like vault data (e.g., '229427-75000000000000-AMA'), don't try to extract index
		const isVaultDataFormat = /^\d+-\d+-[A-Za-z]+$/.test(keyStr)
		if (isVaultDataFormat) {
			return null
		}

		// If the key is very short (likely just the vault index suffix from prefix query)
		if (keyBytes.length < 10) {
			const directParse = Number.parseInt(keyStr, 10)
			if (!Number.isNaN(directParse) && directParse >= 0) {
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
			const wholeKeyParse = Number.parseInt(keyStr, 10)
			return Number.isNaN(wholeKeyParse) ? null : wholeKeyParse
		}

		// Extract vault index from after the last colon
		const indexBytes = keyBytes.slice(lastColonIndex + 1)
		const indexStr = new TextDecoder().decode(indexBytes)
		const vaultIndex = Number.parseInt(indexStr, 10)

		return Number.isNaN(vaultIndex) ? null : vaultIndex
	} catch {
		return null
	}
}
