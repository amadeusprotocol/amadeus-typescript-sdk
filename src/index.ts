/**
 * @amadeus-protocol/sdk
 *
 * Official TypeScript/JavaScript SDK for Amadeus Protocol
 *
 * This SDK provides:
 * - Canonical serialization (VecPack)
 * - Cryptographic operations (BLS12-381, Base58)
 * - Transaction building and signing
 * - Token amount conversions
 * - Full-featured API client for Amadeus nodes
 *
 * @example
 * ```ts
 * import { AmadeusSDK, TransactionBuilder, generateKeypair } from '@amadeus-protocol/sdk'
 *
 * // Initialize SDK
 * const sdk = new AmadeusSDK()
 *
 * // Generate keypair
 * const keypair = generateKeypair()
 *
 * // Build and submit transaction
 * const builder = new TransactionBuilder(keypair.privateKey)
 * const { txHash, txPacked } = builder.transfer({
 *   recipient: '5Kd3N...',
 *   amount: 10.5,
 *   symbol: 'AMA'
 * })
 *
 * const result = await sdk.transaction.submit(txPacked)
 * ```
 *
 * @packageDocumentation
 */

export * from './types'
export * from './constants'
export * from './serialization'
export * from './crypto'
export * from './conversion'
export * from './encoding'
export * from './encryption'
export * from './transaction-builder'
export * from './client'
export * from './api'
export * from './sdk'
