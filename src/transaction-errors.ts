/**
 * Transaction Error Messages
 *
 * This module provides human-readable error messages for transaction validation
 * and execution errors.
 */

import { TransactionExecutionError, TransactionValidationError } from './types'

/**
 * Human-readable messages for transaction validation errors
 */
export const TRANSACTION_VALIDATION_ERROR_MESSAGES: Record<TransactionValidationError, string> = {
	[TransactionValidationError.OK]: 'Transaction successful',
	[TransactionValidationError.TOO_LARGE]: 'Transaction is too large',
	[TransactionValidationError.TX_NOT_CANONICAL]: 'Transaction format is invalid',
	[TransactionValidationError.INVALID_HASH]: 'Transaction hash is invalid',
	[TransactionValidationError.INVALID_SIGNATURE]: 'Transaction signature is invalid',
	[TransactionValidationError.NONCE_NOT_INTEGER]: 'Transaction nonce is invalid',
	[TransactionValidationError.NONCE_TOO_HIGH]: 'Transaction nonce is too high',
	[TransactionValidationError.ACTIONS_MUST_BE_LIST]: 'Transaction actions format is invalid',
	[TransactionValidationError.ACTIONS_LENGTH_MUST_BE_1]:
		'Transaction must have exactly one action',
	[TransactionValidationError.OP_MUST_BE_CALL]: 'Transaction operation must be a call',
	[TransactionValidationError.CONTRACT_MUST_BE_BINARY]: 'Contract address format is invalid',
	[TransactionValidationError.FUNCTION_MUST_BE_BINARY]: 'Function name format is invalid',
	[TransactionValidationError.ARGS_MUST_BE_LIST]: 'Transaction arguments format is invalid',
	[TransactionValidationError.ARG_MUST_BE_BINARY]: 'Transaction argument format is invalid',
	[TransactionValidationError.INVALID_MODULE]: 'Invalid contract module',
	[TransactionValidationError.INVALID_FUNCTION]: 'Invalid contract function',
	[TransactionValidationError.INVALID_MODULE_FOR_SPECIAL_MEETING]:
		'Invalid module for special meeting',
	[TransactionValidationError.INVALID_FUNCTION_FOR_SPECIAL_MEETING]:
		'Invalid function for special meeting',
	[TransactionValidationError.UNKNOWN]: 'Unknown transaction error'
}

/**
 * Human-readable messages for transaction execution errors
 */
export const TRANSACTION_EXECUTION_ERROR_MESSAGES: Record<TransactionExecutionError, string> = {
	[TransactionExecutionError.OK]: 'Execution successful',
	[TransactionExecutionError.UNKNOWN]: 'Unknown execution error',
	[TransactionExecutionError.AS_ABORT]: 'Contract execution was aborted',

	// Execution budget errors
	[TransactionExecutionError.EXEC_INVALID_AMOUNT_NEGATIVE]: 'Invalid negative execution amount',
	[TransactionExecutionError.EXEC_INSUFFICIENT_EXEC_BUDGET]: 'Insufficient execution budget',
	[TransactionExecutionError.EXEC_CRITICAL_UNDERFLOW]: 'Critical execution underflow',

	// Storage budget errors
	[TransactionExecutionError.EXEC_STORAGE_INVALID_AMOUNT_NEGATIVE]:
		'Invalid negative storage amount',
	[TransactionExecutionError.EXEC_INSUFFICIENT_STORAGE_BUDGET]: 'Insufficient storage budget',
	[TransactionExecutionError.EXEC_STORAGE_CRITICAL_UNDERFLOW]: 'Critical storage underflow',

	// KV operation errors
	[TransactionExecutionError.EXEC_TOO_LARGE_KEY_SIZE]: 'Key size too large',
	[TransactionExecutionError.EXEC_TOO_LARGE_VALUE_SIZE]: 'Value size too large',
	[TransactionExecutionError.EXEC_KV_PUT_FAILED]: 'Key-value put operation failed',
	[TransactionExecutionError.EXEC_KV_INCREMENT_FAILED]: 'Key-value increment failed',
	[TransactionExecutionError.EXEC_KV_INCREMENT_INVALID_INTEGER]:
		'Invalid integer for key-value increment',
	[TransactionExecutionError.EXEC_KV_INCREMENT_INTEGER_OVERFLOW]:
		'Integer overflow in key-value increment',
	[TransactionExecutionError.KV_PUT_FAILED]: 'Key-value put failed',
	[TransactionExecutionError.EXEC_KV_DELETE_FAILED]: 'Key-value delete failed',
	[TransactionExecutionError.EXEC_KV_SET_BIT_FAILED]: 'Key-value set bit failed',
	[TransactionExecutionError.EXEC_CANNOT_WRITE_DURING_VIEW]: 'Cannot write during view operation',

	// WASM execution errors
	[TransactionExecutionError.EXEC_RETURN_VALUE_TOO_LARGE]: 'Return value too large',
	[TransactionExecutionError.EXEC_INSTANCE_NOT_INJECTED]: 'Instance not injected',
	[TransactionExecutionError.EXEC_PTR_TERM_TOO_SHORT]: 'Pointer term too short',
	[TransactionExecutionError.EXEC_PTR_TERM_TOO_LONG]: 'Pointer term too long',
	[TransactionExecutionError.EXEC_LOG_INVALID_PTR]: 'Invalid log pointer',
	[TransactionExecutionError.EXEC_CALL_TABLE_INVALID_PTR]: 'Invalid call table pointer',
	[TransactionExecutionError.EXEC_CALL_TOO_MANY_ARGS]: 'Too many call arguments',
	[TransactionExecutionError.EXEC_READ_CALL_TABLE_ERROR]: 'Error reading call table',
	[TransactionExecutionError.EXEC_CALL_PTR_TERM_TOO_LONG]: 'Call pointer term too long',
	[TransactionExecutionError.EXEC_READ_CALL_TABLE_DATA_ERROR]: 'Error reading call table data',
	[TransactionExecutionError.EXEC_CALL_EXTRA_INVALID]: 'Invalid call extra data',
	[TransactionExecutionError.EXEC_CALL_EXTRA_TOO_MANY]: 'Too many call extra items',
	[TransactionExecutionError.EXEC_READ_EXTRA_ROW]: 'Error reading extra row',
	[TransactionExecutionError.EXEC_READ_EXTRA_DATA]: 'Error reading extra data',
	[TransactionExecutionError.EXEC_CALL_MISSING_ARGS]: 'Missing call arguments',
	[TransactionExecutionError.EXEC_MEMWRITE]: 'Memory write error',
	[TransactionExecutionError.EXEC_LOG_MSG_SIZE_EXCEEDED]: 'Log message size exceeded',
	[TransactionExecutionError.EXEC_LOGS_TOTAL_SIZE_EXCEEDED]: 'Total logs size exceeded',
	[TransactionExecutionError.EXEC_LOGS_TOTAL_ELEMENTS_EXCEEDED]: 'Total log elements exceeded',
	[TransactionExecutionError.EXEC_INVALID_MODULE]: 'Invalid execution module',
	[TransactionExecutionError.EXEC_MEMORY_ALLOC]: 'Memory allocation error',
	[TransactionExecutionError.EXEC_ARG_LEN_WRITE]: 'Argument length write error',
	[TransactionExecutionError.EXEC_ARG_WRITE]: 'Argument write error',
	[TransactionExecutionError.EXEC_INSTANCE]: 'Instance error',
	[TransactionExecutionError.EXEC_INIT_MEMWRITE]: 'Initial memory write error',
	[TransactionExecutionError.EXEC_DESERIALIZE_ERR]: 'Deserialization error',
	[TransactionExecutionError.EXEC_SERIALIZE_ERR]: 'Serialization error',
	[TransactionExecutionError.EXEC_FUNCTION_NOT_FOUND]: 'Function not found',
	[TransactionExecutionError.EXEC_ERROR]: 'Execution error',

	// Contract/action errors
	[TransactionExecutionError.INVALID_EPOCH]: 'Invalid epoch',
	[TransactionExecutionError.INVALID_BIC_ACTION]: 'Invalid BIC action',
	[TransactionExecutionError.INVALID_FUNCTION]: 'Invalid function',
	[TransactionExecutionError.ACCOUNT_HAS_NO_BYTECODE]: 'Account has no bytecode',
	[TransactionExecutionError.INVALID_ATTACHED_AMOUNT]: 'Invalid attached amount',
	[TransactionExecutionError.ATTACHED_AMOUNT_INSUFFICIENT_FUNDS]:
		'Insufficient funds for attached amount',
	[TransactionExecutionError.WASM_NOOP]: 'WASM no-op',
	[TransactionExecutionError.INVALID_BYTECODE]: 'Invalid bytecode',

	// Coin contract errors
	[TransactionExecutionError.INVALID_ARGS]: 'Invalid arguments',
	[TransactionExecutionError.INVALID_AMOUNT]: 'Invalid amount',
	[TransactionExecutionError.INVALID_RECEIVER_PK]: 'Invalid receiver public key',
	[TransactionExecutionError.INSUFFICIENT_FUNDS]: 'Insufficient funds',
	[TransactionExecutionError.PAUSED]: 'Contract is paused',
	[TransactionExecutionError.SOULBOUND]: 'Token is soulbound and cannot be transferred',
	[TransactionExecutionError.INVALID_BALANCE]: 'Invalid balance',
	[TransactionExecutionError.INVALID_TOTAL_SUPPLY]: 'Invalid total supply',
	[TransactionExecutionError.INVALID_SYMBOL]: 'Invalid token symbol',
	[TransactionExecutionError.SYMBOL_TOO_SHORT]: 'Token symbol is too short',
	[TransactionExecutionError.SYMBOL_TOO_LONG]: 'Token symbol is too long',
	[TransactionExecutionError.SYMBOL_RESERVED]: 'Token symbol is reserved',
	[TransactionExecutionError.SYMBOL_EXISTS]: 'Token symbol already exists',
	[TransactionExecutionError.INVALID_DECIMALS]: 'Invalid decimals',
	[TransactionExecutionError.NO_PERMISSIONS]: 'No permissions for this operation',
	[TransactionExecutionError.SYMBOL_DOESNT_EXIST]: "Token symbol doesn't exist",
	[TransactionExecutionError.NOT_MINTABLE]: 'Token is not mintable',
	[TransactionExecutionError.INVALID_DIRECTION]: 'Invalid direction',
	[TransactionExecutionError.NOT_PAUSABLE]: 'Token is not pausable',

	// Lockup contract errors
	[TransactionExecutionError.INVALID_DURATION]: 'Invalid lockup duration',
	[TransactionExecutionError.INVALID_VAULT]: 'Invalid vault',
	[TransactionExecutionError.INVALID_UNLOCK_HEIGHT]: 'Invalid unlock height',
	[TransactionExecutionError.INVALID_UNLOCK_AMOUNT]: 'Invalid unlock amount',
	[TransactionExecutionError.VAULT_IS_LOCKED]: 'Vault is still locked',

	// Lockup Prime contract errors
	[TransactionExecutionError.INVALID_TIER]: 'Invalid lockup tier',
	[TransactionExecutionError.INVALID_MULTIPLIER]: 'Invalid multiplier',
	[TransactionExecutionError.INVALID_UNLOCK_EPOCH]: 'Invalid unlock epoch',
	[TransactionExecutionError.INVALID_NEXT_CHECKIN_EPOCH]: 'Invalid next check-in epoch',

	// NFT contract errors
	[TransactionExecutionError.INSUFFICIENT_TOKENS]: 'Insufficient tokens',
	[TransactionExecutionError.INVALID_COLLECTION]: 'Invalid collection',
	[TransactionExecutionError.COLLECTION_TOO_SHORT]: 'Collection name too short',
	[TransactionExecutionError.COLLECTION_TOO_LONG]: 'Collection name too long',
	[TransactionExecutionError.COLLECTION_RESERVED]: 'Collection name is reserved',
	[TransactionExecutionError.COLLECTION_EXISTS]: 'Collection already exists',
	[TransactionExecutionError.COLLECTION_DOESNT_EXIST]: "Collection doesn't exist",

	// Integer parsing errors
	[TransactionExecutionError.INVALID_INTEGER]: 'Invalid integer format'
}

/**
 * Get a human-readable message for a transaction validation error
 *
 * @param error - The validation error code
 * @returns Human-readable error message
 */
export function getValidationErrorMessage(error: TransactionValidationError | string): string {
	return (
		TRANSACTION_VALIDATION_ERROR_MESSAGES[error as TransactionValidationError] ||
		`Transaction validation failed: ${error}`
	)
}

/**
 * Get a human-readable message for a transaction execution error
 *
 * @param error - The execution error code
 * @returns Human-readable error message
 */
export function getExecutionErrorMessage(error: TransactionExecutionError | string): string {
	return (
		TRANSACTION_EXECUTION_ERROR_MESSAGES[error as TransactionExecutionError] ||
		`Transaction execution failed: ${error}`
	)
}

/**
 * Get a human-readable message for any transaction error (validation or execution)
 *
 * @param error - The error code (validation or execution)
 * @returns Human-readable error message
 */
export function getTransactionErrorMessage(
	error: TransactionValidationError | TransactionExecutionError | string
): string {
	// Try validation error first
	if (error in TRANSACTION_VALIDATION_ERROR_MESSAGES) {
		return TRANSACTION_VALIDATION_ERROR_MESSAGES[error as TransactionValidationError]
	}
	// Try execution error
	if (error in TRANSACTION_EXECUTION_ERROR_MESSAGES) {
		return TRANSACTION_EXECUTION_ERROR_MESSAGES[error as TransactionExecutionError]
	}
	// Fallback
	return `Transaction failed: ${error}`
}
