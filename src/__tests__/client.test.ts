import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AmadeusClient } from '../client'
import { AmadeusSDKError } from '../types'
import { NODE_API_URL } from '../constants'

global.fetch = vi.fn()

describe('AmadeusClient', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Initialization', () => {
		it('creates client with default URL', () => {
			const client = new AmadeusClient({ baseUrl: NODE_API_URL })

			expect(client).toBeInstanceOf(AmadeusClient)
		})

		it('creates client with custom URL', () => {
			const client = new AmadeusClient({ baseUrl: 'https://custom-node.com/api' })

			expect(client.getConfig().baseUrl).toBe('https://custom-node.com/api')
		})

		it('throws on invalid URL', () => {
			expect(() => {
				new AmadeusClient({ baseUrl: 'not-a-url' })
			}).toThrow(AmadeusSDKError)
		})

		it('normalizes trailing slashes', () => {
			const client = new AmadeusClient({ baseUrl: 'https://example.com/api/' })

			expect(client.getConfig().baseUrl).toBe('https://example.com/api')
		})

		it('uses default timeout', () => {
			const client = new AmadeusClient({ baseUrl: NODE_API_URL })

			expect(client.getConfig().timeout).toBe(30000)
		})

		it('uses custom timeout', () => {
			const client = new AmadeusClient({ baseUrl: NODE_API_URL, timeout: 60000 })

			expect(client.getConfig().timeout).toBe(60000)
		})
	})

	describe('GET Requests', () => {
		it('makes GET request successfully', async () => {
			const mockResponse = {
				ok: true,
				json: async () => ({ error: 'ok', data: { test: 'value' } }),
				headers: new Headers({ 'content-type': 'application/json' })
			}
			vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

			const client = new AmadeusClient({ baseUrl: 'https://example.com' })
			const result = await client.get('/api/test')

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/test'),
				expect.objectContaining({ method: 'GET' })
			)
			expect(result).toEqual({ data: { test: 'value' } })
		})

		it('handles query parameters', async () => {
			const mockResponse = {
				ok: true,
				json: async () => ({ error: 'ok', data: {} }),
				headers: new Headers({ 'content-type': 'application/json' })
			}
			vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

			const client = new AmadeusClient({ baseUrl: 'https://example.com' })
			await client.get('/api/test', { limit: 10, offset: 0 })

			const callUrl = vi.mocked(fetch).mock.calls[0][0] as string
			expect(callUrl).toContain('limit=10')
			expect(callUrl).toContain('offset=0')
		})

		it('throws on invalid endpoint', async () => {
			const client = new AmadeusClient({ baseUrl: 'https://example.com' })

			await expect(client.get('')).rejects.toThrow(AmadeusSDKError)
		})
	})

	describe('POST Requests', () => {
		it('makes POST request with Uint8Array', async () => {
			const mockResponse = {
				ok: true,
				json: async () => ({ error: 'ok', result: 'success' }),
				headers: new Headers({ 'content-type': 'application/json' })
			}
			vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

			const client = new AmadeusClient({ baseUrl: 'https://example.com' })
			const data = new Uint8Array([1, 2, 3])
			const result = await client.post('/api/test', data)

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/test'),
				expect.objectContaining({
					method: 'POST',
					body: data
				})
			)
			expect(result).toEqual({ result: 'success' })
		})

		it('makes POST request with JSON', async () => {
			const mockResponse = {
				ok: true,
				json: async () => ({ error: 'ok', result: 'success' }),
				headers: new Headers({ 'content-type': 'application/json' })
			}
			vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

			const client = new AmadeusClient({ baseUrl: 'https://example.com' })
			const result = await client.post('/api/test', { key: 'value' })

			expect(fetch).toHaveBeenCalled()
			expect(result).toEqual({ result: 'success' })
		})
	})

	describe('Error Handling', () => {
		it('handles API errors', async () => {
			const mockResponse = {
				ok: true,
				json: async () => ({ error: 'not_found' }),
				headers: new Headers({ 'content-type': 'application/json' })
			}
			vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

			const client = new AmadeusClient({ baseUrl: 'https://example.com' })

			await expect(client.get('/api/test')).rejects.toThrow(AmadeusSDKError)
		})

		it('handles HTTP errors', async () => {
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
				json: async () => ({ error: 'not_found' }),
				headers: new Headers({ 'content-type': 'application/json' })
			}
			vi.mocked(fetch).mockResolvedValueOnce(mockResponse as Response)

			const client = new AmadeusClient({ baseUrl: 'https://example.com' })

			await expect(client.get('/api/test')).rejects.toThrow(AmadeusSDKError)
		})

		it('handles network errors', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

			const client = new AmadeusClient({ baseUrl: 'https://example.com' })

			await expect(client.get('/api/test')).rejects.toThrow(AmadeusSDKError)
		})

		it('handles timeout', async () => {
			vi.mocked(fetch).mockImplementation((url, options) => {
				return new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						resolve({
							ok: true,
							json: async () => ({}),
							text: async () => ''
						} as Response)
					}, 200)

					// Handle abort signal
					if (options?.signal) {
						options.signal.addEventListener('abort', () => {
							clearTimeout(timeout)
							const abortError = new Error('The operation was aborted.')
							abortError.name = 'AbortError'
							reject(abortError)
						})
					}
				})
			})

			const client = new AmadeusClient({ baseUrl: 'https://example.com', timeout: 50 })

			await expect(client.get('/api/test')).rejects.toThrow(AmadeusSDKError)
			await expect(client.get('/api/test')).rejects.toThrow(/timeout/i)
		}, 5000)
	})

	describe('Configuration', () => {
		it('updates base URL', () => {
			const client = new AmadeusClient({ baseUrl: 'https://example.com' })
			client.setBaseUrl('https://new-url.com')

			expect(client.getConfig().baseUrl).toBe('https://new-url.com')
		})

		it('throws on invalid URL update', () => {
			const client = new AmadeusClient({ baseUrl: 'https://example.com' })

			expect(() => client.setBaseUrl('invalid')).toThrow(AmadeusSDKError)
		})

		it('updates headers', () => {
			const client = new AmadeusClient({ baseUrl: 'https://example.com' })
			client.setHeaders({ 'X-Custom': 'value' })

			const config = client.getConfig()
			expect(config.headers?.['X-Custom']).toBe('value')
		})

		it('cancels requests', () => {
			const client = new AmadeusClient({ baseUrl: 'https://example.com' })

			expect(() => client.cancel()).not.toThrow()
		})
	})
})
