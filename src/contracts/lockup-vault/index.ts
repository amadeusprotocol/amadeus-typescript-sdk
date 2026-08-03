/**
 * LockupVault — the Amadeus staking contract.
 *
 * Not to be confused with `contracts/lockup` (`bic:lockup:vault:`, the vesting
 * lockup) or `contracts/lockup-prime` (`bic:lockup_prime:vault:`, points-based
 * locking). This module covers `bic:lockup_vault:`, where AMA is staked to back
 * a validator and earn a locked-in APY.
 *
 * @example Read an account's staking position
 * ```ts
 * const { height } = (await sdk.chain.getStats()).stats
 * const prefix = buildOwnerVaultsKeyPrefix(publicKey)
 * const entries = await sdk.contract.getPrefixEntries(prefix)
 * const vaults = parseLockupVaultEntries(entries, { currentEpoch: epochFromHeight(height) })
 * const summary = summarizeLockupVaults(vaults)
 * ```
 */

export * from './constants'
export * from './types'
export * from './storage-keys'
export * from './parsers'
export * from './summary'
