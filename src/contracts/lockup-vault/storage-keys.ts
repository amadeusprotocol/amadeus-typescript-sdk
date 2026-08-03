/**
 * LockupVault storage keys.
 *
 * Vault records live at `bic:lockup_vault:vault:{owner48}:{index}`. A prefix
 * query scoped to one owner is the cheapest way to read an account's stake —
 * the node returns only that account's vaults, keyed by index alone.
 */

import { fromBase58 } from '../../encoding'

import { LOCKUP_VAULT_COMMISSION_KEY_PREFIX, LOCKUP_VAULT_KEY_PREFIX } from './constants'

const encoder = new TextEncoder()

/** Public key accepted as raw 48 bytes or Base58. */
export type PublicKeyInput = Uint8Array | string

function toPublicKeyBytes(publicKey: PublicKeyInput): Uint8Array {
	const bytes = typeof publicKey === 'string' ? fromBase58(publicKey) : publicKey
	if (bytes.length !== 48) {
		throw new Error(`Invalid public key: expected 48 bytes, got ${bytes.length}`)
	}
	return bytes
}

function concat(...parts: Uint8Array[]): Uint8Array {
	const total = parts.reduce((sum, part) => sum + part.length, 0)
	const out = new Uint8Array(total)
	let offset = 0
	for (const part of parts) {
		out.set(part, offset)
		offset += part.length
	}
	return out
}

/**
 * Prefix matching every vault owned by an account.
 * Format: `bic:lockup_vault:vault:{owner48}:`
 *
 * Keys returned by a prefix query against this are the vault index alone
 * (e.g. `"9"`), because the node strips the queried prefix.
 *
 * @example
 * ```ts
 * const prefix = buildOwnerVaultsKeyPrefix('5pSUZPq...')
 * const entries = await sdk.contract.getPrefixEntries(prefix)
 * ```
 */
export function buildOwnerVaultsKeyPrefix(publicKey: PublicKeyInput): Uint8Array {
	return concat(
		encoder.encode(LOCKUP_VAULT_KEY_PREFIX),
		toPublicKeyBytes(publicKey),
		encoder.encode(':')
	)
}

/**
 * Prefix matching every vault on the chain.
 * Keys returned by a prefix query against this are `{owner48}:{index}`.
 */
export function buildAllVaultsKeyPrefix(): Uint8Array {
	return encoder.encode(LOCKUP_VAULT_KEY_PREFIX)
}

/** Exact key for one vault: `bic:lockup_vault:vault:{owner48}:{index}` */
export function buildVaultKey(publicKey: PublicKeyInput, vaultIndex: number | string): Uint8Array {
	return concat(buildOwnerVaultsKeyPrefix(publicKey), encoder.encode(String(vaultIndex)))
}

/** Prefix matching every validator commission record. */
export function buildAllValidatorCommissionsKeyPrefix(): Uint8Array {
	return encoder.encode(LOCKUP_VAULT_COMMISSION_KEY_PREFIX)
}

/** Exact key for one validator's commission record. */
export function buildValidatorCommissionKey(publicKey: PublicKeyInput): Uint8Array {
	return concat(encoder.encode(LOCKUP_VAULT_COMMISSION_KEY_PREFIX), toPublicKeyBytes(publicKey))
}
