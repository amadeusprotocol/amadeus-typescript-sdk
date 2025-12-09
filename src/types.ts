/**
 * Type Definitions
 *
 * This module contains all TypeScript type definitions used throughout the SDK.
 */

// ============================================================================
// Core Types
// ============================================================================

// ----------------------------------------------------------------------------
// Serialization Types
// ----------------------------------------------------------------------------

/**
 * Serializable value types for canonical encoding (VecPack)
 */
export type SerializableValue =
	| null
	| boolean
	| number
	| bigint
	| string
	| Uint8Array
	| SerializableValue[]
	| Map<SerializableValue, SerializableValue>
	| { [key: string]: SerializableValue }

/**
 * Decoded value types (Map is returned for objects during decode)
 */
export type DecodedValue =
	| null
	| boolean
	| bigint
	| Uint8Array
	| DecodedValue[]
	| Map<DecodedValue, DecodedValue>

// ----------------------------------------------------------------------------
// Cryptographic Types
// ----------------------------------------------------------------------------

/**
 * Key pair structure containing public and private keys as Base58 strings
 */
export interface KeyPair {
	/** Base58 encoded public key */
	publicKey: string
	/** Base58 encoded private key (seed) */
	privateKey: string
}

// ----------------------------------------------------------------------------
// API Client Types
// ----------------------------------------------------------------------------

/**
 * SDK configuration
 */
export interface AmadeusSDKConfig {
	/** Base URL of the Amadeus node API (defaults to NODE_API_URL) */
	baseUrl?: string
	/** Request timeout in milliseconds (default: 30000) */
	timeout?: number
	/** Custom headers to include in requests */
	headers?: Record<string, string>
}

/**
 * API response wrapper
 * Note: Index signature needed for dynamic response properties
 */
export interface ApiResponse {
	error: 'ok' | 'not_found' | string
	[key: string]: unknown
}

/**
 * SDK error class
 */
export class AmadeusSDKError extends Error {
	constructor(
		message: string,
		public status?: number,
		public response?: Record<string, unknown>
	) {
		super(message)
		this.name = 'AmadeusSDKError'
	}
}

// ============================================================================
// Enums
// ============================================================================

/**
 * Transaction validation error codes
 */
export enum TransactionValidationError {
	OK = 'ok',
	TOO_LARGE = 'too_large',
	TX_NOT_CANONICAL = 'tx_not_canonical',
	INVALID_HASH = 'invalid_hash',
	INVALID_SIGNATURE = 'invalid_signature',
	NONCE_NOT_INTEGER = 'nonce_not_integer',
	NONCE_TOO_HIGH = 'nonce_too_high',
	ACTIONS_MUST_BE_LIST = 'actions_must_be_list',
	ACTIONS_LENGTH_MUST_BE_1 = 'actions_length_must_be_1',
	OP_MUST_BE_CALL = 'op_must_be_call',
	CONTRACT_MUST_BE_BINARY = 'contract_must_be_binary',
	FUNCTION_MUST_BE_BINARY = 'function_must_be_binary',
	ARGS_MUST_BE_LIST = 'args_must_be_list',
	ARG_MUST_BE_BINARY = 'arg_must_be_binary',
	INVALID_MODULE = 'invalid_module',
	INVALID_FUNCTION = 'invalid_function',
	INVALID_MODULE_FOR_SPECIAL_MEETING = 'invalid_module_for_special_meeting',
	INVALID_FUNCTION_FOR_SPECIAL_MEETING = 'invalid_function_for_special_meeting',
	UNKNOWN = 'unknown'
}

/**
 * Transaction event type
 */
export enum TransactionEventType {
	SENT = 'sent',
	RECEIVED = 'recv'
}

/**
 * Contract names
 */
export enum Contract {
	EPOCH = 'Epoch',
	COIN = 'Coin',
	CONTRACT = 'Contract'
}

/**
 * Contract function names
 */
export enum ContractFunction {
	TRANSFER = 'transfer',
	SUBMIT_SOL = 'submit_sol',
	SET_EMISSION_ADDRESS = 'set_emission_address',
	SLASH_TRAINER = 'slash_trainer',
	DEPLOY = 'deploy',
	CREATE_AND_MINT = 'create_and_mint',
	MINT = 'mint',
	PAUSE = 'pause'
}

// ============================================================================
// Domain Types
// ============================================================================

// ----------------------------------------------------------------------------
// Transaction Types
// ----------------------------------------------------------------------------

/**
 * Transaction action structure (for building transactions)
 */
export interface TransactionAction extends Record<string, SerializableValue> {
	op: 'call'
	contract: string
	function: string
	args: SerializableValue[]
}

/**
 * Transaction action structure (as returned by API)
 */
export interface TransactionActionResponse {
	op: 'call'
	contract: string
	function: string | ContractFunction
	args: (string | number | boolean)[]
	attached_symbol?: string
	attached_amount?: string
}

/**
 * Transaction action structure (legacy/alternative format)
 */
export interface TransactionActionBody {
	op: 'call'
	contract: string
	function: ContractFunction
	args: (string | Uint8Array)[]
}

/**
 * Transaction body structure
 */
export interface TransactionBody {
	signer: Uint8Array | string
	nonce: number
	action: TransactionActionBody
}

/**
 * Unsigned transaction structure
 */
export interface UnsignedTransaction extends Record<string, SerializableValue> {
	signer: Uint8Array
	nonce: bigint
	action: TransactionAction
}

/**
 * Unsigned transaction with its hash
 */
export interface UnsignedTransactionWithHash {
	/** Unsigned transaction structure */
	tx: UnsignedTransaction
	/** Transaction hash as Uint8Array */
	hash: Uint8Array
}

/**
 * Packed transaction type
 */
export type TransactionPacked = Uint8Array

/**
 * Unpacked transaction structure
 */
export interface TransactionUnpacked {
	tx: TransactionBody
	tx_encoded: Uint8Array
	hash: Uint8Array
	signature: Uint8Array
	metadata?: {
		entry_hash: Uint8Array | string
		entry_slot: number
		tx_event?: TransactionEventType
	}
}

/**
 * Transaction validation result
 */
export type TransactionValidationResult =
	| { error: 'ok'; txu: TransactionUnpacked }
	| { error: TransactionValidationError }

/**
 * Result of building a transaction
 */
export interface BuildTransactionResult {
	/** Transaction hash as Base58 string */
	txHash: string
	/** Packed transaction ready for submission */
	txPacked: Uint8Array
}

/**
 * Input parameters for building a transfer transaction
 */
export interface TransferTransactionInput {
	/** Base58 encoded sender private key (seed) */
	senderPrivkey: string
	/** Base58 encoded recipient address */
	recipient: string
	/** Amount in human-readable format */
	amount: number
	/** Token symbol (e.g., 'AMA') */
	symbol: string
}

/**
 * Transaction metadata
 */
export interface TransactionMetadata {
	entry_hash: string
	entry_slot: number
	tx_event?: TransactionEventType
}

/**
 * Transaction result
 */
export interface TransactionResult {
	error: TransactionValidationError | string
}

/**
 * Transaction data returned from the API
 */
export interface Transaction {
	/** Transaction hash (Base58 encoded) */
	hash: string
	/** Transaction signature (Base58 encoded) */
	signature: string
	/** Transaction data */
	tx: {
		/** Signer's public key (Base58 encoded) */
		signer: string
		/** Transaction nonce */
		nonce: number
		/** Transaction action */
		action: TransactionActionResponse
	}
	/** Transaction metadata */
	metadata: TransactionMetadata
	/** Transaction result */
	result: TransactionResult
}

/**
 * Transaction event structure
 */
export interface TransactionEvent {
	type: TransactionEventType
	txid: string
	amount: string
	symbol: string
	timestamp: number
}

/**
 * Transaction filters for querying transactions
 */
export interface TransactionFilters {
	limit?: number
	offset?: number
	sort?: 'asc' | 'desc'
	cursor?: string
	cursor_b58?: string
	contract?: string | Contract
	contract_b58?: string
	function?: string | ContractFunction
	type?: TransactionEventType
}

// ----------------------------------------------------------------------------
// Chain Types
// ----------------------------------------------------------------------------

/**
 * Chain entry header structure
 */
export interface ChainEntryHeader {
	height: number
	timestamp: number
	mutations_hash: string
	slot: number
	prev_slot: number
	prev_hash: string
	dr: string
	vr: string
	signer: string
	txs_hash: string
	root_tx?: string
	root_validator?: string
}

/**
 * Chain entry structure
 */
export interface ChainEntry {
	hash: string
	height: number
	timestamp: number
	mutations_hash: string
	tx_count?: number
	mask?: string
	consensus?: {
		score: number
		finality_reached: boolean
		mut_hash: string
	}
	header_unpacked: ChainEntryHeader
}

/**
 * Chain statistics
 */
export interface ChainStats {
	height: number
	total_entries: number
	total_transactions: number
	tip_hash?: string
	tip?: ChainEntry
	tx_pool_size?: number
	cur_validator?: string
	next_validator?: string
	emission_for_epoch?: number
	circulating?: number
	total_supply_y3?: number
	total_supply_y30?: number
	pflops?: number
}

// ----------------------------------------------------------------------------
// Wallet Types
// ----------------------------------------------------------------------------

/**
 * Token balance structure
 */
export interface TokenBalance {
	float: number
	symbol: string
	flat: number
}

/**
 * Wallet balance wrapper
 */
export interface WalletBalance {
	balance: {
		float: number
		flat: number
		symbol: string
	}
}

/**
 * Wallet balances map
 */
export interface WalletBalances {
	[symbol: string]: {
		float: number
		flat: number
		symbol: string
	}
}

// ----------------------------------------------------------------------------
// Contract Types
// ----------------------------------------------------------------------------

/**
 * Contract data value can be any JSON-serializable value
 */
export type ContractDataValue =
	| string
	| number
	| boolean
	| null
	| ContractDataValue[]
	| { [key: string]: ContractDataValue }

/**
 * Contract data structure
 */
export interface ContractData {
	contract: string
	key: string
	value: ContractDataValue
}

/**
 * Richlist entry structure
 */
export interface RichlistEntry {
	address: string
	balance: string
	symbol: string
	rank: number
}

// ----------------------------------------------------------------------------
// Epoch Types
// ----------------------------------------------------------------------------

/**
 * Epoch score structure
 */
export type EpochScoreAll = [string, number][]
export type EpochScoreSingle = { error: 'ok'; score: number }
export type EpochScore = EpochScoreAll | EpochScoreSingle

/**
 * Emission address structure
 */
export interface EmissionAddress {
	address: string
	pk: string
}

// ----------------------------------------------------------------------------
// Peer Types
// ----------------------------------------------------------------------------

/**
 * Peer information structure
 */
export interface PeerInfo {
	pk: string
	version: string
	latency?: number
	temporal_height?: number
	temporal_hash?: string
	rooted_height?: number
	rooted_hash?: string
	is_trainer?: boolean
	slot_speed?: number
	online?: boolean
	in_slot?: boolean
}

/**
 * ANR (Autonomous Network Registry) information structure
 */
export interface ANRInfo {
	pk: string
	pop: string
	signature: string
	ip4: string
	port: number
	handshaked: boolean
	isChainPop: boolean
	version: string
	ts: number
}

// ----------------------------------------------------------------------------
// Proof Types
// ----------------------------------------------------------------------------

/**
 * Validator proof node structure
 */
export interface ValidatorProofNode {
	direction: string
	hash: string
}

/**
 * Validator proof data structure
 */
export interface ValidatorProofData {
	root: string
	path: string
	hash: string
	nodes: ValidatorProofNode[]
}

// ============================================================================
// API Response Types
// ============================================================================

// ----------------------------------------------------------------------------
// Chain API Response Types
// ----------------------------------------------------------------------------

export interface GetTipResponse {
	entry: ChainEntry
}

export interface GetStatsResponse {
	stats: ChainStats
}

export interface GetByHashResponse {
	entry: ChainEntry
}

export interface GetByHeightResponse {
	entries: ChainEntry[]
}

export interface GetTransactionEventsByAccountResponse {
	cursor: string
	txs: TransactionEvent[]
}

export interface GetTransactionsInEntryResponse {
	txs: Transaction[]
}

// ----------------------------------------------------------------------------
// Wallet API Response Types
// ----------------------------------------------------------------------------

/**
 * Query parameters for getting token balance
 */
export interface GetTokenBalanceQuery {
	address: string
	symbol?: string
}

/**
 * Response for getting token balance
 */
export interface GetTokenBalanceResponse {
	error: string
	data: TokenBalance
}

/**
 * Query parameters for getting wallet transactions
 */
export interface GetWalletTransactionsQuery {
	address: string
	contract?: Contract
	function?: ContractFunction
	type?: TransactionEventType
	sort?: 'asc' | 'desc'
	limit?: number
	offset?: number
	cursor?: string
}

/**
 * Response for getting wallet transactions
 */
export interface GetWalletTransactionsResponse {
	cursor: string
	txs: Transaction[]
}

export interface GetAllBalancesResponse {
	error?: string
	balances: TokenBalance[] | WalletBalances
}

// ----------------------------------------------------------------------------
// Contract API Response Types
// ----------------------------------------------------------------------------

export interface ValidateBytecodeResponse {
	error: string
}

export interface GetRichlistResponse {
	richlist: RichlistEntry[]
}

// ----------------------------------------------------------------------------
// Epoch API Response Types
// ----------------------------------------------------------------------------

export interface GetEmissionAddressResponse {
	error: 'ok'
	emission_address: string | null
}

/**
 * Response for checking if solution is in epoch
 */
export interface GetSolInEpochResponse {
	error: 'ok' | 'invalid_epoch' | 'sol_not_found'
}

// ----------------------------------------------------------------------------
// Peer API Response Types
// ----------------------------------------------------------------------------

export interface GetNodesResponse {
	nodes: PeerInfo[]
}

export interface GetTrainersResponse {
	trainers: PeerInfo[]
}

export interface GetRemovedTrainersResponse {
	removed_trainers: PeerInfo[]
}

export interface GetANRsResponse {
	anrs: ANRInfo[]
}

export interface GetANRByPkResponse {
	anr: ANRInfo
}

// ----------------------------------------------------------------------------
// Transaction API Response Types
// ----------------------------------------------------------------------------

/**
 * Query parameters for submitting a transaction
 */
export interface SubmitTransactionRequestQuery {
	txPacked: Uint8Array
}

export interface SubmitTransactionResponse {
	error: TransactionValidationError | string
	hash?: string
}

/**
 * Response for submit and wait transaction
 */
export interface SubmitAndWaitTransactionResponse {
	error: TransactionValidationError | string
	hash?: string
	entry_hash?: string
	result?: {
		error: TransactionValidationError | string
	}
}

// ----------------------------------------------------------------------------
// Proof API Response Types
// ----------------------------------------------------------------------------

/**
 * Validator proof response structure
 */
export interface ProofValidators {
	key: string
	value: string
	validators: string[]
	proof: ValidatorProofData
}
