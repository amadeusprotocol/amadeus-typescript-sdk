import { afterEach, describe, expect, it, vi } from 'vitest'
import { MetricsAPI, ChainAPI } from '../api'
import { AmadeusClient } from '../client'

afterEach(() => vi.unstubAllGlobals())

describe('Public metrics', () => {
	it('uses the separate analytics origin and preserves missing coverage', async () => {
		const data = { status: 'incomplete', days: [{ transactions: null, new_addresses: null }] }
		const fetcher = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(data), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		)
		vi.stubGlobal('fetch', fetcher)
		const metrics = new MetricsAPI({ baseUrl: 'https://metrics.example.org' })
		expect(await metrics.getDaily('2026-01-01', '2026-01-02')).toEqual(data)
		const url = new URL(fetcher.mock.calls[0][0])
		expect(url.origin).toBe('https://metrics.example.org')
		expect(url.pathname).toBe('/v1/metrics/daily')
		expect(url.searchParams.get('end')).toBe('2026-01-02')
	})

	it('rejects invalid calendar dates, unbounded ranges and reversed ranges before fetching', async () => {
		const fetcher = vi.fn()
		vi.stubGlobal('fetch', fetcher)
		const metrics = new MetricsAPI({ baseUrl: 'https://metrics.example.org' })
		for (const [start, end] of [
			['2026-02-30', '2026-03-03'],
			['2026-01-01', '2026-04-01'],
			['2026-01-02', '2026-01-01']
		]) {
			await expect(metrics.getDaily(start, end)).rejects.toThrow()
		}
		expect(fetcher).not.toHaveBeenCalled()
	})

	it('reads node evidence and rejects imprecise heights', async () => {
		const get = vi.fn().mockResolvedValue({ error: 'history_pruned' })
		const chain = new ChainAPI({ get } as unknown as AmadeusClient)
		expect(await chain.getMetricsBlock(42)).toEqual({ error: 'history_pruned' })
		expect(get).toHaveBeenCalledWith('/api/chain/metrics/block/42')
		await expect(chain.getMetricsBlock(Number.MAX_SAFE_INTEGER + 1)).rejects.toThrow()
	})
})
