/**
 * ABI-Driven Contract Factory
 *
 * Generates fully-typed contract interfaces from `as const` ABI definitions,
 * similar to viem's getContract() or ethers typechain.
 *
 * Each function declared in the ABI becomes a typed method on the contract
 * object — with autocomplete for function names and typed params derived
 * from the ABI inputs.
 *
 * @example
 * ```ts
 * import { createContract, LOCKUP_PRIME_ABI, toAtomicAma } from '@amadeus-protocol/sdk'
 *
 * // Unsigned — returns ContractCall for TransactionBuilder.signCall()
 * const lockupPrime = createContract(LOCKUP_PRIME_ABI)
 * const call = lockupPrime.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })
 * const { txHash, txPacked } = TransactionBuilder.signCall(privateKey, call)
 *
 * // Signed — bind a private key, methods return BuildTransactionResult directly
 * const signed = createContract(LOCKUP_PRIME_ABI).connect(privateKey)
 * const result = signed.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })
 * ```
 */

import type { BuildTransactionResult } from '../types'
import { signContractCall } from '../signing'
import type { AbiDefinition, AbiInput } from './abi-types'
import type { ContractCall } from './contract-call'
import { buildContractCall } from './contract-call'

// ── Type-level ABI → Method mapping ─────────────────────────────────

/**
 * Map an ABI inputs tuple to a params object: `{ inputName: string }`
 */
type InputsToParams<Inputs extends readonly AbiInput[]> = {
	readonly [I in Inputs[number] as I['name']]: string
}

/**
 * For each function in the ABI, generate a typed method signature.
 *
 * - Functions with inputs → `(params: { name: string, ... }) => ContractCall`
 * - Functions without inputs → `() => ContractCall`
 */
type ContractMethods<TAbi extends AbiDefinition> = {
	readonly [F in TAbi['abi'][number] as F['name']]: F['inputs'] extends readonly []
		? () => ContractCall
		: (params: InputsToParams<F['inputs']>) => ContractCall
}

/**
 * Same as ContractMethods but methods return signed `BuildTransactionResult`.
 */
type SignedContractMethods<TAbi extends AbiDefinition> = {
	readonly [F in TAbi['abi'][number] as F['name']]: F['inputs'] extends readonly []
		? () => BuildTransactionResult
		: (params: InputsToParams<F['inputs']>) => BuildTransactionResult
}

// ── Public types ────────────────────────────────────────────────────

/**
 * A typed contract interface generated from an ABI definition.
 *
 * Each ABI function is exposed as a method that returns a `ContractCall`
 * (ready for `TransactionBuilder.signCall()`).
 *
 * Call `.connect(privateKey)` to get a `SignedContract` where methods
 * return `BuildTransactionResult` directly.
 */
export type TypedContract<TAbi extends AbiDefinition> = ContractMethods<TAbi> & {
	/** The original ABI definition */
	readonly abi: TAbi
	/** Contract name extracted from ABI */
	readonly contractName: TAbi['contractName']
	/**
	 * Bind a signer to produce a `SignedContract` where every method
	 * derives keys, builds, and signs in one step.
	 *
	 * @param privateKey - Base58 encoded private key (seed)
	 */
	connect(privateKey: string): SignedContract<TAbi>
}

/**
 * A signer-bound contract interface.
 *
 * Every ABI function is a method that returns `BuildTransactionResult`
 * (txHash + txPacked ready for submission).
 */
export type SignedContract<TAbi extends AbiDefinition> = SignedContractMethods<TAbi> & {
	/** The original ABI definition */
	readonly abi: TAbi
	/** Contract name extracted from ABI */
	readonly contractName: TAbi['contractName']
}

// ── Factory functions ───────────────────────────────────────────────

/**
 * Create a typed contract interface from an ABI definition.
 *
 * Returns an object where each ABI function is a method with fully typed
 * params (derived from ABI inputs) and autocomplete on function names.
 *
 * @param abi - An ABI definition object (must be declared `as const`)
 * @returns A typed `TypedContract<TAbi>` with methods for each ABI function
 *
 * @example
 * ```ts
 * import { createContract, LOCKUP_PRIME_ABI, LOCKUP_ABI, toAtomicAma } from '@amadeus-protocol/sdk'
 *
 * // Each ABI function becomes a typed method:
 * const lockupPrime = createContract(LOCKUP_PRIME_ABI)
 * lockupPrime.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })   // typed
 * lockupPrime.unlock({ vaultIndex: '3' })                                   // typed
 * lockupPrime.daily_checkin({ vaultIndex: '7' })                            // typed
 *
 * // Sign the call:
 * const call = lockupPrime.lock({ amount: '100000000000', tier: '30d' })
 * const { txHash, txPacked } = TransactionBuilder.signCall(privateKey, call)
 *
 * // Or bind a signer:
 * const signed = lockupPrime.connect(privateKey)
 * const result = signed.lock({ amount: '100000000000', tier: '30d' })
 * ```
 */
export function createContract<TAbi extends AbiDefinition>(abi: TAbi): TypedContract<TAbi> {
	if (!abi || typeof abi !== 'object') {
		throw new Error('Invalid ABI: expected an object')
	}
	if (typeof abi.contractName !== 'string' || !abi.contractName) {
		throw new Error('Invalid ABI: missing or empty "contractName"')
	}
	if (!Array.isArray(abi.abi)) {
		throw new Error(`Invalid ABI for ${abi.contractName}: "abi" must be an array of functions`)
	}
	for (const fn of abi.abi) {
		if (fn.type !== 'function') {
			throw new Error(
				`Invalid ABI for ${abi.contractName}: entry "${fn.name ?? '?'}" has type "${fn.type}", expected "function"`
			)
		}
		if (typeof fn.name !== 'string' || !fn.name) {
			throw new Error(`Invalid ABI for ${abi.contractName}: function entry missing "name"`)
		}
		if (!Array.isArray(fn.inputs)) {
			throw new Error(
				`Invalid ABI for ${abi.contractName}: function "${fn.name}" missing "inputs" array`
			)
		}
	}

	const contract: Record<string, unknown> = {
		abi,
		contractName: abi.contractName,
		connect(privateKey: string) {
			return createSignedContract(abi, privateKey)
		}
	}

	for (const fn of abi.abi) {
		contract[fn.name] = (params?: Record<string, string>) => {
			return buildContractCall(
				abi,
				fn.name as never,
				(params ?? {}) as never
			)
		}
	}

	return contract as TypedContract<TAbi>
}

/**
 * Create a signer-bound contract where each method builds + signs in one step.
 */
function createSignedContract<TAbi extends AbiDefinition>(
	abi: TAbi,
	privateKey: string
): SignedContract<TAbi> {
	const contract: Record<string, unknown> = {
		abi,
		contractName: abi.contractName
	}

	for (const fn of abi.abi) {
		contract[fn.name] = (params?: Record<string, string>) => {
			const call = buildContractCall(
				abi,
				fn.name as never,
				(params ?? {}) as never
			)
			return signContractCall(privateKey, call)
		}
	}

	return contract as SignedContract<TAbi>
}
