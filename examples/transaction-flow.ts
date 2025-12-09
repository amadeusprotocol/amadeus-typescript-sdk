/**
 * Complete Transaction Flow Example
 *
 * Demonstrates the complete flow of creating and submitting a transaction
 */

import { AmadeusSDK, TransactionBuilder, generateKeypair, toAtomicAma } from '../src/index'

async function transactionFlowExample() {
	console.log('=== Complete Transaction Flow Example ===\n')

	// Step 1: Initialize SDK
	console.log('Step 1: Initializing SDK...')
	const sdk = new AmadeusSDK({
		baseUrl: 'https://nodes.amadeus.bot/api'
	})
	console.log('✓ SDK initialized\n')

	// Step 2: Generate or use existing keypair
	console.log('Step 2: Generating keypair...')
	const senderKeypair = generateKeypair()
	const recipientKeypair = generateKeypair()

	console.log('Sender Public Key:', senderKeypair.publicKey)
	console.log('Recipient Public Key:', recipientKeypair.publicKey)
	console.log('✓ Keypairs generated\n')

	// Step 3: Check sender balance
	console.log('Step 3: Checking sender balance...')
	try {
		const balance = await sdk.wallet.getBalance(senderKeypair.publicKey, 'AMA')
		console.log('Current Balance:', balance.balance.float, 'AMA')
		console.log('Balance (atomic):', balance.balance.flat)
		console.log('✓ Balance checked\n')
	} catch (error) {
		console.error('Error checking balance:', error)
		return
	}

	// Step 4: Build transaction
	console.log('Step 4: Building transaction...')
	const transferAmount = 0.000000001 // Minimum transfer amount

	const builder = new TransactionBuilder(senderKeypair.privateKey)
	const { txHash, txPacked } = builder.transfer({
		recipient: recipientKeypair.publicKey,
		amount: transferAmount,
		symbol: 'AMA'
	})

	console.log('Transaction Hash:', txHash)
	console.log('Amount (human-readable):', transferAmount, 'AMA')
	console.log('Amount (atomic units):', toAtomicAma(transferAmount))
	console.log('Packed Transaction Size:', txPacked.length, 'bytes')
	console.log('✓ Transaction built\n')

	// Step 5: Verify transaction structure
	console.log('Step 5: Verifying transaction structure...')
	console.log('Transaction hash length:', txHash.length)
	console.log('Packed transaction is Uint8Array:', txPacked instanceof Uint8Array)
	console.log('✓ Transaction structure verified\n')

	// Step 6: Submit transaction
	console.log('Step 6: Submitting transaction...')
	try {
		const result = await sdk.transaction.submit(txPacked)

		if (result.hash) {
			console.log('✓ Transaction submitted successfully!')
			console.log('Transaction Hash:', result.hash)
		} else {
			console.log('Transaction submission result:', result)
		}
	} catch (error) {
		console.error('Error submitting transaction:', error)
		console.log('Note: This is expected if the account has no balance')
	}
	console.log()

	// Step 7: Query transaction status
	console.log('Step 7: Querying transaction status...')
	try {
		const tx = await sdk.transaction.get(txHash)
		console.log('Transaction found:', tx)
	} catch (error) {
		console.error('Error querying transaction status:', error)
	}
	console.log()

	// Step 8: Submit transaction and wait for confirmation (preferred method) - Will fail if no balance
	// console.log('Step 8: Submitting and waiting for confirmation...')
	// try {
	// 	const result = await sdk.transaction.submitAndWait(txPacked)
	// 	console.log('Transaction confirmed:', result)
	// } catch (error) {
	// 	console.error('Error (expected if no balance):', error)
	// }
	console.log('\n=== Transaction Flow Complete ===')
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	transactionFlowExample().catch(console.error)
}

export { transactionFlowExample }
