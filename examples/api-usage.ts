/**
 * API Usage Examples
 *
 * Demonstrates various API endpoints and usage patterns
 */

import { AmadeusSDK } from '../src/index'

async function apiUsageExamples() {
	console.log('=== API Usage Examples ===\n')

	const sdk = new AmadeusSDK({
		baseUrl: 'https://nodes.amadeus.bot/api'
	})

	// ============================================================================
	// Chain API Examples
	// ============================================================================
	console.log('=== Chain API ===')

	try {
		// Get chain tip
		const tip = await sdk.chain.getTip()
		console.log('Current Height:', tip.entry.height)
		console.log('Latest Hash:', tip.entry.hash)

		// Get chain stats
		const stats = await sdk.chain.getStats()
		console.log('Total Entries:', stats.stats.total_entries)
		console.log('Total Transactions:', stats.stats.total_transactions)

		// Get entry by height
		if (tip.entry.height > 0) {
			const entry = await sdk.chain.getByHeight(tip.entry.height - 1)
			console.log('Previous Entry:', entry.entries.length > 0 ? 'Found' : 'Not found')
		}

		// Get transaction events for an account (using a real address from the chain)
		// Note: Replace with an actual address that has transactions
		if (tip.entry.height > 0) {
			try {
				const testAddress = tip.entry.hash // Use a real hash from the chain
				const events = await sdk.chain.getTransactionEventsByAccount(testAddress, {
					limit: 10,
					sort: 'desc'
				})
				console.log('Transaction Events:', events.txs.length)
			} catch {
				console.log('Note: Skipping transaction events (address may have no transactions)')
			}
		}
	} catch (error) {
		console.error('Chain API Error:', error)
	}

	console.log()

	// ============================================================================
	// Wallet API Examples
	// ============================================================================
	console.log('=== Wallet API ===')

	try {
		// Note: Replace with an actual address to check balance
		// For demo purposes, we'll skip this if no valid address is provided
		console.log('Note: Skipping wallet balance check (requires a valid address)')
		console.log('To test: Replace testAddress with a real Base58 address')
	} catch (error) {
		console.error('Wallet API Error:', error)
	}

	console.log()

	// ============================================================================
	// Contract API Examples
	// ============================================================================
	console.log('=== Contract API ===')

	try {
		// Get contract richlist
		const richlist = await sdk.contract.getRichlist()
		console.log('Richlist Entries:', richlist.richlist.length)

		// Get contract data (example)
		const key = new Uint8Array([1, 2, 3])
		const contractData = await sdk.contract.get(key)
		console.log('Contract Data Retrieved:', contractData ? 'Yes' : 'No')
	} catch (error) {
		console.error('Contract API Error:', error)
	}

	console.log()

	// ============================================================================
	// Epoch API Examples
	// ============================================================================
	console.log('=== Epoch API ===')

	try {
		// Get all epoch scores
		const scores = await sdk.epoch.getAllScores()
		console.log('Total Validators:', scores.length)

		// Get top validators
		const topValidators = await sdk.epoch.getTopValidators(5)
		console.log('Top 5 Validators:', topValidators.length)
	} catch (error) {
		console.error('Epoch API Error:', error)
	}

	console.log()

	// ============================================================================
	// Peer API Examples
	// ============================================================================
	console.log('=== Peer API ===')

	try {
		// Get all nodes
		const nodes = await sdk.peer.getNodes()
		console.log('Total Nodes:', nodes.nodes.length)

		// Get trainers
		const trainers = await sdk.peer.getTrainers()
		console.log('Total Trainers:', trainers.trainers.length)

		// Get ANR entries
		const anrs = await sdk.peer.getANRs()
		console.log('ANR Entries:', anrs.anrs.length)
	} catch (error) {
		console.error('Peer API Error:', error)
	}

	console.log('\n=== API Examples Complete ===')
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	apiUsageExamples().catch(console.error)
}

export { apiUsageExamples }
