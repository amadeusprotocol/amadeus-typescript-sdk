import { afterEach, describe, expect, it, vi } from 'vitest'
import * as sdk from '../index'
import {
	type AddressActivity,
	ACTIVITY_PROBE_TIMEOUT_MS,
	addressHasActivity,
	resolveMnemonicImport
} from '../import-derivation'
import { mnemonicToCandidateKeypairs } from '../mnemonic'

const MNEMONIC =
	'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const [STANDARD, LEGACY] = mnemonicToCandidateKeypairs(MNEMONIC)
const API_BASE_URL = 'https://node.test/api'
const ADDRESS = STANDARD.publicKey

const realFetch = global.fetch

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	})
}

function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
	const mock = vi.fn((input: unknown, init?: RequestInit) => handler(String(input), init))
	global.fetch = mock as unknown as typeof fetch
	return mock
}

function hangUntilAborted(signals: AbortSignal[]) {
	return (_url: string, init?: RequestInit) =>
		new Promise<Response>((_resolve, reject) => {
			const signal = init?.signal as AbortSignal
			signals.push(signal)
			signal.addEventListener('abort', () =>
				reject(new DOMException('Aborted', 'AbortError'))
			)
		})
}

afterEach(() => {
	global.fetch = realFetch
	vi.useRealTimers()
})

describe('addressHasActivity', () => {
	it('is exported from the package entry point with an 8s default timeout', () => {
		expect(sdk.addressHasActivity).toBe(addressHasActivity)
		expect(sdk.resolveMnemonicImport).toBe(resolveMnemonicImport)
		expect(ACTIVITY_PROBE_TIMEOUT_MS).toBe(8_000)
	})

	it('queries balance_all and tx_by_filter on arg0 and signer under the API base URL', async () => {
		const fetchMock = stubFetch(async () =>
			jsonResponse({ error: 'ok', balances: [], cursor: null, txs: [] })
		)
		await addressHasActivity(`${API_BASE_URL}/`, ADDRESS)
		const urls = fetchMock.mock.calls.map(([url]) => String(url)).sort()
		expect(urls).toEqual(
			[
				`${API_BASE_URL}/chain/tx_by_filter?arg0=${ADDRESS}&limit=1`,
				`${API_BASE_URL}/chain/tx_by_filter?signer=${ADDRESS}&limit=1`,
				`${API_BASE_URL}/wallet/balance_all/${ADDRESS}`
			].sort()
		)
	})

	it('keeps a path prefix in the API base URL', async () => {
		const fetchMock = stubFetch(async () =>
			jsonResponse({ error: 'ok', balances: [], cursor: null, txs: [] })
		)
		const prefixedBaseUrl = 'https://node.test/rpc/api'
		await addressHasActivity(prefixedBaseUrl, ADDRESS)
		const urls = fetchMock.mock.calls.map(([url]) => String(url)).sort()
		expect(urls).toEqual(
			[
				`${prefixedBaseUrl}/chain/tx_by_filter?arg0=${ADDRESS}&limit=1`,
				`${prefixedBaseUrl}/chain/tx_by_filter?signer=${ADDRESS}&limit=1`,
				`${prefixedBaseUrl}/wallet/balance_all/${ADDRESS}`
			].sort()
		)
	})

	it('is active when the account currently holds a balance (incl. PRIME)', async () => {
		stubFetch(async (url) =>
			url.includes('/balance_all/')
				? jsonResponse({ error: 'ok', balances: [{ symbol: 'PRIME', float: 1 }] })
				: jsonResponse({ cursor: null, txs: [] })
		)
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('active')
	})

	it('falls back to tx history for a funded-then-emptied account', async () => {
		stubFetch(async (url) =>
			url.includes('/balance_all/')
				? jsonResponse({ error: 'ok', balances: [] })
				: url.includes('arg0=')
					? jsonResponse({ txs: [{ hash: 'tx' }] })
					: jsonResponse({ txs: [] })
		)
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('active')
	})

	it('is inactive only when every request answered with an empty list', async () => {
		stubFetch(async () => jsonResponse({ error: 'ok', balances: [], cursor: null, txs: [] }))
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('inactive')
	})

	it('still reports history found by another request when one gets an HTTP error', async () => {
		stubFetch(async (url) =>
			url.includes('/balance_all/')
				? jsonResponse({}, 500)
				: jsonResponse({ txs: [{ hash: 'tx' }] })
		)
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('active')
	})

	it('still reports history found by another request when one hits a network error', async () => {
		stubFetch(async (url) => {
			if (url.includes('/balance_all/')) throw new TypeError('fetch failed')
			return jsonResponse({ txs: url.includes('arg0=') ? [{ hash: 'tx' }] : [] })
		})
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('active')
	})

	it('is unknown (not inactive) on an HTTP error when nothing showed history', async () => {
		stubFetch(async (url) =>
			url.includes('signer=')
				? jsonResponse({}, 429)
				: jsonResponse({ balances: [], txs: [] })
		)
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('unknown')
	})

	it('is unknown when the network is down', async () => {
		stubFetch(async () => {
			throw new TypeError('fetch failed')
		})
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('unknown')
	})

	it('is unknown when the node answers 200 with an error payload', async () => {
		stubFetch(async (url) =>
			url.includes('/balance_all/')
				? jsonResponse({ error: 'rate_limited' })
				: jsonResponse({ txs: [] })
		)
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('unknown')
	})

	it('is unknown when the node answers 200 without the expected list', async () => {
		stubFetch(async (url) =>
			url.includes('/balance_all/')
				? jsonResponse({ error: 'ok' })
				: jsonResponse({ txs: [] })
		)
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('unknown')

		stubFetch(async (url) =>
			url.includes('signer=')
				? new Response('<html>busy</html>', { status: 200 })
				: jsonResponse({ balances: [], txs: [] })
		)
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('unknown')
	})

	it('is unknown for an invalid base URL instead of throwing', async () => {
		const fetchMock = stubFetch(async () => jsonResponse({ balances: [], txs: [] }))
		expect(await addressHasActivity('not-a-url', ADDRESS)).toBe('unknown')
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('runs the three requests in parallel without one cancelling another', async () => {
		const signals: AbortSignal[] = []
		stubFetch(async (_url, init) => {
			signals.push(init?.signal as AbortSignal)
			await new Promise((resolve) => setTimeout(resolve, 5))
			if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
			return jsonResponse({ balances: [], txs: [] })
		})
		expect(await addressHasActivity(API_BASE_URL, ADDRESS)).toBe('inactive')
		expect(signals).toHaveLength(3)
		expect(signals.some((signal) => signal.aborted)).toBe(false)
	})

	it('aborts hung requests after the timeout and reports unknown', async () => {
		vi.useFakeTimers()
		const signals: AbortSignal[] = []
		stubFetch(hangUntilAborted(signals))

		const pending = addressHasActivity(API_BASE_URL, ADDRESS, 1_000)
		await vi.advanceTimersByTimeAsync(1_000)

		expect(await pending).toBe('unknown')
		expect(signals).toHaveLength(3)
		expect(signals.every((signal) => signal.aborted)).toBe(true)
	})

	it('reports history from a fast request even when another one times out', async () => {
		vi.useFakeTimers()
		const signals: AbortSignal[] = []
		const hang = hangUntilAborted(signals)
		stubFetch(async (url, init) =>
			url.includes('arg0=') ? jsonResponse({ txs: [{ hash: 'tx' }] }) : hang(url, init)
		)

		const pending = addressHasActivity(API_BASE_URL, ADDRESS, 1_000)
		await vi.advanceTimersByTimeAsync(1_000)

		expect(await pending).toBe('active')
	})

	it('times out and aborts a response whose body never finishes', async () => {
		vi.useFakeTimers()
		const signals: AbortSignal[] = []
		stubFetch(async (_url, init) => {
			const signal = init?.signal as AbortSignal
			signals.push(signal)
			return {
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: () =>
					new Promise((_resolve, reject) =>
						signal.addEventListener('abort', () =>
							reject(new DOMException('Aborted', 'AbortError'))
						)
					)
			} as unknown as Response
		})

		const pending = addressHasActivity(API_BASE_URL, ADDRESS, 1_000)
		await vi.advanceTimersByTimeAsync(1_000)

		expect(await pending).toBe('unknown')
		expect(signals).toHaveLength(3)
		expect(signals.every((signal) => signal.aborted)).toBe(true)
	})
})

describe('resolveMnemonicImport', () => {
	const activityByKey =
		(statuses: Record<string, AddressActivity>) =>
		async (address: string): Promise<AddressActivity> =>
			statuses[address] ?? 'inactive'

	it('probes each candidate address, standard first', async () => {
		const probe = vi.fn(async (): Promise<AddressActivity> => 'inactive')
		await resolveMnemonicImport(MNEMONIC, probe)
		expect(probe.mock.calls.map(([address]) => address)).toEqual([
			STANDARD.publicKey,
			LEGACY.publicKey
		])
	})

	it('opens the standard account when only it has history', async () => {
		const result = await resolveMnemonicImport(
			MNEMONIC,
			activityByKey({ [STANDARD.publicKey]: 'active' })
		)
		expect(result.reason).toBe('single-active')
		expect(result.needsChoice).toBe(false)
		expect(result.chosen?.derivation).toBe('eip2333')
		expect(result.chosen?.seed).toBe(STANDARD.seed)
	})

	it('rescues the legacy account when only it has history, still listing standard', async () => {
		const result = await resolveMnemonicImport(
			MNEMONIC,
			activityByKey({ [LEGACY.publicKey]: 'active' })
		)
		expect(result.reason).toBe('single-active')
		expect(result.needsChoice).toBe(false)
		expect(result.chosen?.derivation).toBe('legacy')
		expect(result.chosen?.publicKey).toBe(LEGACY.publicKey)
		expect(result.chosen?.seed).toBe(LEGACY.seed)
		expect(result.candidates.map((candidate) => candidate.publicKey)).toEqual([
			STANDARD.publicKey,
			LEGACY.publicKey
		])
	})

	it('asks the user when both have history, without picking for them', async () => {
		const result = await resolveMnemonicImport(MNEMONIC, async () => 'active')
		expect(result.reason).toBe('both-active')
		expect(result.needsChoice).toBe(true)
		expect(result.chosen).toBeNull()
		expect(result.candidates.map((candidate) => candidate.activity)).toEqual([
			'active',
			'active'
		])
	})

	it('defaults to the standard account when neither has history, still listing both', async () => {
		const result = await resolveMnemonicImport(MNEMONIC, async () => 'inactive')
		expect(result.reason).toBe('none-active')
		expect(result.needsChoice).toBe(false)
		expect(result.chosen?.seed).toBe(STANDARD.seed)
		expect(result.candidates.map((candidate) => candidate.publicKey)).toEqual([
			STANDARD.publicKey,
			LEGACY.publicKey
		])
	})

	it('does not default to standard when a probe could not complete', async () => {
		const result = await resolveMnemonicImport(
			MNEMONIC,
			activityByKey({ [LEGACY.publicKey]: 'unknown' })
		)
		expect(result.reason).toBe('check-failed')
		expect(result.needsChoice).toBe(true)
		expect(result.chosen).toBeNull()
	})

	it('asks the user when one account is active but the other could not be checked', async () => {
		const result = await resolveMnemonicImport(
			MNEMONIC,
			activityByKey({ [STANDARD.publicKey]: 'unknown', [LEGACY.publicKey]: 'active' })
		)
		expect(result.reason).toBe('check-failed')
		expect(result.needsChoice).toBe(true)
		expect(result.chosen).toBeNull()
	})

	it('treats a probe that throws as unknown', async () => {
		const result = await resolveMnemonicImport(MNEMONIC, async () => {
			throw new Error('boom')
		})
		expect(result.reason).toBe('check-failed')
		expect(result.candidates.every((candidate) => candidate.activity === 'unknown')).toBe(true)
	})

	it('resolves end to end with addressHasActivity', async () => {
		stubFetch(async (url) =>
			url.includes(`/balance_all/${LEGACY.publicKey}`)
				? jsonResponse({ error: 'ok', balances: [{ symbol: 'AMA', float: 2 }] })
				: jsonResponse({ error: 'ok', balances: [], cursor: null, txs: [] })
		)
		const result = await resolveMnemonicImport(MNEMONIC, (address) =>
			addressHasActivity(API_BASE_URL, address)
		)
		expect(result.reason).toBe('single-active')
		expect(result.chosen?.derivation).toBe('legacy')
	})
})
