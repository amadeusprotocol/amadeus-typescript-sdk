/**
 * Core ContractCall Abstraction
 *
 * Provides a generic, ABI-driven way to build contract calls with both
 * compile-time type safety and runtime validation.
 */

import type { SerializableValue } from '../types'
import type { AbiDefinition, ExtractContractName, ExtractFunctionNames, FunctionParams } from './abi-types'

/**
 * A fully-resolved contract call ready for TransactionBuilder.
 *
 * The type parameters are optional and used only for documentation;
 * at runtime this is just `{ contract, method, args }`.
 */
export interface ContractCall<
	_TAbi extends AbiDefinition = AbiDefinition,
	_TFn extends string = string
> {
	/** Contract name (e.g. 'LockupPrime', 'Lockup', 'Coin') */
	readonly contract: string
	/** Function/method name (e.g. 'lock', 'unlock', 'transfer') */
	readonly method: string
	/** Serialized args array ready for VecPack encoding */
	readonly args: SerializableValue[]
}

/**
 * Build a type-safe ContractCall from an ABI definition.
 *
 * Compile-time:
 * - `functionName` is constrained to the ABI's function name union
 * - `params` is typed per the function's declared inputs
 *
 * Runtime:
 * - Validates function exists in ABI
 * - Validates all required params are present
 * - Validates enum constraints on inputs that declare them
 *
 * @example
 * ```ts
 * import { LOCKUP_PRIME_ABI } from './lockup-prime/abi'
 *
 * const call = buildContractCall(LOCKUP_PRIME_ABI, 'lock', {
 *   amount: '1000000000',
 *   tier: '30d'
 * })
 * // call.contract === 'LockupPrime'
 * // call.method === 'lock'
 * // call.args === ['1000000000', '30d']
 * ```
 */
export function buildContractCall<
	TAbi extends AbiDefinition,
	TFn extends ExtractFunctionNames<TAbi>
>(
	abi: TAbi,
	functionName: TFn,
	params: FunctionParams<TAbi, TFn & string>
): ContractCall<TAbi, TFn & string> {
	const fn = abi.abi.find((f) => f.name === functionName)
	if (!fn) {
		throw new Error(
			`Function "${String(functionName)}" not found in ${abi.contractName} ABI`
		)
	}

	const args: SerializableValue[] = []
	for (const input of fn.inputs) {
		const value = (params as Record<string, string>)[input.name]
		if (value === undefined || value === null) {
			throw new Error(
				`Missing required parameter "${input.name}" for ${abi.contractName}.${String(functionName)}`
			)
		}

		if (input.enum && input.enum.length > 0) {
			if (!input.enum.includes(value)) {
				throw new Error(
					`Invalid value "${value}" for parameter "${input.name}". ` +
					`Expected one of: ${input.enum.join(', ')}`
				)
			}
		}

		args.push(value)
	}

	return {
		contract: abi.contractName as ExtractContractName<TAbi>,
		method: functionName as string,
		args
	}
}
