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

> **ESM-only**: this package is published as pure ESM (`"type": "module"`). Use Node.js 20+ with `"type": "module"` in your `package.json`, or any modern bundler (Vite, webpack, esbuild, Metro). For CommonJS consumers, run via [`tsx`](https://github.com/privatenumber/tsx). See [Troubleshooting](https://docs.ama.one/sdk/9.-troubleshooting.md) for the `1.0.x` `ERR_MODULE_NOT_FOUND` issue and upgrade path.

## What's New in 1.1.0

- **`contract.view()`** — read-only contract execution
- **`chain.getByFilter()`** / **`chain.getKpi()`** — filtered tx queries + protocol KPIs
- **`proof.getContractStateProof()`** — merkle proofs for contract state
- **`submitAndWait(txPacked, { finalized: true })`** — wait for finality instead of confirmation
- **NFT contract** — `NFT_ABI`, `buildNftTransfer/Mint/CreateCollection`, `TransactionBuilder.nftTransfer/nftMint/nftCreateCollection`
- **ESM fix** — published `dist/*.js` now resolves correctly under raw `node` (the `1.0.x` `ERR_MODULE_NOT_FOUND` bug)

See the [CHANGELOG](./CHANGELOG.md) for full release history.

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
	baseUrl: 'https://mainnet-rpc.ama.one/api'
})

// Query chain
const tip = await sdk.chain.getTip()
console.log('Current height:', tip.entry.header.height)

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
	baseUrl: 'https://mainnet-rpc.ama.one/api',
	timeout: 30000 // Optional: custom timeout
})

// Chain API
const stats = await sdk.chain.getStats()
const tip = await sdk.chain.getTip()
const entry = await sdk.chain.getByHash('5Kd3N...')
const { txs, cursor } = await sdk.chain.getByFilter({ contract: 'Coin', function: 'transfer' })
const { kpi } = await sdk.chain.getKpi()

// Wallet API
const balance = await sdk.wallet.getBalance('5Kd3N...', 'AMA')
const allBalances = await sdk.wallet.getAllBalances('5Kd3N...')

// Transaction API
const result = await sdk.transaction.submit(txPacked)
const confirmed = await sdk.transaction.submitAndWait(txPacked)
const finalized = await sdk.transaction.submitAndWait(txPacked, { finalized: true })
const tx = await sdk.transaction.get('5Kd3N...')

// Contract API
const contractData = await sdk.contract.get(key)
const richlist = await sdk.contract.getRichlist()
const { success, result } = await sdk.contract.view({
	contract: 'LockupPrime',
	function: 'view_balance',
	args: ['my_vault']
})

// Epoch API
const scores = await sdk.epoch.getScore()
const emission = await sdk.epoch.getEmissionAddress('5Kd3N...')

// Peer API
const nodes = await sdk.peer.getNodes()
const trainers = await sdk.peer.getTrainers()

// Proof API
const validatorProof = await sdk.proof.getValidators(entryHash)
const stateProof = await sdk.proof.getContractStateProof(stateKey)
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

#### ABI-Driven (Lockup, LockupPrime, etc.)

The recommended pattern for built-in contracts. Pass any ABI to `builder.contract(abi)` and get fully-typed function calls:

```typescript
import {
	TransactionBuilder,
	LOCKUP_PRIME_ABI,
	LOCKUP_ABI,
	toAtomicAma
} from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder('5Kd3N...')

// LockupPrime — auto-typed methods derived from the ABI
builder.contract(LOCKUP_PRIME_ABI).lock({ amount: toAtomicAma(100).toString(), tier: '30d' })
builder.contract(LOCKUP_PRIME_ABI).unlock({ vaultIndex: '3' })
builder.contract(LOCKUP_PRIME_ABI).daily_checkin({ vaultIndex: '7' })

// Lockup
builder.contract(LOCKUP_ABI).unlock({ vaultIndex: '5' })
```

#### NFT (transfer, mint, create_collection)

The `Nft` built-in contract has dedicated builder methods. NFT amounts are integer counts, **not** AMA atomic units.

```typescript
const builder = new TransactionBuilder(privateKey)

// Create a collection (caller becomes owner)
builder.nftCreateCollection({ collection: 'AGENTIC', soulbound: false })

// Mint tokens (collection owner only)
builder.nftMint({ recipient: '5Kd3N...', amount: 10, collection: 'AGENTIC', token: '1' })

// Transfer
builder.nftTransfer({ recipient: '5Kd3N...', amount: 1, collection: 'AGENTIC', token: '1' })
```

Static variants: `TransactionBuilder.buildSignedNftTransfer/Mint/CreateCollection(input)` — each takes the same params plus `senderPrivkey`.

### Signing Transactions

The SDK supports two patterns. Pick whichever fits your workflow.

#### Pattern 1 — Auto-signed (high-level, recommended)

The `TransactionBuilder` instance methods build **and** sign in one call. Best for app code where you have the private key in hand.

```typescript
import { TransactionBuilder, LOCKUP_PRIME_ABI, toAtomicAma } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder('5Kd3N...') // Base58 seed

// Coin transfer
const a = builder.transfer({ recipient: '5Kd3N...', amount: 10.5, symbol: 'AMA' })

// ABI-driven (any contract)
const b = builder.contract(LOCKUP_PRIME_ABI).lock({
	amount: toAtomicAma(100).toString(),
	tier: '30d'
})

// NFT
const c = builder.nftTransfer({
	recipient: '5Kd3N...',
	amount: 1,
	collection: 'AGENTIC',
	token: '1'
})

// All return { txHash, txPacked } ready for sdk.transaction.submit(txPacked)
```

#### Pattern 2 — Manual: build a `ContractCall`, sign separately

Build a `ContractCall` with a standalone helper or `createContract(ABI)`, then sign it independently with `TransactionBuilder.signCall(privkey, call)`. Useful when:

- You want to inspect or log the call before signing
- The signing key lives somewhere else (HSM, separate process, separate machine)
- You want to batch-build and sign at the end

```typescript
import {
	TransactionBuilder,
	createContract,
	LOCKUP_PRIME_ABI,
	buildCoinTransfer,
	buildNftTransfer,
	toAtomicAma
} from '@amadeus-protocol/sdk'

// Build a ContractCall — three ways:

// A. Standalone helper (Coin)
const callA = buildCoinTransfer({ recipient: '5Kd3N...', amount: 10.5, symbol: 'AMA' })

// B. Standalone helper (NFT)
const callB = buildNftTransfer({
	recipient: '5Kd3N...',
	amount: 1,
	collection: 'AGENTIC',
	token: '1'
})

// C. ABI-driven, any contract
const lockupPrime = createContract(LOCKUP_PRIME_ABI)
const callC = lockupPrime.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })

// Inspect if you want
console.log('Will call:', callC.contract, callC.method, callC.args)

// Sign with any private key (no builder instance needed)
const { txHash, txPacked } = TransactionBuilder.signCall('5Kd3N...', callC)
```

#### Build-unsigned-then-sign (debugging)

If you need to inspect the full unsigned transaction (nonce, signer, action) before signing:

```typescript
const builder = new TransactionBuilder('5Kd3N...')

const unsigned = builder.buildTransfer({ recipient: '5Kd3N...', amount: 10.5, symbol: 'AMA' })
console.log('Nonce:', unsigned.tx.nonce)
console.log('Action:', unsigned.tx.action)

const { txHash, txPacked } = builder.sign(unsigned)
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

### Mnemonics (BIP39)

```typescript
import { generateMnemonic, validateMnemonic, mnemonicToSeedBase58 } from '@amadeus-protocol/sdk'

// Generate a 12-word mnemonic
const mnemonic = generateMnemonic()

// Validate a mnemonic
if (validateMnemonic(mnemonic)) {
	// Derive a Base58 seed (compatible with TransactionBuilder)
	const seedBase58 = mnemonicToSeedBase58(mnemonic)
}
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

### Mnemonics (BIP39)

- `generateMnemonic(): string` - Generate a 12-word BIP39 mnemonic
- `validateMnemonic(mnemonic: string): boolean` - Validate a BIP39 mnemonic
- `mnemonicToSeedBase58(mnemonic: string): string` - Derive a Base58 seed from a mnemonic
- `encodeVaultSecret`, `decodeVaultSecret`, `detectInputType` - Vault helpers

### Encoding

- `toBase58(buf: Uint8Array): string` - Encode bytes to Base58
- `fromBase58(str: string): Uint8Array` - Decode Base58 to bytes
- `uint8ArrayToBase64(bytes: Uint8Array): string` - Convert bytes to Base64
- `base64ToUint8Array(base64: string): Uint8Array` - Convert Base64 to bytes
- `arrayBufferToBase64(buffer: ArrayBuffer): string` - Convert ArrayBuffer to Base64
- `base64ToArrayBuffer(base64: string): ArrayBuffer` - Convert Base64 to ArrayBuffer
- `uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer` - Convert Uint8Array to ArrayBuffer
- `arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array` - Convert ArrayBuffer to Uint8Array

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
    - **ABI-driven (recommended):**
        - `contract(abi)` - Returns a typed, signer-bound contract interface; each ABI function becomes a method that builds and signs in one step
    - **Generic instance methods:**
        - `build(contract, method, args, signerPk?): UnsignedTransactionWithHash`
        - `sign(unsignedTx, signerSk?): BuildTransactionResult`
        - `buildAndSign(contract, method, args, signerPk?, signerSk?): BuildTransactionResult`
        - `buildFromCall(call): UnsignedTransactionWithHash`
        - `buildAndSignCall(call): BuildTransactionResult`
    - **Coin transfer:**
        - `buildTransfer(input, signerPk?): UnsignedTransactionWithHash`
        - `transfer(input): BuildTransactionResult`
    - **NFT (Nft contract):**
        - `nftTransfer({ recipient, amount, collection, token }): BuildTransactionResult`
        - `nftMint({ recipient, amount, collection, token }): BuildTransactionResult`
        - `nftCreateCollection({ collection, soulbound? }): BuildTransactionResult`
    - **Lockup / LockupPrime convenience methods:**
        - `lockupUnlock({ vaultIndex }): BuildTransactionResult`
        - `lockupPrimeLock({ amount, tier }): BuildTransactionResult`
        - `lockupPrimeUnlock({ vaultIndex }): BuildTransactionResult`
        - `lockupPrimeDailyCheckin({ vaultIndex }): BuildTransactionResult`
    - **Static methods:** `signCall`, `buildFromCall`, `buildAndSignCall`, `buildSignedTransfer`, `buildSignedNft{Transfer,Mint,CreateCollection}`, `buildSignedLockup{Unlock}`, `buildSignedLockupPrime{Lock,Unlock,DailyCheckin}`

### Contract ABIs

`as const` ABI definitions for built-in contracts. Pass any ABI to `createContract(abi)` or `builder.contract(abi)` for fully-typed function calls.

- `LOCKUP_ABI` - `Lockup` (vesting) — `unlock(vaultIndex)`
- `LOCKUP_PRIME_ABI` - `LockupPrime` — `lock(amount, tier)`, `unlock(vaultIndex)`, `daily_checkin(vaultIndex)`
- `NFT_ABI` - `Nft` — `transfer`, `mint`, `create_collection`

Standalone builders that return a `ContractCall`:

- `buildCoinTransfer({ recipient, amount, symbol })`
- `buildNftTransfer({ recipient, amount, collection, token })`
- `buildNftMint({ recipient, amount, collection, token })`
- `buildNftCreateCollection({ collection, soulbound? })`
- `createContract(abi).fn(params)` - generic ABI-driven builder
- `buildContractCall(abi, fn, params)` - lower-level ABI-driven builder

### Full API Reference

For complete documentation including request/response types, error handling, and end-to-end examples, see [docs.ama.one/sdk](https://docs.ama.one/sdk/1.-introduction.md).

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
