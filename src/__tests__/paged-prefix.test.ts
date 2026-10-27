import { afterEach, describe, expect, it, vi } from 'vitest'

import { ContractAPI } from '../api/contract'
import { AmadeusClient } from '../client'
import { NODE_API_URL } from '../constants'
import { prefixPagePath, readAllPrefixPages } from '../contract-state'
import {
	buildOwnerVaultsKeyPrefix,
	parseLockupVaultEntries,
	summarizeLockupVaults
} from '../contracts/lockup-vault'
import { fromBase58 } from '../encoding'
import { AmadeusSDK } from '../sdk'
import { decodeContractState, decodeContractStatePage, encode } from '../serialization'
import { AmadeusSDKError } from '../types'
import type { SerializableValue } from '../types'

const LEONARDO = '75GWnWZGbSCU6QtpUjZ4QuKcz3j4tgF4fDzzTzJJ64UoWp3VL74jM1nQHofPhFuuYC'

// Raw mainnet get_prefix bodies (paged node, Oct 2026): owner-scoped vault reads.
const LEONARDO_VAULTS_HEX = [
	'070102050104726f77730701040501033133390502011107010c0501047479706505010331326d050106616d',
	'6f756e740305e8d4a510000501076163637275656403050345513b7a050108726174655f627073030207d005',
	'010976616c696461746f72050130b233d627cf97dc434abeb0655c2d2fc1dda47873e6dbeded3c6332c2d5f2',
	'15e41b26177fe68c928f757044d7e976451605010c6d61747572655f65706f6368030205ac05010d63726561',
	'7465645f65706f63680302033d05010e7061796f75745f616464726573730005010f756e6c6f636b5f61745f',
	'65706f63680005011176616c696461746f725f70656e64696e6700050112756e6c6f636b5f73746172745f65',
	'706f63680005011776616c696461746f725f70656e64696e675f65706f636800050103313430050201110701',
	'0c05010474797065050102366d050106616d6f756e74030601d1a94a20000501076163637275656403050309',
	'6218ed050108726174655f627073030203e805010976616c696461746f72050130b233d627cf97dc434abeb0',
	'655c2d2fc1dda47873e6dbeded3c6332c2d5f215e41b26177fe68c928f757044d7e976451605010c6d617475',
	'72655f65706f63680302047805010d637265617465645f65706f63680302034005010e7061796f75745f6164',
	'64726573730005010f756e6c6f636b5f61745f65706f63680005011176616c696461746f725f70656e64696e',
	'6700050112756e6c6f636b5f73746172745f65706f63680005011776616c696461746f725f70656e64696e67',
	'5f65706f6368000501033134310502011107010c05010474797065050102336d050106616d6f756e74030603',
	'a35294400005010761636372756564030502cf460ecc050108726174655f627073030201f405010976616c69',
	'6461746f72050130b233d627cf97dc434abeb0655c2d2fc1dda47873e6dbeded3c6332c2d5f215e41b26177f',
	'e68c928f757044d7e976451605010c6d61747572655f65706f6368030203df05010d637265617465645f6570',
	'6f63680302034305010e7061796f75745f616464726573730005010f756e6c6f636b5f61745f65706f636800',
	'05011176616c696461746f725f70656e64696e6700050112756e6c6f636b5f73746172745f65706f63680005',
	'011776616c696461746f725f70656e64696e675f65706f6368000501033134320502011207010c0501047479',
	'706505010331326d050106616d6f756e74030609184e72a000050107616363727565640305128726a4050501',
	'08726174655f627073030207d005010976616c696461746f72050130b233d627cf97dc434abeb0655c2d2fc1',
	'dda47873e6dbeded3c6332c2d5f215e41b26177fe68c928f757044d7e976451605010c6d61747572655f6570',
	'6f6368030205c105010d637265617465645f65706f63680302035205010e7061796f75745f61646472657373',
	'0005010f756e6c6f636b5f61745f65706f63680005011176616c696461746f725f70656e64696e6700050112',
	'756e6c6f636b5f73746172745f65706f63680005011776616c696461746f725f70656e64696e675f65706f63',
	'6800050106637572736f7200'
].join('')
const EMPTY_ACCOUNT_HEX = '070102050104726f77730600050106637572736f7200'

const fromHex = (hex: string) =>
	Uint8Array.from(hex.match(/../g) ?? [], (byte) => parseInt(byte, 16))
const enc = (text: string) => new TextEncoder().encode(text)
const dec = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

function pageBody(rows: Array<[string, string]>, cursor: string | null): Uint8Array {
	const rowTerm: SerializableValue =
		rows.length === 0 ? [] : new Map(rows.map(([key, value]) => [enc(key), enc(value)]))
	return encode(
		new Map<SerializableValue, SerializableValue>([
			[enc('rows'), rowTerm],
			[enc('cursor'), cursor === null ? null : enc(cursor)]
		])
	)
}

function binaryResponse(body: Uint8Array) {
	return {
		ok: true,
		status: 200,
		headers: new Headers({ 'content-type': 'application/octet-stream' }),
		arrayBuffer: async () =>
			body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
	}
}

describe('decodeContractStatePage', () => {
	it('decodes the affected account’s paged mainnet answer', () => {
		const page = decodeContractStatePage(fromHex(LEONARDO_VAULTS_HEX))
		expect(page.cursor).toBeNull()
		expect(page.entries.map(([key]) => dec(key))).toEqual(['139', '140', '141', '142'])
	})

	it('parses the account’s four vaults with non-zero totals', () => {
		const entries = decodeContractState(fromHex(LEONARDO_VAULTS_HEX))
		const vaults = parseLockupVaultEntries(entries, { currentEpoch: 880 }, LEONARDO)
		expect(vaults.map((vault) => vault.index)).toEqual([139, 140, 141, 142])
		for (const vault of vaults) expect(vault.totalFlat > 0n).toBe(true)

		const summary = summarizeLockupVaults(vaults)
		expect(summary.vaultCount).toBe(4)
		expect(summary.totalStakedFlat > 0n).toBe(true)
	})

	it('reads an account with no vaults (rows = []) as no entries', () => {
		expect(decodeContractStatePage(fromHex(EMPTY_ACCOUNT_HEX))).toEqual({
			entries: [],
			cursor: null
		})
		expect(decodeContractState(fromHex(EMPTY_ACCOUNT_HEX))).toEqual([])
	})

	it('returns the cursor of a page that has more after it', () => {
		const page = decodeContractStatePage(pageBody([['1', 'a']], '4vJ9'))
		expect(page.cursor).toBe('4vJ9')
		expect(page.entries).toEqual([[enc('1'), enc('a')]])
	})

	it('still reads the pre-paging bare map and empty list', () => {
		const legacy = encode(new Map([[enc('7'), enc('vault')]]))
		expect(decodeContractStatePage(legacy)).toEqual({
			entries: [[enc('7'), enc('vault')]],
			cursor: null
		})
		expect(decodeContractStatePage(encode([]))).toEqual({ entries: [], cursor: null })
		expect(decodeContractStatePage(new Uint8Array(0))).toEqual({ entries: [], cursor: null })
	})

	it('throws on shapes it does not recognise', () => {
		const envelope = (rows: SerializableValue, cursor: SerializableValue) =>
			encode(
				new Map<SerializableValue, SerializableValue>([
					[enc('rows'), rows],
					[enc('cursor'), cursor]
				])
			)
		expect(() => decodeContractStatePage(encode([1n]))).toThrow(/Expected MAP type/)
		expect(() => decodeContractStatePage(encode(enc('x')))).toThrow(/Expected MAP type/)
		expect(() => decodeContractStatePage(envelope([1n], null))).toThrow(/page rows/)
		expect(() => decodeContractStatePage(envelope(enc('rows'), null))).toThrow(/page rows/)
		expect(() => decodeContractStatePage(envelope(new Map([[enc('1'), 2n]]), null))).toThrow(
			'Expected Uint8Array'
		)
		expect(() => decodeContractStatePage(envelope([], 5n))).toThrow(/page cursor/)
		expect(() => decodeContractStatePage(envelope([], enc('')))).toThrow(/page cursor/)
	})
})

describe('readAllPrefixPages', () => {
	it('follows the cursor and concatenates every page in order', async () => {
		const pages = new Map<string | null, Uint8Array>([
			[
				null,
				pageBody(
					[
						['1', 'a'],
						['2', 'b']
					],
					'c2'
				)
			],
			['c2', pageBody([['3', 'c']], 'c3')],
			['c3', pageBody([['4', 'd']], null)]
		])
		const fetchPage = vi.fn(async (cursor: string | null) => pages.get(cursor) as Uint8Array)

		const entries = await readAllPrefixPages(fetchPage)

		expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([null, 'c2', 'c3'])
		expect(entries.map(([key, value]) => `${dec(key)}=${dec(value)}`)).toEqual([
			'1=a',
			'2=b',
			'3=c',
			'4=d'
		])
	})

	it('reads a single empty page as no entries', async () => {
		expect(await readAllPrefixPages(async () => fromHex(EMPTY_ACCOUNT_HEX))).toEqual([])
	})

	it('throws instead of truncating past maxPages', async () => {
		const fetchPage = vi.fn(async (cursor: string | null) =>
			pageBody([[cursor ?? '0', 'x']], `${Number(cursor ?? 0) + 1}`)
		)
		await expect(readAllPrefixPages(fetchPage, { maxPages: 3 })).rejects.toThrow(
			/more than 3 pages/
		)
		expect(fetchPage).toHaveBeenCalledTimes(3)
	})

	it('throws on a repeated cursor instead of looping', async () => {
		const fetchPage = vi.fn(async () => pageBody([['1', 'a']], 'same'))
		await expect(readAllPrefixPages(fetchPage)).rejects.toThrow(/repeated cursor/)
		expect(fetchPage).toHaveBeenCalledTimes(2)
	})

	it('reports a page that does not decode as an AmadeusSDKError', async () => {
		const reading = readAllPrefixPages(async () => encode([1n]))
		await expect(reading).rejects.toThrow(AmadeusSDKError)
		await expect(reading).rejects.toThrow(/Expected MAP type/)
	})

	it('reads a legacy single page too large to spread into push()', async () => {
		const rowCount = 200_000
		const legacy = encode(
			new Map(Array.from({ length: rowCount }, (_, index) => [enc(String(index)), enc('v')]))
		)
		expect((await readAllPrefixPages(async () => legacy)).length).toBe(rowCount)
	})

	it('rejects a non-positive maxPages', async () => {
		await expect(readAllPrefixPages(async () => encode([]), { maxPages: 0 })).rejects.toThrow(
			/maxPages/
		)
	})
})

describe('prefixPagePath', () => {
	it('adds the cursor only after the first page', () => {
		expect(prefixPagePath(null)).toBe('/contract/get_prefix')
		expect(prefixPagePath('4vJ9', '/api/contract/get_prefix')).toBe(
			'/api/contract/get_prefix?cursor=4vJ9'
		)
		expect(prefixPagePath('a/b')).toBe('/contract/get_prefix?cursor=a%2Fb')
	})
})

describe('ContractAPI.getPrefixEntries paging', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('posts the prefix to every page and follows ?cursor=', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(binaryResponse(pageBody([['1', 'a']], 'NextKey')))
			.mockResolvedValueOnce(binaryResponse(pageBody([['2', 'b']], null)))
		vi.stubGlobal('fetch', fetchMock)
		const prefix = enc('bic:lockup_vault:vault:')

		const entries = await new ContractAPI(
			new AmadeusClient({ baseUrl: NODE_API_URL })
		).getPrefixEntries(prefix)

		expect(entries.map(([key]) => dec(key))).toEqual(['1', '2'])
		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			`${NODE_API_URL}/contract/get_prefix`,
			`${NODE_API_URL}/contract/get_prefix?cursor=NextKey`
		])
		for (const [, init] of fetchMock.mock.calls) {
			expect(init.method).toBe('POST')
			expect(init.body).toEqual(prefix)
		}
	})

	it('gives sdk.staking.getPosition the affected account’s four vaults', async () => {
		const fetchMock = vi.fn().mockResolvedValue(binaryResponse(fromHex(LEONARDO_VAULTS_HEX)))
		vi.stubGlobal('fetch', fetchMock)

		const position = await new AmadeusSDK().staking.getPosition(LEONARDO, {
			currentEpoch: 880
		})

		expect(position.vaultCount).toBe(4)
		expect(position.vaults.map((vault) => vault.index)).toEqual([139, 140, 141, 142])
		expect(position.totalStakedFlat > 0n).toBe(true)
		expect(fetchMock.mock.calls[0][1].body).toEqual(
			buildOwnerVaultsKeyPrefix(fromBase58(LEONARDO))
		)
	})

	it('gives an account with no vaults an empty position', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(binaryResponse(fromHex(EMPTY_ACCOUNT_HEX)))
		)

		const position = await new AmadeusSDK().staking.getPosition(LEONARDO, {
			currentEpoch: 880
		})

		expect(position.vaultCount).toBe(0)
		expect(position.totalStakedFlat).toBe(0n)
	})
})
