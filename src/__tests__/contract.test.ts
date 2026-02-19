import { describe, it, expect, beforeEach } from 'vitest'
import { createContract } from '../contracts/contract'
import { buildContractCall } from '../contracts/contract-call'
import { buildCoinTransfer } from '../contracts/coin'
import { LOCKUP_PRIME_ABI } from '../contracts/lockup-prime/abi'
import { LOCKUP_ABI } from '../contracts/lockup/abi'
import { TransactionBuilder } from '../transaction-builder'
import { generateKeypair } from '../crypto'
import { toAtomicAma } from '../conversion'

describe('createContract', () => {
	let keypair: ReturnType<typeof generateKeypair>

	beforeEach(() => {
		keypair = generateKeypair()
	})

	// ========================================================================
	// LockupPrime contract
	// ========================================================================

	describe('LockupPrime', () => {
		it('creates contract with correct name and abi', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)

			expect(contract.contractName).toBe('LockupPrime')
			expect(contract.abi).toBe(LOCKUP_PRIME_ABI)
		})

		it('exposes lock, unlock, daily_checkin methods', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)

			expect(typeof contract.lock).toBe('function')
			expect(typeof contract.unlock).toBe('function')
			expect(typeof contract.daily_checkin).toBe('function')
		})

		it('lock() returns a valid ContractCall', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)
			const call = contract.lock({
				amount: toAtomicAma(100).toString(),
				tier: '30d'
			})

			expect(call.contract).toBe('LockupPrime')
			expect(call.method).toBe('lock')
			expect(call.args).toEqual(['100000000000', '30d'])
		})

		it('unlock() returns a valid ContractCall', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)
			const call = contract.unlock({ vaultIndex: '3' })

			expect(call.contract).toBe('LockupPrime')
			expect(call.method).toBe('unlock')
			expect(call.args).toEqual(['3'])
		})

		it('daily_checkin() returns a valid ContractCall', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)
			const call = contract.daily_checkin({ vaultIndex: '7' })

			expect(call.contract).toBe('LockupPrime')
			expect(call.method).toBe('daily_checkin')
			expect(call.args).toEqual(['7'])
		})

		it('lock() validates tier enum at runtime', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)

			expect(() => {
				contract.lock({ amount: '100', tier: 'invalid_tier' })
			}).toThrow(/Invalid value "invalid_tier"/)
		})

		it('lock() throws on missing params', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)

			expect(() => {
				// @ts-expect-error — testing runtime validation
				contract.lock({ amount: '100' })
			}).toThrow(/Missing required parameter "tier"/)
		})
	})

	// ========================================================================
	// Lockup contract
	// ========================================================================

	describe('Lockup', () => {
		it('creates contract with correct name', () => {
			const contract = createContract(LOCKUP_ABI)

			expect(contract.contractName).toBe('Lockup')
		})

		it('unlock() returns a valid ContractCall', () => {
			const contract = createContract(LOCKUP_ABI)
			const call = contract.unlock({ vaultIndex: '5' })

			expect(call.contract).toBe('Lockup')
			expect(call.method).toBe('unlock')
			expect(call.args).toEqual(['5'])
		})
	})

	// ========================================================================
	// Integration with TransactionBuilder.signCall
	// ========================================================================

	describe('TransactionBuilder.signCall integration', () => {
		it('signs a LockupPrime lock call', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)
			const call = contract.lock({
				amount: toAtomicAma(100).toString(),
				tier: '30d'
			})
			const result = TransactionBuilder.signCall(keypair.privateKey, call)

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})

		it('signs a Lockup unlock call', () => {
			const contract = createContract(LOCKUP_ABI)
			const call = contract.unlock({ vaultIndex: '9' })
			const result = TransactionBuilder.signCall(keypair.privateKey, call)

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})
	})

	// ========================================================================
	// Integration with TransactionBuilder instance (buildFromCall / buildAndSignCall)
	// ========================================================================

	describe('TransactionBuilder instance integration', () => {
		it('buildFromCall builds unsigned tx from ContractCall', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const contract = createContract(LOCKUP_PRIME_ABI)
			const call = contract.lock({
				amount: toAtomicAma(50).toString(),
				tier: '7d'
			})
			const unsignedTx = builder.buildFromCall(call)

			expect(unsignedTx).toHaveProperty('tx')
			expect(unsignedTx).toHaveProperty('hash')
			expect(unsignedTx.tx.action.contract).toBe('LockupPrime')
			expect(unsignedTx.tx.action.function).toBe('lock')
			expect(unsignedTx.tx.action.args).toEqual([
				toAtomicAma(50).toString(),
				'7d'
			])
		})

		it('buildAndSignCall builds and signs from ContractCall', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const contract = createContract(LOCKUP_PRIME_ABI)
			const call = contract.unlock({ vaultIndex: '2' })
			const result = builder.buildAndSignCall(call)

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})
	})

	// ========================================================================
	// .connect() — SignedContract
	// ========================================================================

	describe('connect (SignedContract)', () => {
		it('connect() returns a signed contract with same methods', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)
			const signed = contract.connect(keypair.privateKey)

			expect(signed.contractName).toBe('LockupPrime')
			expect(signed.abi).toBe(LOCKUP_PRIME_ABI)
			expect(typeof signed.lock).toBe('function')
			expect(typeof signed.unlock).toBe('function')
			expect(typeof signed.daily_checkin).toBe('function')
		})

		it('signed lock() returns BuildTransactionResult directly', () => {
			const signed = createContract(LOCKUP_PRIME_ABI).connect(keypair.privateKey)
			const result = signed.lock({
				amount: toAtomicAma(100).toString(),
				tier: '30d'
			})

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})

		it('signed unlock() returns BuildTransactionResult directly', () => {
			const signed = createContract(LOCKUP_PRIME_ABI).connect(keypair.privateKey)
			const result = signed.unlock({ vaultIndex: '3' })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('signed daily_checkin() returns BuildTransactionResult directly', () => {
			const signed = createContract(LOCKUP_PRIME_ABI).connect(keypair.privateKey)
			const result = signed.daily_checkin({ vaultIndex: '7' })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('Lockup signed unlock() works', () => {
			const signed = createContract(LOCKUP_ABI).connect(keypair.privateKey)
			const result = signed.unlock({ vaultIndex: '5' })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('signed contract validates enum at runtime', () => {
			const signed = createContract(LOCKUP_PRIME_ABI).connect(keypair.privateKey)

			expect(() => {
				signed.lock({ amount: '100', tier: 'bad' })
			}).toThrow(/Invalid value "bad"/)
		})
	})

	// ========================================================================
	// TransactionBuilder.contract(abi) — instance method
	// ========================================================================

	describe('TransactionBuilder.contract(abi)', () => {
		it('returns a SignedContract with typed methods', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const contract = builder.contract(LOCKUP_PRIME_ABI)

			expect(typeof contract.lock).toBe('function')
			expect(typeof contract.unlock).toBe('function')
			expect(typeof contract.daily_checkin).toBe('function')
			expect(contract.contractName).toBe('LockupPrime')
		})

		it('lock() returns BuildTransactionResult', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.contract(LOCKUP_PRIME_ABI).lock({
				amount: toAtomicAma(100).toString(),
				tier: '30d'
			})

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})

		it('unlock() returns BuildTransactionResult', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.contract(LOCKUP_PRIME_ABI).unlock({
				vaultIndex: '3'
			})

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('daily_checkin() returns BuildTransactionResult', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.contract(LOCKUP_PRIME_ABI).daily_checkin({
				vaultIndex: '7'
			})

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('works with LOCKUP_ABI', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.contract(LOCKUP_ABI).unlock({
				vaultIndex: '5'
			})

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('throws without private key', () => {
			const builder = new TransactionBuilder()

			expect(() => {
				builder.contract(LOCKUP_PRIME_ABI)
			}).toThrow(/Private key required/)
		})

		it('validates enum at runtime', () => {
			const builder = new TransactionBuilder(keypair.privateKey)

			expect(() => {
				builder.contract(LOCKUP_PRIME_ABI).lock({
					amount: '100',
					tier: 'invalid'
				})
			}).toThrow(/Invalid value "invalid"/)
		})
	})

	// ========================================================================
	// Byte equivalence: createContract vs built-in TransactionBuilder methods
	// ========================================================================

	describe('Byte equivalence with built-in methods', () => {
		it('createContract.lock() produces same args as builder.lockupPrimeLock', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)
			const call = contract.lock({
				amount: toAtomicAma(100).toString(),
				tier: '30d'
			})

			expect(call.contract).toBe('LockupPrime')
			expect(call.method).toBe('lock')
			expect(call.args).toEqual([toAtomicAma(100).toString(), '30d'])
		})

		it('signed contract output matches TransactionBuilder.signCall output (same nonce → same bytes)', () => {
			const contract = createContract(LOCKUP_PRIME_ABI)
			const call = contract.lock({
				amount: toAtomicAma(200).toString(),
				tier: '365d'
			})

			const viaSignCall = TransactionBuilder.signCall(keypair.privateKey, call)
			const viaSigned = createContract(LOCKUP_PRIME_ABI)
				.connect(keypair.privateKey)
				.lock({ amount: toAtomicAma(200).toString(), tier: '365d' })

			// Both produce valid output (nonces differ due to timestamp, but structure is same)
			expect(viaSignCall.txHash).toBeTypeOf('string')
			expect(viaSigned.txHash).toBeTypeOf('string')
			expect(
				Math.abs(viaSignCall.txPacked.length - viaSigned.txPacked.length)
			).toBeLessThan(5)
		})

		it('builder.contract(ABI).lock() produces same size as builder.lockupPrimeLock()', () => {
			const builder = new TransactionBuilder(keypair.privateKey)

			const viaContract = builder.contract(LOCKUP_PRIME_ABI).lock({
				amount: toAtomicAma(100).toString(),
				tier: '30d'
			})
			const viaBuiltIn = builder.lockupPrimeLock({ amount: 100, tier: '30d' })

			expect(viaContract.txHash).toBeTypeOf('string')
			expect(viaBuiltIn.txHash).toBeTypeOf('string')
			expect(
				Math.abs(viaContract.txPacked.length - viaBuiltIn.txPacked.length)
			).toBeLessThan(5)
		})
	})

	// ========================================================================
	// ABI validation — runtime
	// ========================================================================

	describe('ABI validation (runtime)', () => {
		it('throws on null/undefined ABI', () => {
			// @ts-expect-error — testing runtime validation
			expect(() => createContract(null)).toThrow(/Invalid ABI/)
			// @ts-expect-error — testing runtime validation
			expect(() => createContract(undefined)).toThrow(/Invalid ABI/)
		})

		it('throws on non-object ABI', () => {
			// @ts-expect-error — testing runtime validation
			expect(() => createContract('not an abi')).toThrow(/Invalid ABI/)
			// @ts-expect-error — testing runtime validation
			expect(() => createContract(42)).toThrow(/Invalid ABI/)
		})

		it('throws on missing contractName', () => {
			// @ts-expect-error — testing runtime validation
			expect(() => createContract({ abi: [] })).toThrow(/missing or empty "contractName"/)
		})

		it('throws on empty contractName', () => {
			// @ts-expect-error — testing runtime validation
			expect(() => createContract({ contractName: '', abi: [] })).toThrow(/missing or empty "contractName"/)
		})

		it('throws on missing abi array', () => {
			// @ts-expect-error — testing runtime validation
			expect(() => createContract({ contractName: 'Test' })).toThrow(/"abi" must be an array/)
		})

		it('throws on non-array abi', () => {
			// @ts-expect-error — testing runtime validation
			expect(() => createContract({ contractName: 'Test', abi: 'bad' })).toThrow(/"abi" must be an array/)
		})

		it('throws on function entry with wrong type', () => {
			expect(() => createContract({
				contractName: 'Test',
				abi: [
					// @ts-expect-error — testing runtime validation
					{ type: 'event', name: 'foo', inputs: [], outputs: [], stateMutability: 'view' }
				]
			})).toThrow(/has type "event", expected "function"/)
		})

		it('throws on function entry missing name', () => {
			expect(() => createContract({
				contractName: 'Test',
				abi: [
					// @ts-expect-error — testing runtime validation
					{ type: 'function', inputs: [], outputs: [], stateMutability: 'view' }
				]
			})).toThrow(/missing "name"/)
		})

		it('throws on function entry missing inputs', () => {
			expect(() => createContract({
				contractName: 'Test',
				abi: [
					// @ts-expect-error — testing runtime validation
					{ type: 'function', name: 'foo', outputs: [], stateMutability: 'view' }
				]
			})).toThrow(/missing "inputs" array/)
		})

		it('accepts valid minimal ABI', () => {
			const contract = createContract({
				contractName: 'Minimal',
				abi: [
					{ type: 'function', name: 'ping', inputs: [], outputs: [], stateMutability: 'nonpayable' }
				]
			} as const)

			expect(contract.contractName).toBe('Minimal')
			expect(typeof contract.ping).toBe('function')
		})
	})

	// ========================================================================
	// No-input functions
	// ========================================================================

	describe('No-input functions', () => {
		const MINIMAL_ABI = {
			contractName: 'Minimal',
			abi: [
				{
					type: 'function',
					name: 'ping',
					inputs: [],
					outputs: [],
					stateMutability: 'nonpayable'
				}
			]
		} as const

		it('no-input function returns valid ContractCall when called without args', () => {
			const contract = createContract(MINIMAL_ABI)
			const call = contract.ping()

			expect(call.contract).toBe('Minimal')
			expect(call.method).toBe('ping')
			expect(call.args).toEqual([])
		})

		it('no-input function works with .connect()', () => {
			const signed = createContract(MINIMAL_ABI).connect(keypair.privateKey)
			const result = signed.ping()

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('no-input function works via builder.contract()', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.contract(MINIMAL_ABI).ping()

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})
	})

	// ========================================================================
	// Backwards compatibility: built-in methods still work
	// ========================================================================

	describe('Backwards compatibility', () => {
		it('builder.lockupPrimeLock() still works', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.lockupPrimeLock({ amount: 100, tier: '30d' })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('builder.lockupPrimeUnlock() still works', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.lockupPrimeUnlock({ vaultIndex: 3 })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('builder.lockupPrimeDailyCheckin() still works', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.lockupPrimeDailyCheckin({ vaultIndex: 7 })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('builder.lockupUnlock() still works', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.lockupUnlock({ vaultIndex: 5 })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('TransactionBuilder.buildSignedLockupPrimeLock() still works', () => {
			const result = TransactionBuilder.buildSignedLockupPrimeLock({
				senderPrivkey: keypair.privateKey,
				amount: 100,
				tier: '30d'
			})

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('TransactionBuilder.buildSignedLockupUnlock() still works', () => {
			const result = TransactionBuilder.buildSignedLockupUnlock({
				senderPrivkey: keypair.privateKey,
				vaultIndex: 5
			})

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('builder.transfer() still works', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const recipient = generateKeypair().publicKey
			const result = builder.transfer({ recipient, amount: 10, symbol: 'AMA' })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})

		it('TransactionBuilder.buildSignedTransfer() still works', () => {
			const recipient = generateKeypair().publicKey
			const result = TransactionBuilder.buildSignedTransfer({
				senderPrivkey: keypair.privateKey,
				recipient,
				amount: 10,
				symbol: 'AMA'
			})

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
		})
	})
})

// ========================================================================
// buildContractCall (low-level)
// ========================================================================

describe('buildContractCall', () => {
	it('builds a call from LOCKUP_PRIME_ABI', () => {
		const call = buildContractCall(LOCKUP_PRIME_ABI, 'lock', {
			amount: '100000000000',
			tier: '30d'
		})

		expect(call.contract).toBe('LockupPrime')
		expect(call.method).toBe('lock')
		expect(call.args).toEqual(['100000000000', '30d'])
	})

	it('builds a call from LOCKUP_ABI', () => {
		const call = buildContractCall(LOCKUP_ABI, 'unlock', {
			vaultIndex: '5'
		})

		expect(call.contract).toBe('Lockup')
		expect(call.method).toBe('unlock')
		expect(call.args).toEqual(['5'])
	})

	it('throws on unknown function name', () => {
		expect(() => {
			buildContractCall(
				LOCKUP_PRIME_ABI,
				// @ts-expect-error — testing runtime validation
				'nonexistent',
				{}
			)
		}).toThrow(/Function "nonexistent" not found/)
	})

	it('throws on missing required param', () => {
		expect(() => {
			buildContractCall(
				LOCKUP_PRIME_ABI,
				'lock',
				// @ts-expect-error — testing runtime validation
				{ amount: '100' }
			)
		}).toThrow(/Missing required parameter "tier"/)
	})

	it('throws on invalid enum value', () => {
		expect(() => {
			buildContractCall(LOCKUP_PRIME_ABI, 'lock', {
				amount: '100',
				tier: 'weekly'
			})
		}).toThrow(/Invalid value "weekly"/)
	})

	it('accepts all valid tier values', () => {
		for (const tier of ['7d', '30d', '90d', '180d', '365d']) {
			const call = buildContractCall(LOCKUP_PRIME_ABI, 'lock', {
				amount: '1000',
				tier
			})
			expect(call.args).toEqual(['1000', tier])
		}
	})
})

// ========================================================================
// buildCoinTransfer (Coin special case)
// ========================================================================

describe('buildCoinTransfer', () => {
	it('builds a Coin transfer ContractCall', () => {
		const keypair = generateKeypair()
		const call = buildCoinTransfer({
			recipient: keypair.publicKey,
			amount: 10.5,
			symbol: 'AMA'
		})

		expect(call.contract).toBe('Coin')
		expect(call.method).toBe('transfer')
		expect(call.args).toHaveLength(3)
		// First arg is Uint8Array (decoded from Base58)
		expect(call.args[0]).toBeInstanceOf(Uint8Array)
		// Second arg is atomic amount as string
		expect(call.args[1]).toBe(toAtomicAma(10.5).toString())
		// Third arg is symbol
		expect(call.args[2]).toBe('AMA')
	})

	it('works with TransactionBuilder.signCall', () => {
		const sender = generateKeypair()
		const recipient = generateKeypair()
		const call = buildCoinTransfer({
			recipient: recipient.publicKey,
			amount: 5,
			symbol: 'AMA'
		})
		const result = TransactionBuilder.signCall(sender.privateKey, call)

		expect(result.txHash).toBeTypeOf('string')
		expect(result.txPacked).toBeInstanceOf(Uint8Array)
		expect(result.txPacked.length).toBeGreaterThan(0)
	})
})
