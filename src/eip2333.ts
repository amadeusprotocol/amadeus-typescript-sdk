/**
 * EIP-2333 — BLS12-381 hierarchical key derivation.
 *
 * Pure, dependency-free implementation (uses only @noble/hashes, already a
 * dependency). Verified against the official EIP-2333 test vectors and
 * byte-identical to @chainsafe/bls-keygen — the library the Amadeus hub,
 * Prime Hub and cli-wallet use — so the same mnemonic resolves to the same
 * BLS identity everywhere.
 *
 * Spec: https://eips.ethereum.org/EIPS/eip-2333
 */

import { extract, expand } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha2'

/** BLS12-381 group order (r). */
const R = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n
/** HKDF_mod_r output length in bytes. */
const L = 48
/** Lamport scheme length: 255 chunks × 32 bytes. */
const LAMPORT_L = 8160

function i2osp(n: bigint | number, len: number): Uint8Array {
	const o = new Uint8Array(len)
	let v = BigInt(n)
	for (let i = len - 1; i >= 0; i--) {
		o[i] = Number(v & 0xffn)
		v >>= 8n
	}
	return o
}

function os2ip(bytes: Uint8Array): bigint {
	let v = 0n
	for (const b of bytes) v = (v << 8n) | BigInt(b)
	return v
}

function concat(...arrs: Uint8Array[]): Uint8Array {
	let n = 0
	for (const a of arrs) n += a.length
	const o = new Uint8Array(n)
	let i = 0
	for (const a of arrs) {
		o.set(a, i)
		i += a.length
	}
	return o
}

// The spec re-hashes the salt until the reduced scalar is non-zero.
function hkdfModR(ikm: Uint8Array, keyInfo: Uint8Array = new Uint8Array(0)): bigint {
	let salt: Uint8Array = new TextEncoder().encode('BLS-SIG-KEYGEN-SALT-')
	let sk = 0n
	while (sk === 0n) {
		salt = sha256(salt)
		const prk = extract(sha256, concat(ikm, i2osp(0, 1)), salt)
		const okm = expand(sha256, prk, concat(keyInfo, i2osp(L, 2)), L)
		sk = os2ip(okm) % R
	}
	return sk
}

function ikmToLamportSK(ikm: Uint8Array, salt: Uint8Array): Uint8Array[] {
	const prk = extract(sha256, ikm, salt)
	const okm = expand(sha256, prk, new Uint8Array(0), LAMPORT_L)
	const chunks: Uint8Array[] = []
	for (let i = 0; i < 255; i++) chunks.push(okm.slice(i * 32, i * 32 + 32))
	return chunks
}

function parentSKToLamportPK(parentSK: bigint, index: number): Uint8Array {
	const salt = i2osp(index, 4)
	const ikm = i2osp(parentSK, 32)
	const notIkm = ikm.map((b) => b ^ 0xff)
	const lamport0 = ikmToLamportSK(ikm, salt)
	const lamport1 = ikmToLamportSK(notIkm, salt)
	const parts: Uint8Array[] = []
	for (const c of lamport0) parts.push(sha256(c))
	for (const c of lamport1) parts.push(sha256(c))
	return sha256(concat(...parts))
}

/** Master secret scalar from a BIP39 seed (≥ 32 bytes). Returns a bigint. */
export function deriveMasterSK(seed: Uint8Array): bigint {
	if (!seed || seed.length < 32) throw new Error('EIP-2333: seed must be ≥ 32 bytes')
	return hkdfModR(seed)
}

/** One child derivation step. parentSK and the result are bigints. */
export function deriveChildSK(parentSK: bigint, index: number): bigint {
	return hkdfModR(parentSKToLamportPK(parentSK, index))
}

/** Walk a full hardened path, e.g. [12381, 36969, 0, 0, 0]. */
export function deriveChildSKMultiple(masterSK: bigint, path: number[]): bigint {
	let sk = masterSK
	for (const i of path) sk = deriveChildSK(sk, i)
	return sk
}

/** 32-byte big-endian encoding of a secret scalar — the form BLS signing expects. */
export function skToBytes(sk: bigint): Uint8Array {
	return i2osp(sk, 32)
}
