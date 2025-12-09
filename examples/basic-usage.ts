/**
 * Basic Usage Examples
 *
 * This file demonstrates basic usage of the Amadeus SDK
 */

import {
	AmadeusSDK,
	TransactionBuilder,
	generateKeypair,
	toBase58,
	fromBase58,
	encode,
	decode
} from '../src/index'

async function basicExamples() {
	console.log('=== Amadeus SDK Basic Usage Examples ===\n')

	// ============================================================================
	// 1. Initialize SDK
	// ============================================================================
	console.log('1. Initializing SDK...')
	const sdk = new AmadeusSDK({
		baseUrl: 'https://nodes.amadeus.bot/api'
	})
	console.log('SDK Version:', AmadeusSDK.getVersion())
	console.log('SDK initialized!\n')

	// ============================================================================
	// 2. Generate Keypair
	// ============================================================================
	console.log('2. Generating keypair...')
	const keypair = generateKeypair()
	console.log('Public Key:', keypair.publicKey)
	console.log('Private Key:', keypair.privateKey.substring(0, 20) + '...')
	console.log('Keypair generated!\n')

	// ============================================================================
	// 3. Query Chain Information
	// ============================================================================
	console.log('3. Querying chain information...')
	try {
		const tip = await sdk.chain.getTip()
		console.log('Current Chain Height:', tip.entry.height)
		console.log('Latest Block Hash:', tip.entry.hash)

		const stats = await sdk.chain.getStats()
		console.log('Total Entries:', stats.stats.total_entries)
		console.log('Total Transactions:', stats.stats.total_transactions)
	} catch (error) {
		console.error('Error querying chain:', error)
	}
	console.log()

	// ============================================================================
	// 4. Query Wallet Balance
	// ============================================================================
	console.log('4. Querying wallet balance...')
	try {
		const balance = await sdk.wallet.getBalance(keypair.publicKey, 'AMA')
		console.log('AMA Balance:', balance.balance.float)
		console.log('Balance (atomic units):', balance.balance.flat)

		const allBalances = await sdk.wallet.getAllBalances(keypair.publicKey)
		console.log('All Token Balances:', Object.keys(allBalances.balances))
	} catch (error) {
		console.error('Error querying balance:', error)
	}
	console.log()

	// ============================================================================
	// 5. Build Transaction
	// ============================================================================
	console.log('5. Building transaction...')
	const recipient = generateKeypair().publicKey

	// Using TransactionBuilder instance
	const builder = new TransactionBuilder(keypair.privateKey)
	const { txHash, txPacked } = builder.transfer({
		recipient,
		amount: 0.000000001, // Minimum amount
		symbol: 'AMA'
	})

	console.log('Transaction Hash:', txHash)
	console.log('Transaction Packed Length:', txPacked.length, 'bytes')
	console.log('Transaction built!\n')

	// ============================================================================
	// 6. Serialization
	// ============================================================================
	console.log('6. Testing serialization...')
	const data = {
		foo: 'bar',
		count: 42,
		items: [1, 2, 3],
		bytes: new Uint8Array([1, 2, 3])
	}

	const encoded = encode(data)
	const decoded = decode(encoded)

	console.log('Original data:', data)
	console.log('Encoded length:', encoded.length, 'bytes')
	console.log('Decoded type:', decoded instanceof Map ? 'Map' : typeof decoded)
	console.log('Serialization works!\n')

	// ============================================================================
	// 7. Base58 Encoding
	// ============================================================================
	console.log('7. Testing Base58 encoding...')
	const bytes = new Uint8Array([1, 2, 3, 255])
	const base58 = toBase58(bytes)
	const decodedBytes = fromBase58(base58)

	console.log('Original bytes:', Array.from(bytes))
	console.log('Base58:', base58)
	console.log('Decoded bytes:', Array.from(decodedBytes))
	console.log(
		'Round-trip successful:',
		bytes.every((b, i) => b === decodedBytes[i])
	)
	console.log()

	console.log('=== Examples Complete ===')
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	basicExamples().catch(console.error)
}

export { basicExamples }
