# API Reference

Complete API documentation for the Amadeus Protocol SDK.

## Table of Contents

- [AmadeusSDK](#amadeussdk)
- [TransactionBuilder](#transactionbuilder)
- [Crypto Utilities](#crypto-utilities)
- [Serialization](#serialization)
- [Conversion Utilities](#conversion-utilities)
- [API Modules](#api-modules)

## AmadeusSDK

Main SDK class providing access to all API modules.

### Constructor

```typescript
new AmadeusSDK(config?: AmadeusSDKConfig)
```

**Parameters:**

- `config.baseUrl` (string, optional): Base URL for the Amadeus node API. Defaults to `https://nodes.amadeus.bot/api`
- `config.timeout` (number, optional): Request timeout in milliseconds. Defaults to `30000`
- `config.headers` (Record<string, string>, optional): Additional HTTP headers

**Example:**

```typescript
const sdk = new AmadeusSDK({
	baseUrl: 'https://nodes.amadeus.bot/api',
	timeout: 60000
})
```

### Methods

#### `getVersion(): string`

Returns the SDK version.

#### `getConfig(): AmadeusSDKConfig`

Returns the current SDK configuration.

#### `setBaseUrl(url: string): void`

Updates the base URL for API requests.

#### `setHeaders(headers: Record<string, string>): void`

Updates HTTP headers for all requests.

#### `cancel(): void`

Cancels all ongoing requests.

### API Modules

- `sdk.chain` - Chain API
- `sdk.wallet` - Wallet API
- `sdk.transaction` - Transaction API
- `sdk.contract` - Contract API
- `sdk.epoch` - Epoch API
- `sdk.peer` - Peer API
- `sdk.proof` - Proof API

## TransactionBuilder

Class for building and signing Amadeus protocol transactions.

### Constructor

```typescript
new TransactionBuilder(privateKey?: string)
```

**Parameters:**

- `privateKey` (string, optional): Base58-encoded private key (seed). If provided, instance methods can use it automatically.

### Instance Methods

#### `build(contract: string, method: string, args: SerializableValue[], signerPk?: Uint8Array): UnsignedTransactionWithHash`

Builds an unsigned transaction. Returns the transaction structure and hash without signing.

**Parameters:**

- `contract` (string): Contract name
- `method` (string): Method name
- `args` (SerializableValue[]): Method arguments
- `signerPk` (Uint8Array, optional): Signer's public key (required if instance has no private key)

**Returns:** `{ tx: UnsignedTransaction, hash: Uint8Array }`

**Example:**

```typescript
const builder = new TransactionBuilder('5Kd3N...')
const unsignedTx = builder.build('Coin', 'transfer', [
	fromBase58('5Kd3N...'),
	toAtomicAma(1.5).toString(),
	'AMA'
])
// Can inspect or modify unsignedTx before signing
const { txHash, txPacked } = builder.sign(unsignedTx)
```

#### `sign(unsignedTx: UnsignedTransactionWithHash, signerSk?: PrivKey | string | Uint8Array): BuildTxResult`

Signs an unsigned transaction.

**Parameters:**

- `unsignedTx` (UnsignedTransactionWithHash): Unsigned transaction with hash
- `signerSk` (PrivKey | string | Uint8Array, optional): Signer's secret key (required if instance has no private key)

**Returns:** `{ txHash: string, txPacked: Uint8Array }`

**Example:**

```typescript
const builder = new TransactionBuilder('5Kd3N...')
const unsignedTx = builder.build('Coin', 'transfer', args)
const { txHash, txPacked } = builder.sign(unsignedTx)
```

#### `buildAndSign(contract: string, method: string, args: SerializableValue[], signerPk?: Uint8Array, signerSk?: PrivKey | string | Uint8Array): BuildTxResult`

Builds and signs a transaction in one step (convenience method).

**Parameters:**

- `contract` (string): Contract name
- `method` (string): Method name
- `args` (SerializableValue[]): Method arguments
- `signerPk` (Uint8Array, optional): Signer's public key (required if instance has no private key)
- `signerSk` (PrivKey | string | Uint8Array, optional): Signer's secret key (required if instance has no private key)

**Returns:** `{ txHash: string, txPacked: Uint8Array }`

**Example:**

```typescript
const builder = new TransactionBuilder('5Kd3N...')
const { txHash, txPacked } = builder.buildAndSign('Coin', 'transfer', [
	fromBase58('5Kd3N...'),
	toAtomicAma(1.5).toString(),
	'AMA'
])
```

#### `buildTransfer(input: Omit<TransferTxInput, 'senderPrivkey'>, signerPk?: Uint8Array): UnsignedTransactionWithHash`

Builds an unsigned transfer transaction.

**Parameters:**

- `input.recipient` (string): Base58-encoded recipient public key
- `input.amount` (number): Amount in human-readable format (e.g., 1.5 AMA)
- `input.symbol` (string): Token symbol (e.g., 'AMA')
- `signerPk` (Uint8Array, optional): Signer's public key (required if instance has no private key)

**Returns:** `{ tx: UnsignedTransaction, hash: Uint8Array }`

**Example:**

```typescript
const builder = new TransactionBuilder('5Kd3N...')
const unsignedTx = builder.buildTransfer({
	recipient: '5Kd3N...',
	amount: 1.5,
	symbol: 'AMA'
})
const { txHash, txPacked } = builder.sign(unsignedTx)
```

#### `transfer(input: Omit<TransferTxInput, 'senderPrivkey'>): BuildTxResult`

Builds and signs a transfer transaction in one step (convenience method).

**Parameters:**

- `input.recipient` (string): Base58-encoded recipient public key
- `input.amount` (number): Amount in human-readable format (e.g., 1.5 AMA)
- `input.symbol` (string): Token symbol (e.g., 'AMA')

**Returns:** `{ txHash: string, txPacked: Uint8Array }`

**Example:**

```typescript
const builder = new TransactionBuilder('5Kd3N...')
const { txHash, txPacked } = builder.transfer({
	recipient: '5Kd3N...',
	amount: 1.5,
	symbol: 'AMA'
})
```

### Static Methods

#### `TransactionBuilder.build(signerPk: Uint8Array, contract: string, method: string, args: SerializableValue[]): UnsignedTransactionWithHash`

Static method to build an unsigned transaction.

**Parameters:**

- `signerPk` (Uint8Array): Signer's public key
- `contract` (string): Contract name
- `method` (string): Method name
- `args` (SerializableValue[]): Method arguments

**Returns:** `{ tx: UnsignedTransaction, hash: Uint8Array }`

#### `TransactionBuilder.sign(unsignedTx: UnsignedTransactionWithHash, signerSk: PrivKey | string | Uint8Array): BuildTxResult`

Static method to sign an unsigned transaction.

**Parameters:**

- `unsignedTx` (UnsignedTransactionWithHash): Unsigned transaction with hash
- `signerSk` (PrivKey | string | Uint8Array): Signer's secret key (Base58 string or PrivKey)

**Returns:** `{ txHash: string, txPacked: Uint8Array }`

#### `TransactionBuilder.buildAndSign(signerPk: Uint8Array, signerSk: PrivKey | string | Uint8Array, contract: string, method: string, args: SerializableValue[]): BuildTxResult`

Static method to build and sign a transaction in one step.

**Parameters:**

- `signerPk` (Uint8Array): Signer's public key
- `signerSk` (PrivKey | string | Uint8Array): Signer's secret key (Base58 string or PrivKey)
- `contract` (string): Contract name
- `method` (string): Method name
- `args` (SerializableValue[]): Method arguments

**Returns:** `{ txHash: string, txPacked: Uint8Array }`

#### `TransactionBuilder.buildTransfer(input: Omit<TransferTxInput, 'senderPrivkey'>, signerPk: Uint8Array): UnsignedTransactionWithHash`

Static method to build an unsigned transfer transaction.

**Parameters:**

- `input.recipient` (string): Base58-encoded recipient public key
- `input.amount` (number): Amount in human-readable format
- `input.symbol` (string): Token symbol
- `signerPk` (Uint8Array): Signer's public key

**Returns:** `{ tx: UnsignedTransaction, hash: Uint8Array }`

#### `TransactionBuilder.buildSignedTransfer(input: TransferTxInput): BuildTxResult`

Static method to build and sign a transfer transaction in one step (convenience).

**Parameters:**

- `input.senderPrivkey` (string): Base58-encoded sender private key (seed)
- `input.recipient` (string): Base58-encoded recipient public key
- `input.amount` (number): Amount in human-readable format
- `input.symbol` (string): Token symbol

**Returns:** `{ txHash: string, txPacked: Uint8Array }`

## Crypto Utilities

### `generateKeypair(): KeyPair`

Generates a new BLS12-381 keypair.

**Returns:** `{ publicKey: string, privateKey: string }`

### `generatePrivateKey(): Uint8Array`

Generates a new private key seed.

**Returns:** `Uint8Array` (64 bytes)

### `getPublicKey(seed: Uint8Array): Uint8Array`

Derives a public key from a seed.

**Parameters:**

- `seed` (Uint8Array): 64-byte seed

**Returns:** `Uint8Array` (48 bytes)

### `derivePublicKeyFromSeedBase58(seedBase58: string): string`

Derives public key from Base58-encoded seed.

### `deriveSkAndSeed64FromBase58Seed(seedBase58: string): { sk: Uint8Array, seed64: Uint8Array }`

Derives secret key and seed from Base58-encoded seed.

## Encoding Utilities

General-purpose encoding and decoding functions for converting between different binary formats.

### `toBase58(bytes: Uint8Array): string`

Encodes bytes to Base58 string.

**Parameters:**

- `bytes` (Uint8Array): Bytes to encode

**Returns:** `string` - Base58 encoded string

### `fromBase58(str: string): Uint8Array`

Decodes Base58 string to bytes.

**Parameters:**

- `str` (string): Base58 string to decode

**Returns:** `Uint8Array` - Decoded bytes

### `uint8ArrayToBase64(bytes: Uint8Array): string`

Converts Uint8Array to Base64 string.

**Parameters:**

- `bytes` (Uint8Array): Bytes to encode

**Returns:** `string` - Base64 encoded string

### `base64ToUint8Array(base64: string): Uint8Array`

Converts Base64 string to Uint8Array.

**Parameters:**

- `base64` (string): Base64 encoded string

**Returns:** `Uint8Array` - Decoded bytes

### `arrayBufferToBase64(buffer: ArrayBuffer): string`

Converts ArrayBuffer to Base64 string.

**Parameters:**

- `buffer` (ArrayBuffer): Buffer to encode

**Returns:** `string` - Base64 encoded string

### `base64ToArrayBuffer(base64: string): ArrayBuffer`

Converts Base64 string to ArrayBuffer.

**Parameters:**

- `base64` (string): Base64 encoded string

**Returns:** `ArrayBuffer` - Decoded buffer

### `uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer`

Converts Uint8Array to ArrayBuffer.

**Parameters:**

- `bytes` (Uint8Array): The Uint8Array to convert

**Returns:** `ArrayBuffer`

### `arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array`

Converts ArrayBuffer to Uint8Array.

**Parameters:**

- `buffer` (ArrayBuffer): The ArrayBuffer to convert

**Returns:** `Uint8Array` - View of the buffer

## Serialization

### `encode(value: SerializableValue): Uint8Array`

Encodes a value using VecPack canonical serialization.

**Parameters:**

- `value`: Serializable value (null, boolean, number, bigint, string, Uint8Array, array, object, Map)

**Returns:** `Uint8Array` - Encoded bytes

### `decode(bytes: Uint8Array): DecodedValue`

Decodes VecPack-encoded bytes.

**Parameters:**

- `bytes` (Uint8Array): Encoded bytes

**Returns:** Decoded value

## Conversion Utilities

### `toAtomicAma(amount: number): number`

Converts AMA amount to atomic units.

**Parameters:**

- `amount` (number): Amount in AMA (e.g., 1.5)

**Returns:** `number` - Amount in atomic units

### `fromAtomicAma(atomic: number | string): number`

Converts atomic units to AMA amount.

**Parameters:**

- `atomic` (number | string): Amount in atomic units

**Returns:** `number` - Amount in AMA

## Encryption Utilities

Password-based encryption utilities for securing sensitive wallet data using AES-GCM and PBKDF2.

### `encryptWithPassword(plaintext: string, password: string): Promise<EncryptedPayload>`

Encrypts plaintext using AES-GCM encryption with PBKDF2 key derivation (100,000 iterations).

**Parameters:**

- `plaintext` (string): Data to encrypt
- `password` (string): Password for encryption

**Returns:** `Promise<EncryptedPayload>` - Object containing `encryptedData`, `iv`, and `salt` (all Base64 encoded)

**Example:**

```typescript
const encrypted = await encryptWithPassword('sensitive data', 'my-password')
// Store encrypted.encryptedData, encrypted.iv, encrypted.salt
```

### `decryptWithPassword(payload: EncryptedPayload, password: string): Promise<string>`

Decrypts encryptedData using the provided password.

**Parameters:**

- `payload` (EncryptedPayload): Encrypted payload with `encryptedData`, `iv`, and `salt`
- `password` (string): Password used for encryption

**Returns:** `Promise<string>` - Decrypted plaintext

**Throws:** `Error` if decryption fails (wrong password or corrupted data)

**Example:**

```typescript
const decrypted = await decryptWithPassword(encrypted, 'my-password')
```

### `generateSalt(): Uint8Array`

Generates a cryptographically secure random salt (16 bytes / 128 bits).

**Returns:** `Uint8Array` - Random salt

### `generateIV(): Uint8Array`

Generates a cryptographically secure random IV (12 bytes / 96 bits) for AES-GCM.

**Returns:** `Uint8Array` - Random IV

### `deriveKey(password: string, salt: Uint8Array | ArrayBuffer): Promise<CryptoKey>`

Derives an AES-GCM key from a password using PBKDF2.

**Parameters:**

- `password` (string): Password string
- `salt` (Uint8Array | ArrayBuffer): Salt for key derivation

**Returns:** `Promise<CryptoKey>` - Derived AES-GCM key (256 bits)

### Base64 Utilities

- `uint8ArrayToBase64(bytes: Uint8Array): string` - Convert bytes to Base64
- `base64ToUint8Array(base64: string): Uint8Array` - Convert Base64 to bytes
- `arrayBufferToBase64(buffer: ArrayBuffer): string` - Convert ArrayBuffer to Base64
- `base64ToArrayBuffer(base64: string): ArrayBuffer` - Convert Base64 to ArrayBuffer

## API Modules

### Chain API (`sdk.chain`)

#### `getTip(): Promise<ChainEntry>`

Gets the current chain tip.

#### `getStats(): Promise<ChainStats>`

Gets chain statistics.

#### `getByHeight(height: number): Promise<ChainEntry[]>`

Gets entries at a specific height.

#### `getByHash(hash: string): Promise<ChainEntry[]>`

Gets entries by hash.

#### `getTransactionEventsByAccount(address: string, filters?: TransactionFilters): Promise<TransactionEvent[]>`

Gets transaction events for an account.

### Wallet API (`sdk.wallet`)

#### `getBalance(address: string, symbol: string): Promise<WalletBalance>`

Gets balance for a specific token.

#### `getAllBalances(address: string): Promise<WalletBalances>`

Gets all token balances for an address.

### Transaction API (`sdk.transaction`)

#### `submit(txPacked: Uint8Array | string): Promise<SubmitTransactionResponse>`

Submits a transaction.

**Parameters:**

- `txPacked` (Uint8Array | string): Packed transaction as Uint8Array or Base58 string

**Returns:** `Promise<SubmitTransactionResponse>` - Result with `error` and optional `hash` fields

**Example:**

```typescript
const result = await sdk.transaction.submit(txPacked)
if (result.error === 'ok') {
	console.log('Transaction hash:', result.hash)
}
```

#### `submitAndWait(txPacked: Uint8Array | string): Promise<SubmitAndWaitTransactionResponse>`

Submits a transaction and waits for confirmation. Returns result with entry hash and transaction result.

**Parameters:**

- `txPacked` (Uint8Array | string): Packed transaction as Uint8Array or Base58 string

**Returns:** `Promise<SubmitAndWaitTransactionResponse>` - Result with `hash`, `entry_hash`, and `result` fields

**Example:**

```typescript
const result = await sdk.transaction.submitAndWait(txPacked)
if (result.error === 'ok') {
	console.log('Hash:', result.hash)
	console.log('Entry hash:', result.entry_hash)
}
```

#### `get(txHash: string): Promise<Transaction>`

Gets a transaction by hash.

**Parameters:**

- `txHash` (string): Transaction hash (Base58 encoded)

**Returns:** `Promise<Transaction>` - Transaction data

**Example:**

```typescript
const tx = await sdk.transaction.get('5Kd3N...')
console.log('Transaction:', tx.hash)
```

### Contract API (`sdk.contract`)

#### `validateBytecode(bytecode: Uint8Array | ArrayBuffer): Promise<ValidateBytecodeResponse>`

Validates contract bytecode.

**Parameters:**

- `bytecode` (Uint8Array | ArrayBuffer): Contract bytecode to validate

**Returns:** `Promise<ValidateBytecodeResponse>` - Validation result

**Example:**

```typescript
const result = await sdk.contract.validateBytecode(wasmBytecode)
```

#### `get(key: Uint8Array | string): Promise<ContractDataValue>`

Gets contract data by key.

**Parameters:**

- `key` (Uint8Array | string): Contract key as Uint8Array or Base58 string

**Returns:** `Promise<ContractDataValue>` - Contract data value (JSON-serializable)

**Example:**

```typescript
const data = await sdk.contract.get(keyBytes)
```

#### `getPrefix(key: Uint8Array | string): Promise<ContractDataValue[]>`

Gets contract data by key prefix.

**Parameters:**

- `key` (Uint8Array | string): Contract key prefix as Uint8Array or Base58 string

**Returns:** `Promise<ContractDataValue[]>` - Array of key-value pairs matching the prefix

**Example:**

```typescript
const data = await sdk.contract.getPrefix(keyPrefix)
```

#### `getRichlist(): Promise<GetRichlistResponse>`

Gets contract richlist (token holders).

**Returns:** `Promise<GetRichlistResponse>` - Richlist entries

**Example:**

```typescript
const { richlist } = await sdk.contract.getRichlist()
```

### Epoch API (`sdk.epoch`)

#### `getScore(publicKey?: string): Promise<EpochScore | EpochScore[]>`

Gets epoch score(s).

#### `getAllScores(): Promise<EpochScore[]>`

Gets all epoch scores.

#### `getTopValidators(limit: number): Promise<EpochScore[]>`

Gets top validators.

### Peer API (`sdk.peer`)

#### `getNodes(): Promise<PeerInfo[]>`

Gets all network nodes.

#### `getTrainers(): Promise<PeerInfo[]>`

Gets all trainers.

#### `getANRs(): Promise<ANRInfo[]>`

Gets ANR entries.

### Proof API (`sdk.proof`)

#### `getValidators(entryHash: string): Promise<ProofData>`

Gets validator proof for an entry.

## Error Handling

All errors are instances of `AmadeusSDKError`:

```typescript
class AmadeusSDKError extends Error {
	status?: number
	response?: unknown
}
```

**Example:**

```typescript
try {
	const balance = await sdk.wallet.getBalance('invalid')
} catch (error) {
	if (error instanceof AmadeusSDKError) {
		console.error('Error:', error.message)
		console.error('Status:', error.status)
	}
}
```
