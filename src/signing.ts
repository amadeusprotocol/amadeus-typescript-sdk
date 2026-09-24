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

import { AMADEUS_SEED_BYTE_LENGTH } from './constants'
import { deriveSkAndSeed64FromBase58Seed, getPublicKey, reduce512To256LE } from './crypto'
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

/** Byte length of a BLS12-381 secret scalar, i.e. an already-derived private key */
const BLS_SECRET_KEY_BYTE_LENGTH = 32

/**
 * Highest nonce this process has issued. Never decreases, so a clock that steps
 * backwards cannot make us reuse a nonce either.
 */
let lastNonce = 0n

/**
 * Generate a transaction nonce based on the current timestamp.
 *
 * `Date.now()` only has millisecond resolution; multiplying by 1_000_000 pads it
 * to nanoseconds but adds no precision. Two transactions built inside the same
 * millisecond therefore received the *same* nonce — and because the nonce is part
 * of the encoded transaction, two otherwise identical calls produced the same
 * hash, the same txHash and the same signed bytes. The chain cannot tell those
 * apart from a resubmission of one transaction, so one of the two would be
 * dropped as a duplicate while the caller was handed a txHash that belongs to the
 * other. Building both halves of a pair with `Promise.all` is enough to hit it.
 *
 * A monotonic counter keeps the timestamp meaning of the value (it stays a
 * nanosecond-scale count since the epoch) while guaranteeing that every nonce
 * issued by this process is strictly greater than the previous one. Note this is
 * per process: several processes signing with the same key still need to
 * coordinate, which is the chain's nonce rules to enforce, not the SDK's.
 */
function generateNonce(): bigint {
	const candidate = BigInt(Date.now()) * 1_000_000n
	lastNonce = candidate > lastNonce ? candidate : lastNonce + 1n
	return lastNonce
}

/**
 * Normalize a signer secret key to PrivKey format.
 * Accepts Base58 strings, raw Uint8Array, or already-derived PrivKey.
 *
 * A Base58 string is a 64-byte *seed* and is reduced to the 32-byte BLS scalar.
 * The byte form now goes through the same reduction, which it previously did not:
 * `generatePrivateKey()` returns a 64-byte seed and `generateKeypair()` returns
 * that same seed Base58-encoded, so handing the raw bytes of either straight to
 * this function used to reach `bls.sign` unreduced and fail with the library's
 * own low-level message ("invalid private key: expected ui8a of size 32"),
 * verified against @noble/curves. The same key material now signs identically
 * whether it arrives as Base58 or as bytes.
 */
export function normalizeSignerSk(signerSk: PrivKey | string | Uint8Array): PrivKey {
	if (typeof signerSk === 'string') {
		const { sk } = deriveSkAndSeed64FromBase58Seed(signerSk)
		return sk
	}
	if (signerSk instanceof Uint8Array) {
		if (signerSk.length === AMADEUS_SEED_BYTE_LENGTH) {
			return reduce512To256LE(signerSk)
		}
		if (signerSk.length !== BLS_SECRET_KEY_BYTE_LENGTH) {
			throw new Error(
				`Invalid signer secret key: expected ${BLS_SECRET_KEY_BYTE_LENGTH}-byte scalar or ` +
					`${AMADEUS_SEED_BYTE_LENGTH}-byte seed, got ${signerSk.length} bytes`
			)
		}
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
