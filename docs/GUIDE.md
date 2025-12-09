# Developer Guide

Comprehensive guide for using the Amadeus Protocol SDK.

## Table of Contents

- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

```bash
npm install @amadeus-protocol/sdk
```

### Basic Setup

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK({
	baseUrl: 'https://nodes.amadeus.bot/api'
})
```

## Core Concepts

### Keypairs

Amadeus Protocol uses BLS12-381 cryptography. Each account has a public/private keypair.

```typescript
import { generateKeypair } from '@amadeus-protocol/sdk'

// Generate a new keypair
const keypair = generateKeypair()
console.log('Public Key:', keypair.publicKey)
console.log('Private Key:', keypair.privateKey) // Keep this secret!
```

### Addresses

Public keys serve as addresses. They are Base58-encoded 48-byte BLS12-381 public keys.

```typescript
const address = keypair.publicKey
// Example: "5Kd3N..."
```

### Transactions

Transactions are the primary way to interact with the blockchain. They must be:

1. Built with proper structure
2. Signed with the sender's private key
3. Serialized (packed)
4. Submitted to a node

#### Building and Signing Transactions

**Option 1: Build and sign in one step (convenience)**

```typescript
import { TransactionBuilder } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder(senderPrivateKey)
const { txHash, txPacked } = builder.transfer({
	recipient: recipientAddress,
	amount: 1.5,
	symbol: 'AMA'
})

// Submit the transaction
const result = await sdk.transaction.submit(txPacked)
```

**Option 2: Build unsigned, then sign (more control)**

```typescript
import { TransactionBuilder, fromBase58, toAtomicAma } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder(senderPrivateKey)

// Build unsigned transaction
const unsignedTx = builder.buildTransfer({
	recipient: recipientAddress,
	amount: 1.5,
	symbol: 'AMA'
})

// Can inspect or modify unsignedTx.tx before signing
console.log('Nonce:', unsignedTx.tx.nonce)
console.log('Action:', unsignedTx.tx.action)

// Sign the transaction
const { txHash, txPacked } = builder.sign(unsignedTx)

// Submit the transaction
const result = await sdk.transaction.submit(txPacked)
```

**Option 3: Using static methods**

```typescript
import { TransactionBuilder } from '@amadeus-protocol/sdk'

// Build and sign in one step
const { txHash, txPacked } = TransactionBuilder.buildSignedTransfer({
	senderPrivkey: senderPrivateKey,
	recipient: recipientAddress,
	amount: 1.5,
	symbol: 'AMA'
})

// Or build unsigned, then sign
const { seed64 } = deriveSkAndSeed64FromBase58Seed(senderPrivateKey)
const signerPubKey = getPublicKey(seed64)

const unsignedTx = TransactionBuilder.buildTransfer(
	{ recipient: recipientAddress, amount: 1.5, symbol: 'AMA' },
	signerPubKey
)
const { txHash, txPacked } = TransactionBuilder.sign(unsignedTx, senderPrivateKey)
```

### Amounts

AMA tokens use 9 decimal places. Always use atomic units for transactions.

```typescript
import { toAtomicAma, fromAtomicAma } from '@amadeus-protocol/sdk'

// Convert to atomic units
const atomic = toAtomicAma(1.5) // 1500000000

// Convert from atomic units
const human = fromAtomicAma(1500000000) // 1.5
```

### Encrypting Wallet Data

The SDK provides secure password-based encryption for protecting sensitive wallet data like private keys.

```typescript
import { encryptWithPassword, decryptWithPassword } from '@amadeus-protocol/sdk'

// Encrypt private key before storage
const privateKey = '5Kd3N...' // Base58 encoded seed
const encrypted = await encryptWithPassword(privateKey, userPassword)

// Store encrypted.encryptedData, encrypted.iv, encrypted.salt securely

// Decrypt when needed
const decryptedKey = await decryptWithPassword(encrypted, userPassword)
```

**Security Notes:**

- Uses AES-GCM encryption with 256-bit keys
- PBKDF2 key derivation with 100,000 iterations
- Each encryption uses unique salt and IV
- Never store passwords in plain text

## Common Patterns

### Checking Balance

```typescript
// Check specific token balance
const balance = await sdk.wallet.getBalance(address, 'AMA')
console.log('Balance:', balance.balance.float, 'AMA')

// Check all token balances
const allBalances = await sdk.wallet.getAllBalances(address)
for (const [symbol, balance] of Object.entries(allBalances.balances)) {
	console.log(`${symbol}: ${balance.float}`)
}
```

### Building Custom Transactions

```typescript
import { TransactionBuilder, fromBase58, toAtomicAma } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder(privateKey)

// Option 1: Build and sign in one step
const { txHash, txPacked } = builder.buildAndSign('MyContract', 'myMethod', [
	fromBase58(recipientAddress),
	toAtomicAma(amount).toString(),
	'AMA'
])

// Option 2: Build unsigned, then sign (for inspection/modification)
const unsignedTx = builder.build('MyContract', 'myMethod', [
	fromBase58(recipientAddress),
	toAtomicAma(amount).toString(),
	'AMA'
])
// Can inspect unsignedTx before signing
const { txHash, txPacked } = builder.sign(unsignedTx)
```

### Waiting for Confirmation

```typescript
try {
	const result = await sdk.transaction.submitAndWait(txPacked)
	if (result.error === 'ok') {
		console.log('Transaction confirmed:', result.hash)
		console.log('Entry hash:', result.entry_hash)
	} else {
		console.error('Transaction error:', result.error)
	}
} catch (error) {
	console.error('Transaction failed or timed out:', error)
}
```

### Error Handling

```typescript
import { AmadeusSDKError } from '@amadeus-protocol/sdk'

try {
	const balance = await sdk.wallet.getBalance(address, 'AMA')
} catch (error) {
	if (error instanceof AmadeusSDKError) {
		if (error.status === 404) {
			console.log('Address not found')
		} else {
			console.error('API Error:', error.message)
		}
	} else {
		console.error('Unexpected error:', error)
	}
}
```

### Querying Chain Data

```typescript
// Get current chain tip
const tip = await sdk.chain.getTip()
console.log('Current Height:', tip.entry.height)

// Get chain statistics
const stats = await sdk.chain.getStats()
console.log('Total Transactions:', stats.stats.total_transactions)

// Get transaction events for an account
const events = await sdk.chain.getTransactionEventsByAccount(address, {
	limit: 10,
	sort: 'desc'
})
```

## Best Practices

### 1. Private Key Security

**Never:**

- Commit private keys to version control
- Log private keys
- Share private keys
- Store private keys in plain text

**Always:**

- Use environment variables for private keys
- Use secure key storage solutions
- Encrypt private keys at rest
- Use separate keys for development and production

```typescript
// Good: Use environment variables
const privateKey = process.env.PRIVATE_KEY
if (!privateKey) {
	throw new Error('PRIVATE_KEY not set')
}

// Bad: Hardcoded private key
const privateKey = '5Kd3N...' // DON'T DO THIS!
```

### 2. Error Handling

Always handle errors appropriately:

```typescript
try {
	const result = await sdk.transaction.submit(txPacked)
	if (result.error === 'ok') {
		console.log('Success:', result.hash)
	} else {
		console.error('Transaction error:', result.error)
	}
} catch (error) {
	if (error instanceof AmadeusSDKError) {
		// Handle SDK-specific errors
		console.error('SDK Error:', error.message)
	} else {
		// Handle unexpected errors
		console.error('Unexpected error:', error)
	}
}
```

### 3. Transaction Nonces

The SDK automatically generates nonces using timestamps. For high-frequency transactions, ensure sufficient time between transactions to avoid nonce collisions.

### 4. Amount Precision

Always use `toAtomicAma` when building transactions to ensure proper precision:

```typescript
// Good
const amount = toAtomicAma(1.5)

// Bad - may lose precision
const amount = 1.5 * 1000000000
```

### 5. Request Timeouts

Set appropriate timeouts for your use case:

```typescript
const sdk = new AmadeusSDK({
	baseUrl: 'https://nodes.amadeus.bot/api',
	timeout: 60000 // 60 seconds
})
```

### 6. Retry Logic

Implement retry logic for network requests:

```typescript
async function submitWithRetry(txPacked: Uint8Array, maxRetries = 3) {
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await sdk.transaction.submit(txPacked)
		} catch (error) {
			if (i === maxRetries - 1) throw error
			await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
		}
	}
}
```

## Troubleshooting

### Common Issues

#### "Invalid Base58 string"

**Cause:** Invalid Base58 encoding in address or key.

**Solution:** Ensure addresses and keys are valid Base58 strings.

```typescript
import { fromBase58 } from '@amadeus-protocol/sdk'

try {
	const bytes = fromBase58(address)
} catch (error) {
	console.error('Invalid Base58:', error)
}
```

#### "Transaction failed: insufficient balance"

**Cause:** Account doesn't have enough balance for the transaction.

**Solution:** Check balance before submitting:

```typescript
const balance = await sdk.wallet.getBalance(address, 'AMA')
if (balance.balance.float < amount + fee) {
	throw new Error('Insufficient balance')
}
```

#### "Request timeout"

**Cause:** Network issues or node is slow.

**Solution:** Increase timeout or retry:

```typescript
const sdk = new AmadeusSDK({
	timeout: 60000 // Increase timeout
})
```

#### "Invalid transaction structure"

**Cause:** Transaction wasn't properly built or serialized.

**Solution:** Always use `TransactionBuilder`:

```typescript
const builder = new TransactionBuilder(privateKey)

// Option 1: Build and sign in one step
const { txPacked } = builder.transfer({ recipient, amount, symbol })

// Option 2: Build unsigned, inspect, then sign
const unsignedTx = builder.buildTransfer({ recipient, amount, symbol })
// Inspect unsignedTx if needed
const { txPacked } = builder.sign(unsignedTx)

// Use txPacked directly, don't modify it
```

### Debugging

Enable verbose logging:

```typescript
// Log all API requests
const originalGet = sdk.client.get.bind(sdk.client)
sdk.client.get = async (...args) => {
	console.log('GET:', args)
	return originalGet(...args)
}
```

### Getting Help

- Check the [API Reference](./API.md)
- Review [Examples](../examples/)
- Open an issue on GitHub
