import { describe, it, expect } from 'vitest'
import { AmadeusSDK } from '../sdk'
import { SDK_VERSION } from '../constants'

describe('AmadeusSDK', () => {
	it('creates SDK instance with default config', () => {
		const sdk = new AmadeusSDK()

		expect(sdk).toBeInstanceOf(AmadeusSDK)
		expect(sdk.client).toBeDefined()
		expect(sdk.chain).toBeDefined()
		expect(sdk.wallet).toBeDefined()
		expect(sdk.transaction).toBeDefined()
	})

	it('creates SDK instance with custom config', () => {
		const sdk = new AmadeusSDK({
			baseUrl: 'https://custom-node.com/api',
			timeout: 60000
		})

		const config = sdk.getConfig()
		expect(config.baseUrl).toBe('https://custom-node.com/api')
		expect(config.timeout).toBe(60000)
	})

	it('gets SDK version', () => {
		const version = AmadeusSDK.getVersion()

		expect(version).toBe(SDK_VERSION)
	})

	it('updates base URL', () => {
		const sdk = new AmadeusSDK()
		sdk.setBaseUrl('https://new-url.com')

		expect(sdk.getConfig().baseUrl).toBe('https://new-url.com')
	})

	it('updates headers', () => {
		const sdk = new AmadeusSDK()
		sdk.setHeaders({ 'X-Custom': 'value' })

		const config = sdk.getConfig()
		expect(config.headers?.['X-Custom']).toBe('value')
	})

	it('cancels requests', () => {
		const sdk = new AmadeusSDK()

		expect(() => sdk.cancel()).not.toThrow()
	})

	it('has all API modules', () => {
		const sdk = new AmadeusSDK()

		expect(sdk.chain).toBeDefined()
		expect(sdk.peer).toBeDefined()
		expect(sdk.transaction).toBeDefined()
		expect(sdk.wallet).toBeDefined()
		expect(sdk.contract).toBeDefined()
		expect(sdk.epoch).toBeDefined()
		expect(sdk.proof).toBeDefined()
	})
})
