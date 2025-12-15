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
 * Transaction execution error codes.
 * These are returned when contract execution fails.
 */
export enum TransactionExecutionError {
	/** Success - execution completed successfully */
	OK = 'ok',
	/** Unknown error (when panic payload cannot be converted to string) */
	UNKNOWN = 'unknown',
	/** Contract execution was aborted */
	AS_ABORT = 'as_abort',

	// Execution budget errors
	EXEC_INVALID_AMOUNT_NEGATIVE = 'exec_invalid_amount_negative',
	EXEC_INSUFFICIENT_EXEC_BUDGET = 'exec_insufficient_exec_budget',
	EXEC_CRITICAL_UNDERFLOW = 'exec_critical_underflow',

	// Storage budget errors
	EXEC_STORAGE_INVALID_AMOUNT_NEGATIVE = 'exec_storage_invalid_amount_negative',
	EXEC_INSUFFICIENT_STORAGE_BUDGET = 'exec_insufficient_storage_budget',
	EXEC_STORAGE_CRITICAL_UNDERFLOW = 'exec_storage_critical_underflow',

	// KV operation errors
	EXEC_TOO_LARGE_KEY_SIZE = 'exec_too_large_key_size',
	EXEC_TOO_LARGE_VALUE_SIZE = 'exec_too_large_value_size',
	EXEC_KV_PUT_FAILED = 'exec_kv_put_failed',
	EXEC_KV_INCREMENT_FAILED = 'exec_kv_increment_failed',
	EXEC_KV_INCREMENT_INVALID_INTEGER = 'exec_kv_increment_invalid_integer',
	EXEC_KV_INCREMENT_INTEGER_OVERFLOW = 'exec_kv_increment_integer_overflow',
	KV_PUT_FAILED = 'kv_put_failed',
	EXEC_KV_DELETE_FAILED = 'exec_kv_delete_failed',
	EXEC_KV_SET_BIT_FAILED = 'exec_kv_set_bit_failed',
	EXEC_CANNOT_WRITE_DURING_VIEW = 'exec_cannot_write_during_view',

	// WASM execution errors
	EXEC_RETURN_VALUE_TOO_LARGE = 'exec_return_value_too_large',
	EXEC_INSTANCE_NOT_INJECTED = 'exec_instance_not_injected',
	EXEC_PTR_TERM_TOO_SHORT = 'exec_ptr_term_too_short',
	EXEC_PTR_TERM_TOO_LONG = 'exec_ptr_term_too_long',
	EXEC_LOG_INVALID_PTR = 'exec_log_invalid_ptr',
	EXEC_CALL_TABLE_INVALID_PTR = 'exec_call_table_invalid_ptr',
	EXEC_CALL_TOO_MANY_ARGS = 'exec_call_too_many_args',
	EXEC_READ_CALL_TABLE_ERROR = 'exec_read_call_table_error',
	EXEC_CALL_PTR_TERM_TOO_LONG = 'exec_call_ptr_term_too_long',
	EXEC_READ_CALL_TABLE_DATA_ERROR = 'exec_read_call_table_data_error',
	EXEC_CALL_EXTRA_INVALID = 'exec_call_extra_invalid',
	EXEC_CALL_EXTRA_TOO_MANY = 'exec_call_extra_too_many',
	EXEC_READ_EXTRA_ROW = 'exec_read_extra_row',
	EXEC_READ_EXTRA_DATA = 'exec_read_extra_data',
	EXEC_CALL_MISSING_ARGS = 'exec_call_missing_args',
	EXEC_MEMWRITE = 'exec_memwrite',
	EXEC_LOG_MSG_SIZE_EXCEEDED = 'exec_log_msg_size_exceeded',
	EXEC_LOGS_TOTAL_SIZE_EXCEEDED = 'exec_logs_total_size_exceeded',
	EXEC_LOGS_TOTAL_ELEMENTS_EXCEEDED = 'exec_logs_total_elements_exceeded',
	EXEC_INVALID_MODULE = 'exec_invalid_module',
	EXEC_MEMORY_ALLOC = 'exec_memory_alloc',
	EXEC_ARG_LEN_WRITE = 'exec_arg_len_write',
	EXEC_ARG_WRITE = 'exec_arg_write',
	EXEC_INSTANCE = 'exec_instance',
	EXEC_INIT_MEMWRITE = 'exec_init_memwrite',
	EXEC_DESERIALIZE_ERR = 'exec_deserialize_err',
	EXEC_SERIALIZE_ERR = 'exec_serialize_err',
	EXEC_FUNCTION_NOT_FOUND = 'exec_function_not_found',
	EXEC_ERROR = 'exec_error',

	// Contract/action errors
	INVALID_EPOCH = 'invalid_epoch',
	INVALID_BIC_ACTION = 'invalid_bic_action',
	INVALID_FUNCTION = 'invalid_function',
	ACCOUNT_HAS_NO_BYTECODE = 'account_has_no_bytecode',
	INVALID_ATTACHED_AMOUNT = 'invalid_attached_amount',
	ATTACHED_AMOUNT_INSUFFICIENT_FUNDS = 'attached_amount_insufficient_funds',
	WASM_NOOP = 'wasm_noop',
	INVALID_BYTECODE = 'invalid_bytecode',

	// Coin contract errors
	INVALID_ARGS = 'invalid_args',
	INVALID_AMOUNT = 'invalid_amount',
	INVALID_RECEIVER_PK = 'invalid_receiver_pk',
	INSUFFICIENT_FUNDS = 'insufficient_funds',
	PAUSED = 'paused',
	SOULBOUND = 'soulbound',
	INVALID_BALANCE = 'invalid_balance',
	INVALID_TOTAL_SUPPLY = 'invalid_total_supply',
	INVALID_SYMBOL = 'invalid_symbol',
	SYMBOL_TOO_SHORT = 'symbol_too_short',
	SYMBOL_TOO_LONG = 'symbol_too_long',
	SYMBOL_RESERVED = 'symbol_reserved',
	SYMBOL_EXISTS = 'symbol_exists',
	INVALID_DECIMALS = 'invalid_decimals',
	NO_PERMISSIONS = 'no_permissions',
	SYMBOL_DOESNT_EXIST = 'symbol_doesnt_exist',
	NOT_MINTABLE = 'not_mintable',
	INVALID_DIRECTION = 'invalid_direction',
	NOT_PAUSABLE = 'not_pausable',

	// Lockup contract errors
	INVALID_DURATION = 'invalid_duration',
	INVALID_VAULT = 'invalid_vault',
	INVALID_UNLOCK_HEIGHT = 'invalid_unlock_height',
	INVALID_UNLOCK_AMOUNT = 'invalid_unlock_amount',
	VAULT_IS_LOCKED = 'vault_is_locked',

	// Lockup Prime contract errors
	INVALID_TIER = 'invalid_tier',
	INVALID_MULTIPLIER = 'invalid_multiplier',
	INVALID_UNLOCK_EPOCH = 'invalid_unlock_epoch',
	INVALID_NEXT_CHECKIN_EPOCH = 'invalid_next_checkin_epoch',

	// NFT contract errors
	INSUFFICIENT_TOKENS = 'insufficient_tokens',
	INVALID_COLLECTION = 'invalid_collection',
	COLLECTION_TOO_SHORT = 'collection_too_short',
	COLLECTION_TOO_LONG = 'collection_too_long',
	COLLECTION_RESERVED = 'collection_reserved',
	COLLECTION_EXISTS = 'collection_exists',
	COLLECTION_DOESNT_EXIST = 'collection_doesnt_exist',

	// Integer parsing errors
	INVALID_INTEGER = 'invalid_integer'
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
		entry_height: number
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
	entry_height: number
	tx_event?: TransactionEventType
}

/**
 * Transaction receipt structure
 */
export interface TransactionReceipt {
	/** Execution result  */
	result: TransactionExecutionError | string
	/** Execution logs (array of ASCII dump strings) */
	logs: string[]
	/** Success flag */
	success: boolean
	/** Execution cost used */
	exec_used: string
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
	result: TransactionResult // @deprecated: use receipt instead
	/** Transaction receipt (execution result and logs) */
	receipt: TransactionReceipt
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
	metadata?: TransactionMetadata
	receipt?: TransactionReceipt
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
