/**
 * Amadeus SDK
 *
 * Main SDK class that provides access to all API modules and utilities.
 * This is the primary entry point for interacting with the Amadeus Protocol.
 */

import { AmadeusClient } from './client'
import type { AmadeusSDKConfig } from './types'
import {
	ChainAPI,
	PeerAPI,
	TransactionAPI,
	WalletAPI,
	ContractAPI,
	EpochAPI,
	ProofAPI
} from './api'
import { SDK_VERSION, NODE_API_URL } from './constants'

/**
 * Main Amadeus SDK class
 *
 * Provides a unified interface to interact with the Amadeus Protocol.
 * All API modules are accessible through this class instance.
 *
 * @example
 * ```ts
 * import { AmadeusSDK } from '@amadeus-protocol/sdk'
 *
 * // Initialize SDK with default node URL
 * const sdk = new AmadeusSDK({
 *   baseUrl: 'https://nodes.amadeus.bot/api'
 * })
 *
 * // Query chain
 * const tip = await sdk.chain.getTip()
 * const stats = await sdk.chain.getStats()
 *
 * // Query wallet balances
 * const balance = await sdk.wallet.getBalance('5Kd3N...', 'AMA')
 * const allBalances = await sdk.wallet.getAllBalances('5Kd3N...')
 *
 * // Submit transaction
 * const result = await sdk.transaction.submit(txPacked)
 *
 * // Query contracts
 * const contractData = await sdk.contract.get(key)
 *
 * // Query epoch data
 * const scores = await sdk.epoch.getScore()
 * ```
 */
export class AmadeusSDK {
	/** HTTP client instance */
	public readonly client: AmadeusClient

	/** Chain API module for blockchain queries */
	public readonly chain: ChainAPI

	/** Peer API module for network information */
	public readonly peer: PeerAPI

	/** Transaction API module for submitting transactions */
	public readonly transaction: TransactionAPI

	/** Wallet API module for balance queries */
	public readonly wallet: WalletAPI

	/** Contract API module for smart contract interactions */
	public readonly contract: ContractAPI

	/** Epoch API module for epoch and validator data */
	public readonly epoch: EpochAPI

	/** Proof API module for validator proofs */
	public readonly proof: ProofAPI

	/**
	 * Create a new AmadeusSDK instance
	 *
	 * @param config - SDK configuration
	 * @throws {AmadeusSDKError} If configuration is invalid
	 *
	 * @example
	 * ```ts
	 * // Use default node URL
	 * const sdk = new AmadeusSDK({})
	 *
	 * // Use custom node URL
	 * const sdk = new AmadeusSDK({
	 *   baseUrl: 'https://custom-node.com/api',
	 *   timeout: 60000
	 * })
	 * ```
	 */
	constructor(config: AmadeusSDKConfig = { baseUrl: NODE_API_URL }) {
		this.client = new AmadeusClient(config)

		// Initialize API modules
		this.chain = new ChainAPI(this.client)
		this.peer = new PeerAPI(this.client)
		this.transaction = new TransactionAPI(this.client)
		this.wallet = new WalletAPI(this.client)
		this.contract = new ContractAPI(this.client)
		this.epoch = new EpochAPI(this.client)
		this.proof = new ProofAPI(this.client)
	}

	/**
	 * Get SDK version
	 */
	static getVersion(): string {
		return SDK_VERSION
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): AmadeusSDKConfig {
		return this.client.getConfig()
	}

	/**
	 * Update the base URL
	 */
	setBaseUrl(url: string): void {
		this.client.setBaseUrl(url)
	}

	/**
	 * Update headers
	 */
	setHeaders(headers: Record<string, string>): void {
		this.client.setHeaders(headers)
	}

	/**
	 * Cancel ongoing requests
	 */
	cancel(): void {
		this.client.cancel()
	}
}
