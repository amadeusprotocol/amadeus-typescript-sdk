import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AmadeusClient } from '../client'
import {
	ChainAPI,
	WalletAPI,
	TransactionAPI,
	ContractAPI,
	EpochAPI,
	PeerAPI,
	ProofAPI
} from '../api'
import { AmadeusSDKError } from '../types'
import { generateKeypair } from '../crypto'

describe('API Modules', () => {
	let mockClient: AmadeusClient

	beforeEach(() => {
		mockClient = {
			get: vi.fn(),
			post: vi.fn(),
			getConfig: vi.fn(() => ({ baseUrl: 'https://test.com', timeout: 30000, headers: {} })),
			setBaseUrl: vi.fn(),
			setHeaders: vi.fn(),
			cancel: vi.fn()
		} as unknown as AmadeusClient
	})

	describe('ChainAPI', () => {
		it('gets chain tip', async () => {
			const api = new ChainAPI(mockClient)
			const mockData = { entry: { height: 100, hash: 'test' } }
			vi.mocked(mockClient.get).mockResolvedValueOnce(mockData)

			const result = await api.getTip()

			expect(result).toEqual(mockData)
			expect(mockClient.get).toHaveBeenCalledWith('/api/chain/tip')
		})

		it('validates height parameter', async () => {
			const api = new ChainAPI(mockClient)

			await expect(api.getByHeight(-1)).rejects.toThrow()
			await expect(api.getByHeight(1.5)).rejects.toThrow()
		})

		it('validates hash parameter', async () => {
			const api = new ChainAPI(mockClient)

			await expect(api.getByHash('')).rejects.toThrow()
			await expect(api.getByHash('invalid!')).rejects.toThrow()
		})
	})

	describe('WalletAPI', () => {
		it('gets balance', async () => {
			const api = new WalletAPI(mockClient)
			const mockData = { balance: { float: 10.5, flat: 10500000000, symbol: 'AMA' } }
			const keypair = generateKeypair()
			vi.mocked(mockClient.get).mockResolvedValueOnce(mockData)

			const result = await api.getBalance(keypair.publicKey, 'AMA')

			expect(result).toEqual(mockData)
		})

		it('validates address', async () => {
			const api = new WalletAPI(mockClient)

			await expect(api.getBalance('')).rejects.toThrow(AmadeusSDKError)
			await expect(api.getBalance('invalid!')).rejects.toThrow(AmadeusSDKError)
		})
	})

	describe('TransactionAPI', () => {
		it('submits transaction', async () => {
			const api = new TransactionAPI(mockClient)
			const mockData = { error: 'ok', hash: 'test-hash' }
			const txPacked = new Uint8Array([1, 2, 3])
			vi.mocked(mockClient.post).mockResolvedValueOnce(mockData)

			const result = await api.submit(txPacked)

			expect(result).toEqual(mockData)
			expect(mockClient.post).toHaveBeenCalledWith('/api/tx/submit', txPacked)
		})

		it('validates transaction data', async () => {
			const api = new TransactionAPI(mockClient)

			await expect(api.submit(new Uint8Array([]))).rejects.toThrow(AmadeusSDKError)
			await expect(api.submit('')).rejects.toThrow(AmadeusSDKError)
		})
	})

	describe('ContractAPI', () => {
		it('validates bytecode', async () => {
			const api = new ContractAPI(mockClient)
			const mockData = { error: 'ok' }
			const bytecode = new Uint8Array([1, 2, 3])
			vi.mocked(mockClient.post).mockResolvedValueOnce(mockData)

			const result = await api.validateBytecode(bytecode)

			expect(result).toEqual(mockData)
		})

		it('validates bytecode input', async () => {
			const api = new ContractAPI(mockClient)

			await expect(api.validateBytecode(new Uint8Array([]))).rejects.toThrow(AmadeusSDKError)
		})
	})

	describe('EpochAPI', () => {
		it('gets epoch scores', async () => {
			const api = new EpochAPI(mockClient)
			const mockData = [{ pk: 'test', score: 100 }]
			vi.mocked(mockClient.get).mockResolvedValueOnce(mockData)

			const result = await api.getScore()

			expect(result).toEqual(mockData)
		})

		it('validates public key', async () => {
			const api = new EpochAPI(mockClient)

			await expect(api.getScore('invalid!')).rejects.toThrow()
		})
	})

	describe('PeerAPI', () => {
		it('gets nodes', async () => {
			const api = new PeerAPI(mockClient)
			const mockData = { nodes: [] }
			vi.mocked(mockClient.get).mockResolvedValueOnce(mockData)

			const result = await api.getNodes()

			expect(result).toEqual(mockData)
		})
	})

	describe('ProofAPI', () => {
		it('gets validator proof', async () => {
			const api = new ProofAPI(mockClient)
			const mockData = {
				validators: [
					{
						entry_hash: 'test-hash',
						mutations_hash: 'test-mutations',
						aggsig: 'test-sig',
						signers: ['signer1', 'signer2'],
						score: 0.95
					}
				]
			}
			const keypair = generateKeypair()
			vi.mocked(mockClient.get).mockResolvedValueOnce(mockData)

			const result = await api.getValidators(keypair.publicKey)

			expect(result).toEqual(mockData)
		})

		it('validates entry hash', async () => {
			const api = new ProofAPI(mockClient)

			await expect(api.getValidators('')).rejects.toThrow()
		})
	})
})
