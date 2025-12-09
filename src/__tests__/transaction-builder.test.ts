import { describe, it, expect, beforeEach } from 'vitest'
import { TransactionBuilder } from '../transaction-builder'
import { generateKeypair, deriveSkAndSeed64FromBase58Seed, getPublicKey } from '../crypto'
import { fromBase58 } from '../encoding'

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
})
