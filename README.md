# @amadeus-protocol/sdk

Official TypeScript/JavaScript SDK for Amadeus Protocol - Core utilities for serialization, cryptography, transaction building, and API client.

[![npm version](https://img.shields.io/npm/v/@amadeus-protocol/sdk)](https://www.npmjs.com/package/@amadeus-protocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@amadeus-protocol/sdk)](https://bundlephobia.com/package/@amadeus-protocol/sdk)

## Installation

```bash
npm install @amadeus-protocol/sdk
# or
yarn add @amadeus-protocol/sdk
# or
pnpm add @amadeus-protocol/sdk
# or
bun add @amadeus-protocol/sdk
```

## Features

- **Canonical Serialization (VecPack)**: Deterministic encoding/decoding for cryptographic operations
- **Cryptographic Operations**: BLS12-381 key generation, signing, and verification
- **Password-Based Encryption**: Secure AES-GCM encryption with PBKDF2 key derivation for wallet data
- **Transaction Building**: Create and sign Amadeus protocol transactions
- **Token Conversions**: Convert between atomic units and human-readable amounts
- **Encoding Utilities**: Base58 and Base64 encoding/decoding for addresses, keys, and binary data
- **API Client**: Full-featured HTTP client for interacting with Amadeus nodes
- **Type Safety**: Complete TypeScript definitions for all APIs
- **Zero Dependencies**: Uses native fetch (no axios or other HTTP libraries)

## Quick Start

### Using the SDK

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

// Initialize SDK (uses default node URL if not specified)
const sdk = new AmadeusSDK({
	baseUrl: 'https://nodes.amadeus.bot/api'
})

// Query chain
const tip = await sdk.chain.getTip()
console.log('Current height:', tip.entry.height)

// Query wallet balance
const balance = await sdk.wallet.getBalance('5Kd3N...', 'AMA')
console.log('Balance:', balance.balance.float)

// Submit transaction
const result = await sdk.transaction.submit(txPacked)
```

## Usage

### API Client

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK({
	baseUrl: 'https://nodes.amadeus.bot/api',
	timeout: 30000 // Optional: custom timeout
})

// Chain API
const stats = await sdk.chain.getStats()
const tip = await sdk.chain.getTip()
const entry = await sdk.chain.getByHash('5Kd3N...')

// Wallet API
const balance = await sdk.wallet.getBalance('5Kd3N...', 'AMA')
const allBalances = await sdk.wallet.getAllBalances('5Kd3N...')

// Transaction API
const result = await sdk.transaction.submit(txPacked)
const resultWithWait = await sdk.transaction.submitAndWait(txPacked)
const tx = await sdk.transaction.get('5Kd3N...')

// Contract API
const contractData = await sdk.contract.get(key)
const richlist = await sdk.contract.getRichlist()

// Epoch API
const scores = await sdk.epoch.getScore()
const emission = await sdk.epoch.getEmissionAddress('5Kd3N...')

// Peer API
const nodes = await sdk.peer.getNodes()
const trainers = await sdk.peer.getTrainers()
```

### Key Generation

```typescript
import { generateKeypair, derivePublicKeyFromSeedBase58 } from '@amadeus-protocol/sdk'

// Generate a new keypair
const keypair = generateKeypair()
console.log(keypair.publicKey) // Base58 public key
console.log(keypair.privateKey) // Base58 private key (seed)

// Derive public key from existing seed
const publicKey = derivePublicKeyFromSeedBase58(keypair.privateKey)
```

### Transaction Building

#### Using TransactionBuilder Class (Recommended)

```typescript
import { TransactionBuilder, fromBase58, toAtomicAma } from '@amadeus-protocol/sdk'

// Instance-based usage (convenient for multiple transactions)
const builder = new TransactionBuilder('5Kd3N...') // Base58 encoded seed

// Option 1: Build and sign in one step (convenience)
const { txHash, txPacked } = builder.transfer({
	recipient: '5Kd3N...', // Base58 encoded recipient address
	amount: 10.5, // Amount in human-readable format
	symbol: 'AMA' // Token symbol
})

// Option 2: Build unsigned, then sign (more control)
const unsignedTx = builder.buildTransfer({
	recipient: '5Kd3N...',
	amount: 10.5,
	symbol: 'AMA'
})
// Can inspect or modify unsignedTx before signing
const { txHash, txPacked } = builder.sign(unsignedTx)

// Option 3: Build custom transaction and sign
const unsignedTx = builder.build('Coin', 'transfer', [
	fromBase58('5Kd3N...'), // Recipient bytes
	toAtomicAma(10.5).toString(), // Amount in atomic units
	'AMA'
])
const { txHash, txPacked } = builder.sign(unsignedTx)

// Option 4: Build and sign custom transaction (convenience)
const { txHash, txPacked } = builder.buildAndSign('Coin', 'transfer', [
	fromBase58('5Kd3N...'),
	toAtomicAma(10.5).toString(),
	'AMA'
])
```

#### Using Static Methods

```typescript
import {
	TransactionBuilder,
	fromBase58,
	toAtomicAma,
	getPublicKey,
	deriveSkAndSeed64FromBase58Seed
} from '@amadeus-protocol/sdk'

// Option 1: Build and sign transfer in one step (convenience)
const { txHash, txPacked } = TransactionBuilder.buildSignedTransfer({
	senderPrivkey: '5Kd3N...', // Base58 encoded seed
	recipient: '5Kd3N...', // Base58 encoded recipient address
	amount: 10.5, // Amount in human-readable format
	symbol: 'AMA' // Token symbol
})

// Option 2: Build unsigned transfer, then sign
const { seed64 } = deriveSkAndSeed64FromBase58Seed('5Kd3N...')
const signerPubKey = getPublicKey(seed64)

const unsignedTx = TransactionBuilder.buildTransfer(
	{ recipient: '5Kd3N...', amount: 10.5, symbol: 'AMA' },
	signerPubKey
)
const { txHash, txPacked } = TransactionBuilder.sign(unsignedTx, '5Kd3N...')

// Option 3: Build custom unsigned transaction, then sign
const unsignedTx = TransactionBuilder.build(
	signerPubKey,
	'Coin', // Contract name
	'transfer', // Method name
	[fromBase58('5Kd3N...'), toAtomicAma(10.5).toString(), 'AMA']
)
const { txHash, txPacked } = TransactionBuilder.sign(unsignedTx, '5Kd3N...')

// Option 4: Build and sign custom transaction (convenience)
const { seed64, sk } = deriveSkAndSeed64FromBase58Seed('5Kd3N...')
const signerPubKey = getPublicKey(seed64)

const { txHash, txPacked } = TransactionBuilder.buildAndSign(signerPubKey, sk, 'Coin', 'transfer', [
	fromBase58('5Kd3N...'),
	toAtomicAma(10.5).toString(),
	'AMA'
])
```

### Serialization

```typescript
import { encode, decode } from '@amadeus-protocol/sdk'

// Encode data to canonical format
const data = {
	foo: 'bar',
	count: 42,
	items: [1, 2, 3]
}
const encoded = encode(data)

// Decode data from canonical format
const decoded = decode(encoded)
```

### Token Conversions

```typescript
import { toAtomicAma, fromAtomicAma } from '@amadeus-protocol/sdk'

// Convert to atomic units
const atomic = toAtomicAma(1.5) // Returns 1500000000

// Convert from atomic units
const ama = fromAtomicAma(1500000000) // Returns 1.5
```

### Signing Transactions

```typescript
import { TransactionBuilder } from '@amadeus-protocol/sdk'

// Using TransactionBuilder instance
const builder = new TransactionBuilder('5Kd3N...')

// Build unsigned transaction
const unsignedTx = builder.build('Coin', 'transfer', args)

// Sign the transaction
const { txHash, txPacked } = builder.sign(unsignedTx)

// Or build and sign in one step
const { txHash, txPacked } = builder.buildAndSign('Coin', 'transfer', args)
```

### Encoding Utilities

```typescript
import { toBase58, fromBase58, uint8ArrayToBase64, base64ToUint8Array } from '@amadeus-protocol/sdk'

// Base58 encoding
const encoded = toBase58(new Uint8Array([1, 2, 3]))
const decoded = fromBase58('5Kd3N...')

// Base64 encoding
const base64 = uint8ArrayToBase64(new Uint8Array([1, 2, 3]))
const bytes = base64ToUint8Array(base64)
```

### Password-Based Encryption

```typescript
import { encryptWithPassword, decryptWithPassword } from '@amadeus-protocol/sdk'

// Encrypt sensitive data (e.g., private keys)
const encrypted = await encryptWithPassword('sensitive wallet data', 'my-password')
// Returns: { encryptedData, iv, salt } (all Base64 encoded)

// Decrypt the data
const decrypted = await decryptWithPassword(encrypted, 'my-password')
// Returns: 'sensitive wallet data'
```

## API Reference

### Constants

- `AMADEUS_PUBLIC_KEY_BYTE_LENGTH`: Byte length of public key (48)
- `AMADEUS_SEED_BYTE_LENGTH`: Byte length of seed (64)
- `AMA_TOKEN_DECIMALS`: Number of decimal places (9)
- `AMA_TOKEN_DECIMALS_MULTIPLIER`: Multiplier for conversions (10^9)
- `AMA_TRANSFER_FEE`: Network transfer fee (0.02)
- `EXPLORER_URL`: Default explorer URL
- `NODE_API_URL`: Default node API URL

### Serialization

- `encode(term: SerializableValue): Uint8Array` - Encode value to canonical format
- `decode(bytes: Uint8Array | number[]): DecodedValue` - Decode from canonical format

### Crypto

- `generateKeypair(): KeyPair` - Generate a new keypair
- `generatePrivateKey(): Uint8Array` - Generate a random 64-byte seed
- `getPublicKey(seed64: Uint8Array): Uint8Array` - Derive public key from seed
- `derivePublicKeyFromSeedBase58(base58Seed: string): string` - Derive public key from Base58 seed
- `deriveSkAndSeed64FromBase58Seed(base58Seed64: string)` - Derive secret key and seed

### Encoding

- `toBase58(buf: Uint8Array): string` - Encode bytes to Base58
- `fromBase58(str: string): Uint8Array` - Decode Base58 to bytes
- `uint8ArrayToBase64(bytes: Uint8Array): string` - Convert bytes to Base64
- `base64ToUint8Array(base64: string): Uint8Array` - Convert Base64 to bytes
- `arrayBufferToBase64(buffer: ArrayBuffer): string` - Convert ArrayBuffer to Base64
- `base64ToArrayBuffer(base64: string): ArrayBuffer` - Convert Base64 to ArrayBuffer
- `uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer` - Convert Uint8Array to ArrayBuffer
- `arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array` - Convert ArrayBuffer to Uint8Array

### Signing

- `signTx(hash: Uint8Array, sk: PrivKey): Uint8Array` - Sign a transaction hash
- `signOOB(sk: string, msg: Uint8Array): Uint8Array` - Sign an out-of-band message

### Conversion

- `toAtomicAma(ama: number): number` - Convert AMA to atomic units
- `fromAtomicAma(atomicAma: number | string): number` - Convert atomic units to AMA

### Encryption

- `encryptWithPassword(plaintext: string, password: string): Promise<EncryptedPayload>` - Encrypt data with password (AES-GCM + PBKDF2)
- `decryptWithPassword(payload: EncryptedPayload, password: string): Promise<string>` - Decrypt data with password
- `generateSalt(): Uint8Array` - Generate random salt (16 bytes)
- `generateIV(): Uint8Array` - Generate random IV (12 bytes)
- `deriveKey(password: string, salt: Uint8Array | ArrayBuffer): Promise<CryptoKey>` - Derive AES-GCM key from password

### Transaction Building

- `TransactionBuilder` - Class for building and signing transactions
    - **Constructor:** `new TransactionBuilder(privateKey?: string)` - Create a new builder instance
    - **Instance Methods:**
        - `build(contract, method, args, signerPk?): UnsignedTransactionWithHash` - Build an unsigned transaction
        - `sign(unsignedTx, signerSk?): BuildTxResult` - Sign an unsigned transaction
        - `buildAndSign(contract, method, args, signerPk?, signerSk?): BuildTxResult` - Build and sign in one step
        - `buildTransfer(input, signerPk?): UnsignedTransactionWithHash` - Build an unsigned transfer
        - `transfer(input): BuildTxResult` - Build and sign a transfer (convenience)
    - **Static Methods:**
        - `build(signerPk, contract, method, args): UnsignedTransactionWithHash` - Build unsigned transaction
        - `sign(unsignedTx, signerSk): BuildTxResult` - Sign an unsigned transaction
        - `buildAndSign(signerPk, signerSk, contract, method, args): BuildTxResult` - Build and sign in one step
        - `buildTransfer(input, signerPk): UnsignedTransactionWithHash` - Build unsigned transfer
        - `buildSignedTransfer(input): BuildTxResult` - Build and sign transfer (convenience)

## Examples

See the [`examples/`](./examples/) directory for comprehensive usage examples:

- **Basic Usage** - SDK initialization, key generation, queries
- **Transaction Flow** - Complete transaction building and submission flow
- **API Usage** - All API endpoints demonstrated

```bash
# Run examples
npm run example:basic
npm run example:tx
npm run example:api
```

## Testing

The SDK includes comprehensive test coverage:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All exports are typed and documented.

## Error Handling

All errors are thrown as `AmadeusSDKError` instances with descriptive messages:

```typescript
import { AmadeusSDK, AmadeusSDKError } from '@amadeus-protocol/sdk'

try {
	const balance = await sdk.wallet.getBalance('invalid')
} catch (error) {
	if (error instanceof AmadeusSDKError) {
		console.error('SDK Error:', error.message)
		console.error('Status:', error.status)
		console.error('Response:', error.response)
	}
}
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure all code follows the existing style and includes appropriate tests.
