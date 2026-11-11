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
import { AmadeusSDKError, TransactionEventType } from '../types'
import { generateKeypair } from '../crypto'
import { fromBase58, toBase58 } from '../encoding'
import { decode } from '../serialization'

const textOf = (bytes: unknown): string => new TextDecoder().decode(bytes as Uint8Array)

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
		it('sends the Base58 account events cursor as cursor_b58', async () => {
			const api = new ChainAPI(mockClient)
			const account = generateKeypair().publicKey
			vi.mocked(mockClient.get).mockResolvedValue({ cursor: null, txs: [] })

			await api.getTransactionEventsByAccount(account, {
				type: TransactionEventType.SENT,
				cursor: 'PAzKk2'
			})
			await api.getTransactionEventsByAccount(account, { cursor_b58: 'PAzKk3' })

			expect(mockClient.get).toHaveBeenNthCalledWith(
				1,
				`/api/chain/tx_events_by_account/${account}`,
				{
					type: 'sent',
					cursor_b58: 'PAzKk2'
				}
			)
			expect(mockClient.get).toHaveBeenNthCalledWith(
				2,
				`/api/chain/tx_events_by_account/${account}`,
				{
					cursor_b58: 'PAzKk3'
				}
			)
		})

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
		it('validateBytecode throws a deprecation error without calling the missing route', async () => {
			const api = new ContractAPI(mockClient)

			await expect(api.validateBytecode(new Uint8Array([1, 2, 3]))).rejects.toThrow(
				/validateBytecode is deprecated/
			)
			expect(mockClient.post).not.toHaveBeenCalled()
		})

		it('view sends a Base58 contract address as its 48 raw bytes', async () => {
			const api = new ContractAPI(mockClient)
			const contractPk = generateKeypair().publicKey
			vi.mocked(mockClient.post).mockResolvedValueOnce({
				success: true,
				result: '7',
				logs: []
			})

			await api.view({ contract: contractPk, function: 'get', args: ['k'] })

			const [path, body] = vi.mocked(mockClient.post).mock.calls[0]
			expect(path).toBe('/api/contract/view')
			const sent = decode(body as Uint8Array) as Map<Uint8Array, unknown>
			const contract = [...sent].find(([key]) => textOf(key) === 'contract')?.[1]
			expect(contract).toEqual(fromBase58(contractPk))
			expect((contract as Uint8Array).length).toBe(48)
		})

		it('view passes raw contract bytes and built-in names through unchanged', async () => {
			const api = new ContractAPI(mockClient)
			const contractBytes = fromBase58(generateKeypair().publicKey)
			vi.mocked(mockClient.post).mockResolvedValue({ success: false, result: '', logs: [] })

			await api.view({ contract: contractBytes, function: 'get' })
			await api.view({ contract: 'LockupPrime', function: 'lock' })

			const contracts = vi.mocked(mockClient.post).mock.calls.map(([, body]) => {
				const sent = decode(body as Uint8Array) as Map<Uint8Array, unknown>
				return [...sent].find(([key]) => textOf(key) === 'contract')?.[1]
			})
			expect(contracts[0]).toEqual(contractBytes)
			expect(textOf(contracts[1] as Uint8Array)).toBe('LockupPrime')
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
		it('returns a null anr for an unknown public key', async () => {
			const api = new PeerAPI(mockClient)
			vi.mocked(mockClient.get).mockResolvedValueOnce({ anr: null })

			const { anr } = await api.getANRByPk(generateKeypair().publicKey)

			expect(anr).toBeNull()
		})

		it('gets nodes', async () => {
			const api = new PeerAPI(mockClient)
			const mockData = { nodes: [] }
			vi.mocked(mockClient.get).mockResolvedValueOnce(mockData)

			const result = await api.getNodes()

			expect(result).toEqual(mockData)
		})
	})

	describe('ProofAPI', () => {
		it('getValidators throws a deprecation error without calling the missing route', async () => {
			const api = new ProofAPI(mockClient)

			await expect(api.getValidators(generateKeypair().publicKey)).rejects.toThrow(
				/getValidators is deprecated/
			)
			expect(mockClient.get).not.toHaveBeenCalled()
		})

		it('gets a validator record proof by height', async () => {
			const api = new ProofAPI(mockClient)
			const mockData = {
				entry_height: 99,
				entry_hash: 'hash',
				key: 'key',
				value: 'value',
				proof: { root: 'root', siblings: ['sibling'], terminus: 'empty' }
			}
			vi.mocked(mockClient.get).mockResolvedValueOnce(mockData)

			expect(await api.getValidatorRecord(100)).toEqual(mockData)
			expect(mockClient.get).toHaveBeenCalledWith('/api/proof/validator_record/100')
			await expect(api.getValidatorRecord(-1)).rejects.toThrow()
		})

		it('gets a block proof, optionally at a given MMR height', async () => {
			const api = new ProofAPI(mockClient)
			vi.mocked(mockClient.get).mockResolvedValue({ height: 100 })

			await api.getBlockProof(100)
			await api.getBlockProof(100, { atHeight: 200 })

			expect(mockClient.get).toHaveBeenNthCalledWith(1, '/api/proof/block/100', {
				at_height: undefined
			})
			expect(mockClient.get).toHaveBeenNthCalledWith(2, '/api/proof/block/100', {
				at_height: 200
			})
			await expect(api.getBlockProof(1.5)).rejects.toThrow()
		})

		it('gets a contract state proof by Base58-encoding the key', async () => {
			const api = new ProofAPI(mockClient)
			const key = new TextEncoder().encode('bic:epoch:segment_vr_hash')
			vi.mocked(mockClient.get).mockResolvedValueOnce({ proofs: [] })

			await api.getContractStateProof(key)

			expect(mockClient.get).toHaveBeenCalledWith(`/api/proof/contractstate/${toBase58(key)}`)
		})

		it('getContractStateProof with a value throws a deprecation error', async () => {
			const api = new ProofAPI(mockClient)

			await expect(api.getContractStateProof('key', 'value')).rejects.toThrow(/deprecated/)
			expect(mockClient.get).not.toHaveBeenCalled()
		})

		it('getContractStateProof with an undefined value still fetches the proof', async () => {
			const api = new ProofAPI(mockClient)
			const maybeValue: Uint8Array | undefined = undefined
			vi.mocked(mockClient.get).mockResolvedValueOnce({ proofs: [] })

			await api.getContractStateProof('key', maybeValue)

			expect(mockClient.get).toHaveBeenCalledWith('/api/proof/contractstate/key')
		})

		it('validates entry hash', async () => {
			const api = new ProofAPI(mockClient)

			await expect(api.getValidators('')).rejects.toThrow()
		})
	})
})
