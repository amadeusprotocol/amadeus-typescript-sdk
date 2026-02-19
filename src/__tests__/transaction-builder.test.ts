import { describe, it, expect, beforeEach } from 'vitest'
import { TransactionBuilder } from '../transaction-builder'
import { generateKeypair, deriveSkAndSeed64FromBase58Seed, getPublicKey } from '../crypto'
import { fromBase58 } from '../encoding'
import { toAtomicAma } from '../conversion'

describe('TransactionBuilder', () => {
	let keypair: ReturnType<typeof generateKeypair>

	beforeEach(() => {
		keypair = generateKeypair()
	})

	describe('Instance Methods', () => {
		it('creates instance with private key', () => {
			const builder = new TransactionBuilder(keypair.privateKey)

			expect(builder).toBeInstanceOf(TransactionBuilder)
		})

		it('creates instance without private key', () => {
			const builder = new TransactionBuilder()

			expect(builder).toBeInstanceOf(TransactionBuilder)
		})

		it('builds unsigned transfer transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const recipient = generateKeypair().publicKey
			const unsignedTx = builder.buildTransfer({
				recipient,
				amount: 10.5,
				symbol: 'AMA'
			})

			expect(unsignedTx).toHaveProperty('tx')
			expect(unsignedTx).toHaveProperty('hash')
		})

		it('builds and signs transfer transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const recipient = generateKeypair().publicKey
			const result = builder.transfer({
				recipient,
				amount: 10.5,
				symbol: 'AMA'
			})

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})

		it('builds unsigned transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const recipient = fromBase58(generateKeypair().publicKey)
			const unsignedTx = builder.build('Coin', 'transfer', [recipient, '1000000000', 'AMA'])

			expect(unsignedTx).toHaveProperty('tx')
			expect(unsignedTx).toHaveProperty('hash')
			expect(unsignedTx.tx).toHaveProperty('signer')
			expect(unsignedTx.tx).toHaveProperty('nonce')
			expect(unsignedTx.tx).toHaveProperty('action')
		})

		it('builds and signs transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const recipient = fromBase58(generateKeypair().publicKey)
			const result = builder.buildAndSign('Coin', 'transfer', [
				recipient,
				'1000000000',
				'AMA'
			])

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
		})

		it('signs unsigned transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const recipient = fromBase58(generateKeypair().publicKey)
			const unsignedTx = builder.build('Coin', 'transfer', [recipient, '1000000000', 'AMA'])
			const result = builder.sign(unsignedTx)

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
		})

		it('throws when building transfer without private key', () => {
			const builder = new TransactionBuilder()

			expect(() => {
				builder.transfer({
					recipient: generateKeypair().publicKey,
					amount: 10,
					symbol: 'AMA'
				})
			}).toThrow()
		})

		it('signs unsigned transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const unsignedTx = builder.build('Coin', 'transfer', [
				fromBase58(generateKeypair().publicKey),
				'1000000000',
				'AMA'
			])
			const result = builder.sign(unsignedTx)

			expect(result.txHash).toBeDefined()
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})

		it('signs unsigned transaction with Base58 string key', () => {
			const builder = new TransactionBuilder()
			const { seed64 } = deriveSkAndSeed64FromBase58Seed(keypair.privateKey)
			const signerPubKey = getPublicKey(seed64)
			const unsignedTx = builder.build(
				'Coin',
				'transfer',
				[fromBase58(generateKeypair().publicKey), '1000000000', 'AMA'],
				signerPubKey
			)
			const result = builder.sign(unsignedTx, keypair.privateKey)

			expect(result.txHash).toBeDefined()
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})

		it('builds and signs transaction with Base58 string key', () => {
			const builder = new TransactionBuilder()
			const { seed64 } = deriveSkAndSeed64FromBase58Seed(keypair.privateKey)
			const signerPubKey = getPublicKey(seed64)
			const recipient = fromBase58(generateKeypair().publicKey)
			const result = builder.buildAndSign(
				'Coin',
				'transfer',
				[recipient, '1000000000', 'AMA'],
				signerPubKey,
				keypair.privateKey
			)

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
		})
	})

	describe('Static Methods', () => {
		it('builds unsigned transfer transaction statically', () => {
			const { seed64 } = deriveSkAndSeed64FromBase58Seed(keypair.privateKey)
			const signerPubKey = getPublicKey(seed64)
			const recipient = generateKeypair().publicKey
			const unsignedTx = TransactionBuilder.buildTransfer(
				{ recipient, amount: 10.5, symbol: 'AMA' },
				signerPubKey
			)

			expect(unsignedTx).toHaveProperty('tx')
			expect(unsignedTx).toHaveProperty('hash')
		})

		it('builds and signs transfer transaction statically', () => {
			const recipient = generateKeypair().publicKey
			const result = TransactionBuilder.buildSignedTransfer({
				senderPrivkey: keypair.privateKey,
				recipient,
				amount: 10.5,
				symbol: 'AMA'
			})

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
		})

		it('builds unsigned transaction statically', () => {
			const { seed64 } = deriveSkAndSeed64FromBase58Seed(keypair.privateKey)
			const signerPubKey = getPublicKey(seed64)
			const recipient = fromBase58(generateKeypair().publicKey)
			const unsignedTx = TransactionBuilder.build(signerPubKey, 'Coin', 'transfer', [
				recipient,
				'1000000000',
				'AMA'
			])

			expect(unsignedTx).toHaveProperty('tx')
			expect(unsignedTx).toHaveProperty('hash')
		})

		it('builds and signs transaction statically', () => {
			const { seed64, sk } = deriveSkAndSeed64FromBase58Seed(keypair.privateKey)
			const signerPubKey = getPublicKey(seed64)
			const recipient = fromBase58(generateKeypair().publicKey)
			const result = TransactionBuilder.buildAndSign(signerPubKey, sk, 'Coin', 'transfer', [
				recipient,
				'1000000000',
				'AMA'
			])

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
		})

		it('signs unsigned transaction statically with Base58 string', () => {
			const { seed64 } = deriveSkAndSeed64FromBase58Seed(keypair.privateKey)
			const signerPubKey = getPublicKey(seed64)
			const recipient = fromBase58(generateKeypair().publicKey)
			const unsignedTx = TransactionBuilder.build(signerPubKey, 'Coin', 'transfer', [
				recipient,
				'1000000000',
				'AMA'
			])
			const result = TransactionBuilder.sign(unsignedTx, keypair.privateKey)

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
		})

		it('builds and signs transaction statically with Base58 string', () => {
			const { seed64 } = deriveSkAndSeed64FromBase58Seed(keypair.privateKey)
			const signerPubKey = getPublicKey(seed64)
			const recipient = fromBase58(generateKeypair().publicKey)
			const result = TransactionBuilder.buildAndSign(
				signerPubKey,
				keypair.privateKey,
				'Coin',
				'transfer',
				[recipient, '1000000000', 'AMA']
			)

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
		})
	})

	describe('Transaction Structure', () => {
		it('creates valid transaction structure', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const recipient = generateKeypair().publicKey
			const { txPacked } = builder.transfer({
				recipient,
				amount: 1,
				symbol: 'AMA'
			})

			expect(txPacked).toBeInstanceOf(Uint8Array)
			expect(txPacked.length).toBeGreaterThan(0)
		})

		it('includes nonce in transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const recipient = generateKeypair().publicKey
			const result1 = builder.transfer({
				recipient,
				amount: 1,
				symbol: 'AMA'
			})
			const result2 = builder.transfer({
				recipient,
				amount: 1,
				symbol: 'AMA'
			})

			expect(result1.txHash).not.toBe(result2.txHash)
		})
	})

	// ========================================================================
	// LockupPrime Instance Methods
	// ========================================================================

	describe('LockupPrime Instance Methods', () => {
		it('lockupPrimeLock builds correct transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.lockupPrimeLock({ amount: 100, tier: '30d' })

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)

			// Verify action structure via unsigned build
			const unsignedTx = builder.build('LockupPrime', 'lock', [
				toAtomicAma(100).toString(),
				'30d'
			])
			expect(unsignedTx.tx.action.contract).toBe('LockupPrime')
			expect(unsignedTx.tx.action.function).toBe('lock')
			expect(unsignedTx.tx.action.args).toHaveLength(2)
			expect(unsignedTx.tx.action.args[0]).toBe('100000000000')
			expect(unsignedTx.tx.action.args[1]).toBe('30d')
		})

		it('lockupPrimeLock handles string amount', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.lockupPrimeLock({ amount: '50.5', tier: '90d' })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)

			// Verify the amount conversion is correct
			const unsignedTx = builder.build('LockupPrime', 'lock', [
				toAtomicAma('50.5').toString(),
				'90d'
			])
			expect(unsignedTx.tx.action.args[0]).toBe('50500000000')
			expect(unsignedTx.tx.action.args[1]).toBe('90d')
		})

		it('lockupPrimeUnlock builds correct transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.lockupPrimeUnlock({ vaultIndex: 3 })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)

			const unsignedTx = builder.build('LockupPrime', 'unlock', ['3'])
			expect(unsignedTx.tx.action.contract).toBe('LockupPrime')
			expect(unsignedTx.tx.action.function).toBe('unlock')
			expect(unsignedTx.tx.action.args).toEqual(['3'])
		})

		it('lockupPrimeDailyCheckin builds correct transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.lockupPrimeDailyCheckin({ vaultIndex: 7 })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)

			const unsignedTx = builder.build('LockupPrime', 'daily_checkin', ['7'])
			expect(unsignedTx.tx.action.contract).toBe('LockupPrime')
			expect(unsignedTx.tx.action.function).toBe('daily_checkin')
			expect(unsignedTx.tx.action.args).toEqual(['7'])
		})

		it('throws when calling lockup instance methods without private key', () => {
			const builder = new TransactionBuilder()

			expect(() => builder.lockupPrimeLock({ amount: 100, tier: 'gold' })).toThrow()
			expect(() => builder.lockupPrimeUnlock({ vaultIndex: 1 })).toThrow()
			expect(() => builder.lockupPrimeDailyCheckin({ vaultIndex: 1 })).toThrow()
			expect(() => builder.lockupUnlock({ vaultIndex: 1 })).toThrow()
		})
	})

	// ========================================================================
	// Lockup Instance Methods
	// ========================================================================

	describe('Lockup Instance Methods', () => {
		it('lockupUnlock builds correct transaction', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const result = builder.lockupUnlock({ vaultIndex: 5 })

			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)

			const unsignedTx = builder.build('Lockup', 'unlock', ['5'])
			expect(unsignedTx.tx.action.contract).toBe('Lockup')
			expect(unsignedTx.tx.action.function).toBe('unlock')
			expect(unsignedTx.tx.action.args).toEqual(['5'])
		})
	})

	// ========================================================================
	// LockupPrime Static Methods
	// ========================================================================

	describe('LockupPrime Static Methods', () => {
		it('buildSignedLockupPrimeLock produces valid signed output', () => {
			const result = TransactionBuilder.buildSignedLockupPrimeLock({
				senderPrivkey: keypair.privateKey,
				amount: 200,
				tier: '365d'
			})

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})

		it('buildSignedLockupPrimeUnlock produces valid signed output', () => {
			const result = TransactionBuilder.buildSignedLockupPrimeUnlock({
				senderPrivkey: keypair.privateKey,
				vaultIndex: 12
			})

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})

		it('buildSignedLockupPrimeDailyCheckin produces valid signed output', () => {
			const result = TransactionBuilder.buildSignedLockupPrimeDailyCheckin({
				senderPrivkey: keypair.privateKey,
				vaultIndex: 4
			})

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})
	})

	// ========================================================================
	// Lockup Static Methods
	// ========================================================================

	describe('Lockup Static Methods', () => {
		it('buildSignedLockupUnlock produces valid signed output', () => {
			const result = TransactionBuilder.buildSignedLockupUnlock({
				senderPrivkey: keypair.privateKey,
				vaultIndex: 9
			})

			expect(result).toHaveProperty('txHash')
			expect(result).toHaveProperty('txPacked')
			expect(result.txHash).toBeTypeOf('string')
			expect(result.txPacked).toBeInstanceOf(Uint8Array)
			expect(result.txPacked.length).toBeGreaterThan(0)
		})
	})

	// ========================================================================
	// Cross-verification: static vs instance produce consistent output
	// ========================================================================

	describe('Static vs Instance Consistency', () => {
		it('static and instance lockupPrimeLock produce output of similar size', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const instanceResult = builder.lockupPrimeLock({ amount: 100, tier: '30d' })
			const staticResult = TransactionBuilder.buildSignedLockupPrimeLock({
				senderPrivkey: keypair.privateKey,
				amount: 100,
				tier: '30d'
			})

			// Both should produce valid output of similar structure
			expect(instanceResult.txHash).toBeTypeOf('string')
			expect(staticResult.txHash).toBeTypeOf('string')
			// Packed sizes should be very close (same structure, different nonce/timestamp)
			expect(
				Math.abs(instanceResult.txPacked.length - staticResult.txPacked.length)
			).toBeLessThan(5)
		})

		it('static and instance lockupUnlock produce output of similar size', () => {
			const builder = new TransactionBuilder(keypair.privateKey)
			const instanceResult = builder.lockupUnlock({ vaultIndex: 2 })
			const staticResult = TransactionBuilder.buildSignedLockupUnlock({
				senderPrivkey: keypair.privateKey,
				vaultIndex: 2
			})

			expect(instanceResult.txHash).toBeTypeOf('string')
			expect(staticResult.txHash).toBeTypeOf('string')
			expect(
				Math.abs(instanceResult.txPacked.length - staticResult.txPacked.length)
			).toBeLessThan(5)
		})
	})
})
