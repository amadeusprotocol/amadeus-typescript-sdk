/**
 * Transaction Builder
 *
 * This module provides a class-based API for building and signing Amadeus protocol transactions.
 */

import type { PrivKey } from '@noble/curves/utils'
import { bls12_381 as bls } from '@noble/curves/bls12-381'
import { sha256 } from '@noble/hashes/sha2'

import { deriveSkAndSeed64FromBase58Seed, getPublicKey } from './crypto'
import { fromBase58, toBase58 } from './encoding'
import { toAtomicAma } from './conversion'
import { encode } from './serialization'
import type {
	BuildTransactionResult,
	SerializableValue,
	TransactionAction,
	TransferTransactionInput,
	UnsignedTransaction,
	UnsignedTransactionWithHash
} from './types'

/**
 * Transaction Builder for Amadeus Protocol
 *
 * Provides methods for building and signing transactions. Can be instantiated
 * with a private key for convenience, or used statically.
 *
 * @example
 * ```ts
 * // Instance-based usage
 * const builder = new TransactionBuilder('5Kd3N...')
 * const { txHash, txPacked } = builder.transfer({
 *   recipient: '5Kd3N...',
 *   amount: 10.5,
 *   symbol: 'AMA'
 * })
 *
 * // Static usage
 * const { txHash, txPacked } = TransactionBuilder.buildTransfer({
 *   senderPrivkey: '5Kd3N...',
 *   recipient: '5Kd3N...',
 *   amount: 10.5,
 *   symbol: 'AMA'
 * })
 * ```
 */
export class TransactionBuilder {
	private readonly privateKey: string | null
	private signerPk: Uint8Array | null = null
	private signerSk: PrivKey | null = null

	/**
	 * Domain Separation Tag for transaction signatures
	 */
	private static readonly TX_DST = 'AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_TX_'

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
	 * Generate a transaction nonce based on current timestamp
	 */
	private static generateNonce(): bigint {
		return BigInt(Date.now()) * 1_000_000n
	}

	/**
	 * Create transaction structure
	 */
	private static createTransaction(
		signer: Uint8Array,
		contract: string,
		method: string,
		args: SerializableValue[]
	): UnsignedTransaction {
		const action: TransactionAction = {
			op: 'call',
			contract,
			function: method,
			args
		}
		return {
			signer,
			nonce: TransactionBuilder.generateNonce(),
			action
		}
	}

	/**
	 * Build an unsigned transaction (returns transaction structure and hash)
	 */
	private static buildUnsignedTransaction(
		signerPk: Uint8Array,
		contract: string,
		method: string,
		args: SerializableValue[]
	): UnsignedTransactionWithHash {
		const tx = TransactionBuilder.createTransaction(signerPk, contract, method, args)
		const txEncoded = encode(tx)
		const hash = sha256(txEncoded)

		return { tx, hash }
	}

	/**
	 * Normalize signer secret key to PrivKey format (handles Base58 strings)
	 */
	private static normalizeSignerSk(signerSk: PrivKey | string | Uint8Array): PrivKey {
		if (typeof signerSk === 'string') {
			// Base58 string - derive PrivKey from it
			const { sk } = deriveSkAndSeed64FromBase58Seed(signerSk)
			return sk
		}
		// Already PrivKey (Uint8Array)
		return signerSk
	}

	/**
	 * Sign a transaction hash using BLS12-381 with transaction DST
	 */
	private static signHash(hash: Uint8Array, signerSk: PrivKey | string | Uint8Array): Uint8Array {
		const normalizedSk = TransactionBuilder.normalizeSignerSk(signerSk)
		return bls.sign(hash, normalizedSk, { DST: TransactionBuilder.TX_DST })
	}

	/**
	 * Sign an unsigned transaction
	 */
	private static signTransaction(
		unsignedTx: UnsignedTransactionWithHash,
		signerSk: PrivKey | string | Uint8Array
	): BuildTransactionResult {
		const signature = TransactionBuilder.signHash(unsignedTx.hash, signerSk)
		return {
			txHash: toBase58(unsignedTx.hash),
			txPacked: encode({ tx: unsignedTx.tx, hash: unsignedTx.hash, signature })
		}
	}

	/**
	 * Build and sign a transaction (convenience method)
	 */
	private static buildAndSignTransaction(
		signerPk: Uint8Array,
		signerSk: PrivKey | string | Uint8Array,
		contract: string,
		method: string,
		args: SerializableValue[]
	): BuildTransactionResult {
		const unsignedTx = TransactionBuilder.buildUnsignedTransaction(
			signerPk,
			contract,
			method,
			args
		)
		return TransactionBuilder.signTransaction(unsignedTx, signerSk)
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
	 * Build an unsigned transaction
	 *
	 * @param contract - Contract name
	 * @param method - Method name
	 * @param args - Method arguments
	 * @param signerPk - Optional signer's public key (required if instance has no private key)
	 * @returns Unsigned transaction with hash
	 *
	 * @example
	 * ```ts
	 * const builder = new TransactionBuilder('5Kd3N...')
	 * const unsignedTx = builder.build('Coin', 'transfer', [
	 *   recipientBytes,
	 *   '1000000000',
	 *   'AMA'
	 * ])
	 * // Can inspect or modify before signing
	 * const { txHash, txPacked } = builder.sign(unsignedTx)
	 * ```
	 */
	build(
		contract: string,
		method: string,
		args: SerializableValue[],
		signerPk?: Uint8Array
	): UnsignedTransactionWithHash {
		const pk = signerPk || this.signerPk
		if (!pk) {
			throw new Error(
				'Signer public key required. Provide key or initialize builder with private key.'
			)
		}

		return TransactionBuilder.buildUnsignedTransaction(pk, contract, method, args)
	}

	/**
	 * Get the signer's secret key (normalizes to PrivKey format)
	 * Handles Base58 strings, PrivKey (Uint8Array), or uses cached/derived key
	 */
	private getSignerSk(signerSk?: PrivKey | string | Uint8Array): PrivKey {
		// If provided, normalize it (convert Base58 string to PrivKey if needed)
		if (signerSk) {
			if (typeof signerSk === 'string') {
				// Base58 string - derive PrivKey from it
				const { sk } = deriveSkAndSeed64FromBase58Seed(signerSk)
				return sk
			}
			// Already PrivKey (Uint8Array)
			return signerSk
		}

		// Use cached signerSk if available
		if (this.signerSk) {
			return this.signerSk
		}

		// Derive from privateKey
		if (this.privateKey) {
			const { sk } = deriveSkAndSeed64FromBase58Seed(this.privateKey)
			return sk
		}

		throw new Error('Secret key required for signing')
	}

	/**
	 * Sign an unsigned transaction
	 *
	 * @param unsignedTx - Unsigned transaction with hash
	 * @param signerSk - Optional signer's secret key (required if instance has no private key)
	 * @returns Transaction hash and packed transaction
	 *
	 * @example
	 * ```ts
	 * const builder = new TransactionBuilder('5Kd3N...')
	 * const unsignedTx = builder.build('Coin', 'transfer', args)
	 * const { txHash, txPacked } = builder.sign(unsignedTx)
	 * ```
	 */
	sign(
		unsignedTx: UnsignedTransactionWithHash,
		signerSk?: PrivKey | string | Uint8Array
	): BuildTransactionResult {
		const sk = this.getSignerSk(signerSk)
		return TransactionBuilder.signTransaction(unsignedTx, sk)
	}

	/**
	 * Build and sign a generic transaction (convenience method)
	 *
	 * @param contract - Contract name
	 * @param method - Method name
	 * @param args - Method arguments
	 * @param signerPk - Optional signer's public key (required if instance has no private key)
	 * @param signerSk - Optional signer's secret key (required if instance has no private key)
	 * @returns Transaction hash and packed transaction
	 *
	 * @example
	 * ```ts
	 * const builder = new TransactionBuilder('5Kd3N...')
	 * const { txHash, txPacked } = builder.buildAndSign('Coin', 'transfer', [
	 *   recipientBytes,
	 *   '1000000000',
	 *   'AMA'
	 * ])
	 * ```
	 */
	buildAndSign(
		contract: string,
		method: string,
		args: SerializableValue[],
		signerPk?: Uint8Array,
		signerSk?: PrivKey | string | Uint8Array
	): BuildTransactionResult {
		const pk = signerPk || this.signerPk
		if (!pk) {
			throw new Error(
				'Signer public key required. Provide key or initialize builder with private key.'
			)
		}
		const sk = this.getSignerSk(signerSk)
		return TransactionBuilder.buildAndSignTransaction(pk, sk, contract, method, args)
	}

	/**
	 * Build an unsigned transfer transaction
	 *
	 * @param input - Transfer transaction parameters
	 * @returns Unsigned transaction with hash
	 *
	 * @example
	 * ```ts
	 * const builder = new TransactionBuilder('5Kd3N...')
	 * const unsignedTx = builder.buildTransfer({
	 *   recipient: '5Kd3N...',
	 *   amount: 10.5,
	 *   symbol: 'AMA'
	 * })
	 * ```
	 */
	buildTransfer(
		input: Omit<TransferTransactionInput, 'senderPrivkey'>
	): UnsignedTransactionWithHash {
		if (!this.signerPk) {
			throw new Error(
				'Public key required. Initialize builder with private key or provide signerPk.'
			)
		}

		return this.build('Coin', 'transfer', [
			fromBase58(input.recipient),
			toAtomicAma(input.amount).toString(),
			input.symbol
		])
	}

	/**
	 * Build and sign a transfer transaction (convenience method)
	 *
	 * @param input - Transfer transaction parameters
	 * @returns Transaction hash and packed transaction
	 *
	 * @example
	 * ```ts
	 * const builder = new TransactionBuilder('5Kd3N...')
	 * const { txHash, txPacked } = builder.transfer({
	 *   recipient: '5Kd3N...',
	 *   amount: 10.5,
	 *   symbol: 'AMA'
	 * })
	 * ```
	 */
	transfer(input: Omit<TransferTransactionInput, 'senderPrivkey'>): BuildTransactionResult {
		if (!this.privateKey) {
			throw new Error(
				'Private key required. Initialize builder with private key or use static method.'
			)
		}

		return this.buildAndSign('Coin', 'transfer', [
			fromBase58(input.recipient),
			toAtomicAma(input.amount).toString(),
			input.symbol
		])
	}

	/**
	 * Build an unsigned transfer transaction (static method)
	 *
	 * @param input - Transfer transaction parameters (without senderPrivkey)
	 * @param signerPk - Signer's public key
	 * @returns Unsigned transaction with hash
	 *
	 * @example
	 * ```ts
	 * const unsignedTx = TransactionBuilder.buildTransfer(
	 *   { recipient: '5Kd3N...', amount: 10.5, symbol: 'AMA' },
	 *   publicKey
	 * )
	 * ```
	 */
	static buildTransfer(
		input: Omit<TransferTransactionInput, 'senderPrivkey'>,
		signerPk: Uint8Array
	): UnsignedTransactionWithHash {
		return TransactionBuilder.buildUnsignedTransaction(signerPk, 'Coin', 'transfer', [
			fromBase58(input.recipient),
			toAtomicAma(input.amount).toString(),
			input.symbol
		])
	}

	/**
	 * Build and sign a transfer transaction (static method)
	 *
	 * @param input - Transfer transaction parameters
	 * @returns Transaction hash and packed transaction
	 *
	 * @example
	 * ```ts
	 * const { txHash, txPacked } = TransactionBuilder.buildSignedTransfer({
	 *   senderPrivkey: '5Kd3N...',
	 *   recipient: '5Kd3N...',
	 *   amount: 10.5,
	 *   symbol: 'AMA'
	 * })
	 * ```
	 */
	static buildSignedTransfer(input: TransferTransactionInput): BuildTransactionResult {
		const { seed64, sk } = deriveSkAndSeed64FromBase58Seed(input.senderPrivkey)
		const signerPubKey = getPublicKey(seed64)

		return TransactionBuilder.buildAndSignTransaction(signerPubKey, sk, 'Coin', 'transfer', [
			fromBase58(input.recipient),
			toAtomicAma(input.amount).toString(),
			input.symbol
		])
	}

	/**
	 * Build an unsigned transaction (static method)
	 *
	 * @param signerPk - Signer's public key
	 * @param contract - Contract name
	 * @param method - Method name
	 * @param args - Method arguments
	 * @returns Unsigned transaction with hash
	 *
	 * @example
	 * ```ts
	 * const unsignedTx = TransactionBuilder.build(
	 *   publicKey,
	 *   'Coin',
	 *   'transfer',
	 *   [recipientBytes, amount, 'AMA']
	 * )
	 * ```
	 */
	static build(
		signerPk: Uint8Array,
		contract: string,
		method: string,
		args: SerializableValue[]
	): UnsignedTransactionWithHash {
		return TransactionBuilder.buildUnsignedTransaction(signerPk, contract, method, args)
	}

	/**
	 * Sign an unsigned transaction (static method)
	 *
	 * @param unsignedTx - Unsigned transaction with hash
	 * @param signerSk - Signer's secret key
	 * @returns Transaction hash and packed transaction
	 *
	 * @example
	 * ```ts
	 * const unsignedTx = TransactionBuilder.build(publicKey, 'Coin', 'transfer', args)
	 * const { txHash, txPacked } = TransactionBuilder.sign(unsignedTx, secretKey)
	 * ```
	 */
	static sign(
		unsignedTx: UnsignedTransactionWithHash,
		signerSk: PrivKey | string | Uint8Array
	): BuildTransactionResult {
		return TransactionBuilder.signTransaction(unsignedTx, signerSk)
	}

	/**
	 * Build and sign a generic transaction (static method)
	 *
	 * @param signerPk - Signer's public key
	 * @param signerSk - Signer's secret key
	 * @param contract - Contract name
	 * @param method - Method name
	 * @param args - Method arguments
	 * @returns Transaction hash and packed transaction
	 *
	 * @example
	 * ```ts
	 * const { txHash, txPacked } = TransactionBuilder.buildAndSign(
	 *   publicKey,
	 *   secretKey,
	 *   'Coin',
	 *   'transfer',
	 *   [recipientBytes, amount, 'AMA']
	 * )
	 * ```
	 */
	static buildAndSign(
		signerPk: Uint8Array,
		signerSk: PrivKey | string | Uint8Array,
		contract: string,
		method: string,
		args: SerializableValue[]
	): BuildTransactionResult {
		return TransactionBuilder.buildAndSignTransaction(
			signerPk,
			signerSk,
			contract,
			method,
			args
		)
	}
}
