/**
 * Explorer URL Utilities
 *
 * This module provides utilities for generating Amadeus explorer URLs.
 */

import { NETWORK_EXPLORER_URLS, NetworkType } from './networks'

/**
 * Types of explorer links
 */
export enum ExplorerType {
	TRANSACTION = 'tx',
	ADDRESS = 'address',
	TIP = 'tip'
}

/**
 * Constructs an explorer URL for a given type and ID
 *
 * @param type - The type of entity (transaction, address, tip)
 * @param id - The ID/hash/address of the entity
 * @param baseUrl - Optional base explorer URL (defaults to mainnet explorer URL)
 * @returns The full explorer URL
 *
 * @example
 * ```ts
 * makeExplorerUrl(ExplorerType.TRANSACTION, 'abc123')
 * // Returns: "https://explorer.ama.one/network/tx/abc123"
 *
 * makeExplorerUrl(ExplorerType.ADDRESS, 'xyz789', 'https://testnet.explorer.ama.one')
 * // Returns: "https://testnet.explorer.ama.one/network/address/xyz789"
 * ```
 */
export function makeExplorerUrl(type: ExplorerType, id: string, baseUrl?: string): string {
	const explorerBase = baseUrl || NETWORK_EXPLORER_URLS[NetworkType.MAINNET]
	return `${explorerBase}/network/${type}/${id}`
}

/**
 * Create a transaction explorer URL
 *
 * @param txHash - Transaction hash
 * @param baseUrl - Optional base explorer URL
 * @returns Transaction explorer URL
 */
export function makeTransactionUrl(txHash: string, baseUrl?: string): string {
	return makeExplorerUrl(ExplorerType.TRANSACTION, txHash, baseUrl)
}

/**
 * Create an address explorer URL
 *
 * @param address - Wallet address
 * @param baseUrl - Optional base explorer URL
 * @returns Address explorer URL
 */
export function makeAddressUrl(address: string, baseUrl?: string): string {
	return makeExplorerUrl(ExplorerType.ADDRESS, address, baseUrl)
}
