/**
 * Generic ABI Type Extractors
 *
 * Type-level utilities that extract TypeScript types from `as const` ABI objects.
 * These enable compile-time safety for contract calls without any runtime overhead.
 */

/**
 * Shape of an ABI function input
 */
export interface AbiInput {
	readonly name: string
	readonly type: string
	readonly description?: string
	readonly validation?: {
		readonly min?: string
		readonly max?: string
		readonly type?: string
	}
	readonly enum?: readonly string[]
}

/**
 * Shape of an ABI function entry
 */
export interface AbiFunction {
	readonly type: 'function'
	readonly name: string
	readonly inputs: readonly AbiInput[]
	readonly outputs: readonly unknown[]
	readonly stateMutability: string
	readonly description?: string
	readonly requirements?: readonly string[]
	readonly storage?: unknown
}

/**
 * Shape of any ABI definition (contractName, abi[], errors[], storage)
 */
export interface AbiDefinition {
	readonly contractName: string
	readonly contractVersion?: string
	readonly abi: readonly AbiFunction[]
	readonly errors?: readonly unknown[]
	readonly storage?: unknown
}

/**
 * Extract the literal contract name from an ABI definition
 *
 * @example
 * ```ts
 * type Name = ExtractContractName<typeof LOCKUP_PRIME_ABI>
 * // => 'LockupPrime'
 * ```
 */
export type ExtractContractName<T extends AbiDefinition> = T['contractName']

/**
 * Extract a union of all function names from an ABI definition
 *
 * @example
 * ```ts
 * type Fns = ExtractFunctionNames<typeof LOCKUP_PRIME_ABI>
 * // => 'lock' | 'unlock' | 'daily_checkin'
 * ```
 */
export type ExtractFunctionNames<T extends AbiDefinition> = T['abi'][number]['name']

/**
 * Find a specific function entry in the ABI by name
 */
type FindFunction<
	TAbi extends AbiDefinition,
	TFn extends string
> = Extract<TAbi['abi'][number], { readonly name: TFn }>

/**
 * Extract the inputs array for a specific function
 */
type FunctionInputs<
	TAbi extends AbiDefinition,
	TFn extends string
> = FindFunction<TAbi, TFn>['inputs']

/**
 * Map an inputs tuple to a params object `{ inputName: string }`
 *
 * @example
 * ```ts
 * type Params = FunctionParams<typeof LOCKUP_PRIME_ABI, 'lock'>
 * // => { amount: string; tier: string }
 * ```
 */
export type FunctionParams<
	TAbi extends AbiDefinition,
	TFn extends string
> = {
	[K in FunctionInputs<TAbi, TFn>[number] as K['name']]: string
}
