/**
 * Amadeus Protocol Constants
 *
 * This module contains all protocol-level constants used throughout the SDK.
 */

/**
 * SDK version
 */
export const SDK_VERSION = '1.0.0'

/**
 * Byte length of an Amadeus public key (BLS12-381 public key)
 */
export const AMADEUS_PUBLIC_KEY_BYTE_LENGTH = 48

/**
 * Byte length of an Amadeus seed (private key seed)
 */
export const AMADEUS_SEED_BYTE_LENGTH = 64

/**
 * Number of decimal places for AMA token
 */
export const AMA_TOKEN_DECIMALS = 9

/**
 * Multiplier for converting between atomic units and AMA tokens
 */
export const AMA_TOKEN_DECIMALS_MULTIPLIER = 10 ** AMA_TOKEN_DECIMALS

/**
 * Flat network transfer fee in AMA for standard transfers
 */
export const AMA_TRANSFER_FEE = 0.02

/**
 * Default explorer URL
 */
export const EXPLORER_URL = 'https://explorer.ama.one'

/**
 * Default node API URL
 */
export const NODE_API_URL = 'https://nodes.amadeus.bot/api'

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 30000
