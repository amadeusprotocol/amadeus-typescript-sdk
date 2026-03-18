/**
 * Transaction Builder
 *
 * Class-based API for building and signing Amadeus protocol transactions.
 * Delegates to the signing primitives in `signing.ts` and the ABI-driven
 * contract factory in `contracts/contract.ts`.
 *
 * ## Recommended: ABI-driven API
 *
 * ```ts
 * import { TransactionBuilder, LOCKUP_PRIME_ABI, toAtomicAma } from '@amadeus-protocol/sdk'
 *
 * // Via builder.contract(abi) — typed methods, auto-signed:
 * const builder = new TransactionBuilder('5Kd3N...')
 * const result = builder.contract(LOCKUP_PRIME_ABI).lock({
 *   amount: toAtomicAma(100).toString(),
 *   tier: '30d'
 * })
 *
 * // Or standalone:
 * import { createContract } from '@amadeus-protocol/sdk'
 * const lockupPrime = createContract(LOCKUP_PRIME_ABI)
 * const call = lockupPrime.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })
 * const result = TransactionBuilder.signCall('5Kd3N...', call)
 * ```
 */

import type { PrivKey } from '@noble/curves/abstract/utils'

import { deriveSkAndSeed64FromBase58Seed, getPublicKey } from './crypto'
import { toAtomicAma } from './conversion'
import {
	buildUnsigned,
	buildUnsignedFromCall,
	buildAndSignRaw,
	signUnsigned,
	signContractCall,
	normalizeSignerSk
} from './signing'
import type {
	BuildTransactionResult,
	LockupPrimeDailyCheckinInput,
	LockupPrimeLockInput,
	LockupPrimeUnlockInput,
	LockupUnlockInput,
	SerializableValue,
	TransferTransactionInput,
	UnsignedTransactionWithHash
} from './types'
import type { AbiDefinition } from './contracts/abi-types'
import type { ContractCall } from './contracts/contract-call'
import { createContract, type SignedContract } from './contracts/contract'
import { buildCoinTransfer } from './contracts/coin'
import { LOCKUP_PRIME_ABI } from './contracts/lockup-prime/abi'
import { LOCKUP_ABI } from './contracts/lockup/abi'

/**
 * Transaction Builder for Amadeus Protocol
 *
 * Provides methods for building and signing transactions. Can be instantiated
 * with a private key for convenience, or used statically.
 *
 * @example
 * ```ts
 * // ABI-driven (recommended)
 * const builder = new TransactionBuilder('5Kd3N...')
 * const result = builder.contract(LOCKUP_PRIME_ABI).lock({
 *   amount: toAtomicAma(100).toString(),
 *   tier: '30d'
 * })
 *
 * // Generic build/sign
 * const builder = new TransactionBuilder('5Kd3N...')
 * const { txHash, txPacked } = builder.buildAndSign('Coin', 'transfer', [
 *   recipientBytes, '1000000000', 'AMA'
 * ])
 * ```
 */
export class TransactionBuilder {
	private readonly privateKey: string | null
	private signerPk: Uint8Array | null = null
	private signerSk: PrivKey | null = null

	/**
	 * Create a new TransactionBuilder instance
	 *
	 * @param privateKey - Optional Base58 encoded private key (seed). If provided,
	 *                     the builder will use this key for all transactions.
	 */
	constructor(privateKey?: string) {
		this.privateKey = privateKey || null
		if (this.privateKey) {
			this.initializeKeys()
		}
	}

	/**
	 * Initialize signer keys from the private key
	 */
	private initializeKeys(): void {
		if (!this.privateKey) {
			throw new Error('Private key not set')
		}
		const { seed64, sk } = deriveSkAndSeed64FromBase58Seed(this.privateKey)
		this.signerPk = getPublicKey(seed64)
		this.signerSk = sk
	}

	/**
	 * Get the signer's secret key (normalizes to PrivKey format)
	 */
	private getSignerSk(signerSk?: PrivKey | string | Uint8Array): PrivKey {
		if (signerSk) {
			return normalizeSignerSk(signerSk)
		}
		if (this.signerSk) {
			return this.signerSk
		}
		if (this.privateKey) {
			return normalizeSignerSk(this.privateKey)
		}
		throw new Error('Secret key required for signing')
	}

	private requirePk(signerPk?: Uint8Array): Uint8Array {
		const pk = signerPk || this.signerPk
		if (!pk) {
			throw new Error(
				'Signer public key required. Provide key or initialize builder with private key.'
			)
		}
		return pk
	}

	// ========================================================================
	// ABI-driven contract API
	// ========================================================================

	/**
	 * Get a typed, signer-bound contract interface from an ABI definition.
	 *
	 * Each ABI function becomes a method that builds and signs in one step,
	 * returning `BuildTransactionResult` directly.
	 *
	 * @param abi - An ABI definition object (declared `as const`)
	 * @returns A `SignedContract<TAbi>` with typed methods for each ABI function
	 *
	 * @example
	 * ```ts
	 * const builder = new TransactionBuilder('5Kd3N...')
	 *
	 * // LockupPrime — all methods auto-detected from ABI:
	 * const result = builder.contract(LOCKUP_PRIME_ABI).lock({
	 *   amount: toAtomicAma(100).toString(),
	 *   tier: '30d'
	 * })
	 *
	 * builder.contract(LOCKUP_PRIME_ABI).unlock({ vaultIndex: '3' })
	 * builder.contract(LOCKUP_PRIME_ABI).daily_checkin({ vaultIndex: '7' })
	 *
	 * // Lockup:
	 * builder.contract(LOCKUP_ABI).unlock({ vaultIndex: '5' })
	 *
	 * // Any future contract — just pass its ABI:
	 * builder.contract(SOME_NEW_ABI).someFunction({ param: 'value' })
	 * ```
	 */
	contract<TAbi extends AbiDefinition>(abi: TAbi): SignedContract<TAbi> {
		if (!this.privateKey) {
			throw new Error('Private key required. Initialize builder with private key.')
		}
		return createContract(abi).connect(this.privateKey)
	}

	// ========================================================================
	// ContractCall-based API
	// ========================================================================

	/**
	 * Derive keys from a Base58 private key and sign a ContractCall.
	 *
	 * @param senderPrivkey - Base58 encoded private key (seed)
	 * @param call - A ContractCall from createContract(), buildContractCall(), or buildCoinTransfer()
	 * @returns Transaction hash and packed transaction
	 *
	 * @example
	 * ```ts
	 * const lockupPrime = createContract(LOCKUP_PRIME_ABI)
	 * const call = lockupPrime.lock({ amount: '100000000000', tier: '30d' })
	 * const { txHash, txPacked } = TransactionBuilder.signCall('5Kd3N...', call)
	 * ```
	 */
	static signCall(senderPrivkey: string, call: ContractCall): BuildTransactionResult {
		return signContractCall(senderPrivkey, call)
	}

	/**
	 * Build an unsigned transaction from a ContractCall (static)
	 */
	static buildFromCall(call: ContractCall, signerPk: Uint8Array): UnsignedTransactionWithHash {
		return buildUnsignedFromCall(signerPk, call)
	}

	/**
	 * Build and sign a transaction from a ContractCall (static)
	 */
	static buildAndSignCall(
		signerPk: Uint8Array,
		signerSk: PrivKey | string | Uint8Array,
		call: ContractCall
	): BuildTransactionResult {
		return buildAndSignRaw(signerPk, signerSk, call.contract, call.method, call.args)
	}

	/**
	 * Build an unsigned transaction from a ContractCall (instance)
	 */
	buildFromCall(call: ContractCall): UnsignedTransactionWithHash {
		return buildUnsignedFromCall(this.requirePk(), call)
	}

	/**
	 * Build and sign a transaction from a ContractCall (instance)
	 */
	buildAndSignCall(call: ContractCall): BuildTransactionResult {
		const pk = this.requirePk()
		const sk = this.getSignerSk()
		return buildAndSignRaw(pk, sk, call.contract, call.method, call.args)
	}

	// ========================================================================
	// Generic build/sign methods
	// ========================================================================

	/**
	 * Build an unsigned transaction (instance)
	 */
	build(
		contract: string,
		method: string,
		args: SerializableValue[],
		signerPk?: Uint8Array
	): UnsignedTransactionWithHash {
		return buildUnsigned(this.requirePk(signerPk), contract, method, args)
	}

	/**
	 * Sign an unsigned transaction (instance)
	 */
	sign(
		unsignedTx: UnsignedTransactionWithHash,
		signerSk?: PrivKey | string | Uint8Array
	): BuildTransactionResult {
		return signUnsigned(unsignedTx, this.getSignerSk(signerSk))
	}

	/**
	 * Build and sign a generic transaction (instance)
	 */
	buildAndSign(
		contract: string,
		method: string,
		args: SerializableValue[],
		signerPk?: Uint8Array,
		signerSk?: PrivKey | string | Uint8Array
	): BuildTransactionResult {
		const pk = this.requirePk(signerPk)
		const sk = this.getSignerSk(signerSk)
		return buildAndSignRaw(pk, sk, contract, method, args)
	}

	/**
	 * Build an unsigned transaction (static)
	 */
	static build(
		signerPk: Uint8Array,
		contract: string,
		method: string,
		args: SerializableValue[]
	): UnsignedTransactionWithHash {
		return buildUnsigned(signerPk, contract, method, args)
	}

	/**
	 * Sign an unsigned transaction (static)
	 */
	static sign(
		unsignedTx: UnsignedTransactionWithHash,
		signerSk: PrivKey | string | Uint8Array
	): BuildTransactionResult {
		return signUnsigned(unsignedTx, signerSk)
	}

	/**
	 * Build and sign a generic transaction (static)
	 */
	static buildAndSign(
		signerPk: Uint8Array,
		signerSk: PrivKey | string | Uint8Array,
		contract: string,
		method: string,
		args: SerializableValue[]
	): BuildTransactionResult {
		return buildAndSignRaw(signerPk, signerSk, contract, method, args)
	}

	// ========================================================================
	// Coin transfer (instance)
	// ========================================================================

	/**
	 * Build an unsigned Coin transfer transaction
	 */
	buildTransfer(
		input: Omit<TransferTransactionInput, 'senderPrivkey'>
	): UnsignedTransactionWithHash {
		return this.buildFromCall(buildCoinTransfer(input))
	}

	/**
	 * Build and sign a Coin transfer transaction
	 */
	transfer(input: Omit<TransferTransactionInput, 'senderPrivkey'>): BuildTransactionResult {
		if (!this.privateKey) {
			throw new Error(
				'Private key required. Initialize builder with private key or use static method.'
			)
		}
		return this.buildAndSignCall(buildCoinTransfer(input))
	}

	// ========================================================================
	// Coin transfer (static)
	// ========================================================================

	/**
	 * Build an unsigned Coin transfer transaction (static)
	 */
	static buildTransfer(
		input: Omit<TransferTransactionInput, 'senderPrivkey'>,
		signerPk: Uint8Array
	): UnsignedTransactionWithHash {
		return TransactionBuilder.buildFromCall(buildCoinTransfer(input), signerPk)
	}

	/**
	 * Build and sign a Coin transfer transaction (static)
	 */
	static buildSignedTransfer(input: TransferTransactionInput): BuildTransactionResult {
		return TransactionBuilder.signCall(
			input.senderPrivkey,
			buildCoinTransfer({
				recipient: input.recipient,
				amount: input.amount,
				symbol: input.symbol
			})
		)
	}

	// ========================================================================
	// LockupPrime (instance)
	// ========================================================================

	/**
	 * Build and sign a LockupPrime lock transaction
	 */
	lockupPrimeLock(input: Omit<LockupPrimeLockInput, 'senderPrivkey'>): BuildTransactionResult {
		return this.contract(LOCKUP_PRIME_ABI).lock({
			amount: toAtomicAma(input.amount).toString(),
			tier: input.tier
		})
	}

	/**
	 * Build and sign a LockupPrime unlock transaction
	 */
	lockupPrimeUnlock(
		input: Omit<LockupPrimeUnlockInput, 'senderPrivkey'>
	): BuildTransactionResult {
		return this.contract(LOCKUP_PRIME_ABI).unlock({
			vaultIndex: input.vaultIndex.toString()
		})
	}

	/**
	 * Build and sign a LockupPrime daily check-in transaction
	 */
	lockupPrimeDailyCheckin(
		input: Omit<LockupPrimeDailyCheckinInput, 'senderPrivkey'>
	): BuildTransactionResult {
		return this.contract(LOCKUP_PRIME_ABI).daily_checkin({
			vaultIndex: input.vaultIndex.toString()
		})
	}

	// ========================================================================
	// Lockup (instance)
	// ========================================================================

	/**
	 * Build and sign a Lockup unlock transaction
	 */
	lockupUnlock(input: Omit<LockupUnlockInput, 'senderPrivkey'>): BuildTransactionResult {
		return this.contract(LOCKUP_ABI).unlock({
			vaultIndex: input.vaultIndex.toString()
		})
	}

	// ========================================================================
	// LockupPrime (static)
	// ========================================================================

	/**
	 * Build and sign a LockupPrime lock transaction (static)
	 */
	static buildSignedLockupPrimeLock(input: LockupPrimeLockInput): BuildTransactionResult {
		const call = createContract(LOCKUP_PRIME_ABI).lock({
			amount: toAtomicAma(input.amount).toString(),
			tier: input.tier
		})
		return TransactionBuilder.signCall(input.senderPrivkey, call)
	}

	/**
	 * Build and sign a LockupPrime unlock transaction (static)
	 */
	static buildSignedLockupPrimeUnlock(input: LockupPrimeUnlockInput): BuildTransactionResult {
		const call = createContract(LOCKUP_PRIME_ABI).unlock({
			vaultIndex: input.vaultIndex.toString()
		})
		return TransactionBuilder.signCall(input.senderPrivkey, call)
	}

	/**
	 * Build and sign a LockupPrime daily check-in transaction (static)
	 */
	static buildSignedLockupPrimeDailyCheckin(
		input: LockupPrimeDailyCheckinInput
	): BuildTransactionResult {
		const call = createContract(LOCKUP_PRIME_ABI).daily_checkin({
			vaultIndex: input.vaultIndex.toString()
		})
		return TransactionBuilder.signCall(input.senderPrivkey, call)
	}

	// ========================================================================
	// Lockup (static)
	// ========================================================================

	/**
	 * Build and sign a Lockup unlock transaction (static)
	 */
	static buildSignedLockupUnlock(input: LockupUnlockInput): BuildTransactionResult {
		const call = createContract(LOCKUP_ABI).unlock({
			vaultIndex: input.vaultIndex.toString()
		})
		return TransactionBuilder.signCall(input.senderPrivkey, call)
	}
}
