/**
 * Network Configuration
 *
 * This module provides network configuration for Amadeus Protocol networks.
 */

/**
 * Network types enum
 */
export enum NetworkType {
	MAINNET = 'mainnet',
	TESTNET = 'testnet',
	CUSTOM = 'custom'
}

/**
 * Network configuration interface
 */
export interface NetworkConfig {
	rpcUrl: string
	explorerUrl: string
}

/**
 * Network API URLs
 */
export const NETWORK_URLS: { [key in Exclude<NetworkType, NetworkType.CUSTOM>]: string } = {
	[NetworkType.MAINNET]: 'https://nodes.amadeus.bot',
	[NetworkType.TESTNET]: 'https://testnet-rpc.ama.one'
}

/**
 * Network Explorer URLs
 */
export const NETWORK_EXPLORER_URLS: { [key in Exclude<NetworkType, NetworkType.CUSTOM>]: string } = {
	[NetworkType.MAINNET]: 'https://explorer.ama.one',
	[NetworkType.TESTNET]: 'https://testnet.explorer.ama.one'
}

/**
 * Network configurations (RPC + Explorer)
 */
export const NETWORK_CONFIGS: { [key in Exclude<NetworkType, NetworkType.CUSTOM>]: NetworkConfig } =
	{
		[NetworkType.MAINNET]: {
			rpcUrl: NETWORK_URLS[NetworkType.MAINNET],
			explorerUrl: NETWORK_EXPLORER_URLS[NetworkType.MAINNET]
		},
		[NetworkType.TESTNET]: {
			rpcUrl: NETWORK_URLS[NetworkType.TESTNET],
			explorerUrl: NETWORK_EXPLORER_URLS[NetworkType.TESTNET]
		}
	}

/**
 * Testnet Faucet URL
 */
export const TESTNET_FAUCET_URL = 'https://mcp.ama.one/testnet-faucet'
