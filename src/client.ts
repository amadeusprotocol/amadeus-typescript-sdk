/**
 * HTTP Client
 *
 * Lightweight HTTP client using native fetch API (no axios dependency)
 * Provides request/response handling, timeout management, and error handling.
 */

import type { AmadeusSDKConfig, ApiResponse } from './types'
import { AmadeusSDKError } from './types'
import { NODE_API_URL, DEFAULT_TIMEOUT, SDK_VERSION } from './constants'
import { NonEmptyStringSchema } from './schemas'
import { validate } from './validation'

/**
 * Validates a URL string
 */
function isValidUrl(url: string): boolean {
	try {
		const parsed = new URL(url)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:'
	} catch {
		return false
	}
}

export class AmadeusClient {
	private config: Required<AmadeusSDKConfig>
	private inFlight = new Set<AbortController>()

	/**
	 * Create a new AmadeusClient instance
	 *
	 * @param config - SDK configuration
	 * @throws {AmadeusSDKError} If baseUrl is invalid
	 */
	constructor(config: AmadeusSDKConfig) {
		const baseUrl = config.baseUrl || NODE_API_URL

		if (!isValidUrl(baseUrl)) {
			throw new AmadeusSDKError(
				`Invalid baseUrl: ${baseUrl}. Must be a valid HTTP/HTTPS URL.`
			)
		}

		// Ensure baseUrl doesn't end with a slash
		const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')

		this.config = {
			baseUrl: normalizedBaseUrl,
			timeout: config.timeout && config.timeout > 0 ? config.timeout : DEFAULT_TIMEOUT,
			headers: {
				'Content-Type': 'application/octet-stream',
				'X-Client-Type': `@amadeus-protocol/sdk/${SDK_VERSION}`,
				...config.headers
			}
		}
	}

	/**
	 * Make a GET request
	 *
	 * @param endpoint - API endpoint path
	 * @param params - Optional query parameters
	 * @returns Promise resolving to the response data
	 */
	async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
		validate(NonEmptyStringSchema, endpoint)

		const url = this.buildUrl(endpoint, params)
		return this.request(url, { method: 'GET' }, (response) =>
			this.handleResponse(response)
		) as Promise<T>
	}

	/**
	 * Make a POST request
	 *
	 * @param endpoint - API endpoint path
	 * @param data - Request body data (Uint8Array for binary, object for JSON)
	 * @returns Promise resolving to the response data
	 */
	async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
		validate(NonEmptyStringSchema, endpoint)

		const url = this.buildUrl(endpoint)
		const { body, contentType } = this.prepareBody(data)

		return this.request(
			url,
			{
				method: 'POST',
				body,
				headers: {
					'Content-Type': contentType
				}
			},
			(response) => this.handleResponse(response)
		) as Promise<T>
	}

	/**
	 * Make a POST request that returns raw bytes.
	 *
	 * Some node endpoints (notably `/api/contract/get_prefix`) answer with a
	 * VecPack binary body, not JSON. `post()` would run it through `text()` and
	 * mangle it, so binary reads go through here instead.
	 *
	 * @param endpoint - API endpoint path
	 * @param data - Request body data (Uint8Array for binary, object for JSON)
	 * @returns Promise resolving to the raw response body
	 * @throws {AmadeusSDKError} On a non-2xx response
	 */
	async postBinary(endpoint: string, data?: unknown): Promise<Uint8Array> {
		validate(NonEmptyStringSchema, endpoint)

		const url = this.buildUrl(endpoint)
		const { body, contentType } = this.prepareBody(data)

		return this.request(
			url,
			{
				method: 'POST',
				body,
				headers: {
					'Content-Type': contentType
				}
			},
			async (response) => {
				if (!response.ok) {
					// handleResponse throws for !ok; the throw below guards against that ever changing.
					await this.handleResponse(response)
					throw new AmadeusSDKError(`HTTP ${response.status}`, response.status)
				}
				return new Uint8Array(await response.arrayBuffer())
			}
		)
	}

	/**
	 * Build full URL with query parameters
	 */
	private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
		const url = new URL(endpoint, this.config.baseUrl)

		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined && value !== null) {
					url.searchParams.append(key, String(value))
				}
			}
		}

		return url.toString()
	}

	/**
	 * Prepare request body and determine Content-Type
	 */
	private prepareBody(data?: unknown): { body: BodyInit | undefined; contentType: string } {
		if (!data) {
			return { body: undefined, contentType: 'application/octet-stream' }
		}

		// If it's already a Uint8Array or ArrayBuffer, send as binary
		if (data instanceof Uint8Array) {
			return { body: data as BodyInit, contentType: 'application/octet-stream' }
		}
		if (data instanceof ArrayBuffer) {
			return { body: data as BodyInit, contentType: 'application/octet-stream' }
		}

		// If it's a Buffer (Node.js), convert to Uint8Array
		if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
			return {
				body: new Uint8Array(data) as BodyInit,
				contentType: 'application/octet-stream'
			}
		}

		// For objects, try to send as binary if it has txPacked or tx_packed
		if (typeof data === 'object' && data !== null) {
			const obj = data as Record<string, unknown>
			if ('txPacked' in obj && obj.txPacked instanceof Uint8Array) {
				return { body: obj.txPacked as BodyInit, contentType: 'application/octet-stream' }
			}
			if ('tx_packed' in obj && obj.tx_packed instanceof Uint8Array) {
				return { body: obj.tx_packed as BodyInit, contentType: 'application/octet-stream' }
			}
		}

		// Default: send as JSON
		return { body: JSON.stringify(data), contentType: 'application/json' }
	}

	/**
	 * Make an HTTP request and read its body; `cancel()` aborts it until the body is read
	 */
	private async request<T>(
		url: string,
		options: RequestInit,
		read: (response: Response) => Promise<T>
	): Promise<T> {
		// One controller per request: concurrent calls on a shared client must not abort each other.
		const controller = new AbortController()
		this.inFlight.add(controller)
		try {
			return await read(await this.send(url, options, controller))
		} finally {
			this.inFlight.delete(controller)
		}
	}

	/**
	 * Send an HTTP request, timing out if headers do not arrive in time
	 */
	private async send(
		url: string,
		options: RequestInit,
		controller: AbortController
	): Promise<Response> {
		const abortState = { timedOut: false }
		const timeoutId = setTimeout(() => {
			abortState.timedOut = true
			controller.abort()
		}, this.config.timeout)

		try {
			return await fetch(url, {
				...options,
				headers: {
					...this.config.headers,
					...options.headers
				},
				signal: controller.signal
			})
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError' || error.name === 'TimeoutError') {
					throw abortState.timedOut
						? new AmadeusSDKError(`Request timeout after ${this.config.timeout}ms`, 408)
						: new AmadeusSDKError('Request cancelled', 0)
				}
				throw new AmadeusSDKError(
					`Request failed: ${error.message}`,
					0,
					error instanceof Error
						? { message: error.message, name: error.name }
						: { error: String(error) }
				)
			}
			throw new AmadeusSDKError(`Request failed: ${String(error)}`, 0, {
				error: String(error)
			})
		} finally {
			clearTimeout(timeoutId)
		}
	}

	/**
	 * Handle API response and parse errors
	 */
	private async handleResponse(response: Response): Promise<unknown> {
		if (!response.ok) {
			let errorData: unknown
			const contentType = response.headers.get('content-type')

			try {
				if (contentType?.includes('application/json')) {
					errorData = await response.json()
				} else {
					const text = await response.text()
					// If it's HTML, try to extract a meaningful error message
					if (contentType?.includes('text/html')) {
						// Try to extract title or error message from HTML
						const titleMatch = text.match(/<title>([^<]+)<\/title>/i)
						const h1Match = text.match(/<h1[^>]*>([^<]+)<\/h1>/i)
						errorData =
							titleMatch?.[1] || h1Match?.[1] || `HTTP ${response.status} Error`
					} else {
						errorData = text
					}
				}
			} catch (parseError) {
				errorData = `Failed to parse error response: ${
					parseError instanceof Error ? parseError.message : String(parseError)
				}`
			}

			const message =
				typeof errorData === 'object' && errorData !== null && 'error' in errorData
					? String((errorData as { error: unknown }).error)
					: typeof errorData === 'string'
						? errorData.length > 500
							? `${errorData.substring(0, 500)}... (truncated)`
							: errorData
						: response.statusText || 'Unknown error'

			throw new AmadeusSDKError(
				`HTTP ${response.status}: ${message}`,
				response.status,
				errorData as Record<string, unknown>
			)
		}

		const contentType = response.headers.get('content-type')
		let data: unknown

		try {
			if (contentType?.includes('application/json')) {
				data = await response.json()
			} else {
				// Try JSON first, fallback to text
				const text = await response.text()
				try {
					data = JSON.parse(text)
				} catch {
					data = text
				}
			}
		} catch (parseError) {
			throw new AmadeusSDKError(
				`Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				response.status
			)
		}

		// Handle API response format
		if (typeof data === 'object' && data !== null && 'error' in data) {
			const apiResponse = data as ApiResponse
			if (apiResponse.error === 'ok') {
				// Remove error property from response (intentionally unused)
				const { error: _error, ...rest } = apiResponse
				return rest
			} else if (apiResponse.error === 'not_found') {
				throw new AmadeusSDKError(
					'Resource not found',
					404,
					apiResponse as Record<string, unknown>
				)
			} else {
				throw new AmadeusSDKError(
					apiResponse.error || 'Unknown API error',
					400,
					apiResponse as Record<string, unknown>
				)
			}
		}

		return data
	}

	/**
	 * Get current configuration
	 */
	getConfig(): AmadeusSDKConfig {
		return { ...this.config }
	}

	/**
	 * Update base URL
	 *
	 * @param url - New base URL
	 * @throws {AmadeusSDKError} If URL is invalid
	 */
	setBaseUrl(url: string): void {
		if (!isValidUrl(url)) {
			throw new AmadeusSDKError(`Invalid baseUrl: ${url}. Must be a valid HTTP/HTTPS URL.`)
		}
		this.config.baseUrl = url.replace(/\/+$/, '')
	}

	/**
	 * Update headers
	 */
	setHeaders(headers: Record<string, string>): void {
		this.config.headers = { ...this.config.headers, ...headers }
	}

	/**
	 * Cancel every in-flight request on this client
	 */
	cancel(): void {
		for (const controller of this.inFlight) controller.abort()
		this.inFlight.clear()
	}
}
