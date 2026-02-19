/**
 * Transaction Signing Primitives
 *
 * Stateless, standalone functions for building and signing Amadeus transactions.
 * This module is the source of truth for the signing pipeline — both
 * TransactionBuilder and createContract().connect() delegate to these functions.
 */

import type { PrivKey } from '@noble/curves/abstract/utils'
import { bls12_381 as bls } from '@noble/curves/bls12-381'
import { sha256 } from '@noble/hashes/sha2'

import { deriveSkAndSeed64FromBase58Seed, getPublicKey } from './crypto'
import { toBase58 } from './encoding'
import { encode } from './serialization'
import type {
	BuildTransactionResult,
	SerializableValue,
	TransactionAction,
	UnsignedTransaction,
	UnsignedTransactionWithHash
} from './types'
import type { ContractCall } from './contracts/contract-call'

/** Domain Separation Tag for transaction signatures */
const TX_DST = 'AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_TX_'

/** Generate a transaction nonce based on current timestamp */
function generateNonce(): bigint {
	return BigInt(Date.now()) * 1_000_000n
}

/**
 * Normalize a signer secret key to PrivKey format.
 * Accepts Base58 strings, raw Uint8Array, or already-derived PrivKey.
 */
export function normalizeSignerSk(signerSk: PrivKey | string | Uint8Array): PrivKey {
	if (typeof signerSk === 'string') {
		const { sk } = deriveSkAndSeed64FromBase58Seed(signerSk)
		return sk
	}
	return signerSk
}

/**
 * Build an unsigned transaction from raw contract/method/args.
 */
export function buildUnsigned(
	signerPk: Uint8Array,
	contract: string,
	method: string,
	args: SerializableValue[]
): UnsignedTransactionWithHash {
	const action: TransactionAction = {
		op: 'call',
		contract,
		function: method,
		args
	}
	const tx: UnsignedTransaction = {
		signer: signerPk,
		nonce: generateNonce(),
		action
	}
	const txEncoded = encode(tx)
	const hash = sha256(txEncoded)
	return { tx, hash }
}

/**
 * Sign an already-built unsigned transaction.
 */
export function signUnsigned(
	unsignedTx: UnsignedTransactionWithHash,
	signerSk: PrivKey | string | Uint8Array
): BuildTransactionResult {
	const sk = normalizeSignerSk(signerSk)
	const signature = bls.sign(unsignedTx.hash, sk, { DST: TX_DST })
	return {
		txHash: toBase58(unsignedTx.hash),
		txPacked: encode({ tx: unsignedTx.tx, hash: unsignedTx.hash, signature })
	}
}

/**
 * Build and sign a transaction from raw contract/method/args.
 */
export function buildAndSignRaw(
	signerPk: Uint8Array,
	signerSk: PrivKey | string | Uint8Array,
	contract: string,
	method: string,
	args: SerializableValue[]
): BuildTransactionResult {
	const unsignedTx = buildUnsigned(signerPk, contract, method, args)
	return signUnsigned(unsignedTx, signerSk)
}

/**
 * Build an unsigned transaction from a ContractCall.
 */
export function buildUnsignedFromCall(
	signerPk: Uint8Array,
	call: ContractCall
): UnsignedTransactionWithHash {
	return buildUnsigned(signerPk, call.contract, call.method, call.args)
}

/**
 * Highest-level: derive keys from a Base58 private key and sign a ContractCall.
 *
 * This is the core function behind `TransactionBuilder.signCall()` and
 * `createContract(ABI).connect(key).method()`.
 */
export function signContractCall(
	senderPrivkey: string,
	call: ContractCall
): BuildTransactionResult {
	const { seed64, sk } = deriveSkAndSeed64FromBase58Seed(senderPrivkey)
	const signerPubKey = getPublicKey(seed64)
	return buildAndSignRaw(signerPubKey, sk, call.contract, call.method, call.args)
}
