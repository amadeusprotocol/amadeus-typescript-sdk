# Developer Guide

Guide to using `@amadeus-protocol/sdk` 1.7.0. Every signature is in the
[API Reference](./API.md).

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

The package is ESM-only and needs Node.js 20+ (or a bundler). In TypeScript, use
`"module": "NodeNext"` (or `"moduleResolution": "Bundler"` with a bundler).

### Basic Setup

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

// Mainnet; this is also the default when no baseUrl is given
const sdk = new AmadeusSDK({
	baseUrl: 'https://mainnet-rpc.ama.one/api'
})
```

For testnet use `https://testnet-rpc.ama.one/api`, and sign transactions for testnet (see
[Networks](#networks)).

## Core Concepts

### Keypairs

Amadeus uses BLS12-381. An account is a 64-byte seed (the private key, Base58) and the 48-byte
public key derived from it.

```typescript
import { generateKeypair } from '@amadeus-protocol/sdk'

const keypair = generateKeypair()
console.log('Public Key:', keypair.publicKey)
console.log('Private Key:', keypair.privateKey) // Keep this secret!
```

### Addresses

The address is the Base58-encoded public key.

```typescript
import { generateKeypair, isValidAddress } from '@amadeus-protocol/sdk'

const address = generateKeypair().publicKey
console.log(isValidAddress(address)) // true: Base58 that decodes to 48 bytes
```

### Recovery Phrases

`generateMnemonic()` creates a 12-word phrase and `mnemonicToSeedBase58()` turns it into a seed
using EIP-2333 (`m/12381'/36969'/0'/0'/0'`). SDK 1.3.0 and earlier used the raw BIP39 seed
instead, so the same phrase can open **two different addresses**. When restoring a phrase, look
at both candidates:

```typescript
import { mnemonicToCandidateKeypairs, validateMnemonic } from '@amadeus-protocol/sdk'

const mnemonic = 'your twelve word recovery phrase ...'
if (!validateMnemonic(mnemonic)) throw new Error('Invalid recovery phrase')

const [standard, legacy] = mnemonicToCandidateKeypairs(mnemonic)
console.log('Standard (eip2333):', standard.publicKey)
console.log('Legacy (SDK <= 1.3.0):', legacy.publicKey)
```

`resolveMnemonicImport()` with `addressHasActivity()` picks the one with history for you; see
[Importing a phrase into a wallet](../README.md#importing-a-phrase-into-a-wallet).

### Transactions

A transaction is one contract call (`contract`, `function`, `args`) from a signer with a nonce.
It is:

1. Built (`TransactionBuilder`, `createContract`, or a call builder such as `buildCoinTransfer`)
2. Signed with the sender's seed, under the signing domain of the target network
3. Packed (VecPack)
4. Submitted to a node

#### Building and Signing Transactions

**Option 1: Build and sign in one step**

```typescript
import { AmadeusSDK, TransactionBuilder } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const builder = new TransactionBuilder('5Kd3N...') // sender seed

const { txHash, txPacked } = builder.transfer({
	recipient: '5Kd3N...',
	amount: 1.5, // AMA
	symbol: 'AMA'
})

const { hash } = await sdk.transaction.submit(txPacked)
```

**Option 2: Build unsigned, then sign**

```typescript
import { AmadeusSDK, TransactionBuilder } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const builder = new TransactionBuilder('5Kd3N...')

const unsignedTx = builder.buildTransfer({ recipient: '5Kd3N...', amount: 1.5, symbol: 'AMA' })
console.log('Nonce:', unsignedTx.tx.nonce)
console.log('Action:', unsignedTx.tx.action)

const { txPacked } = builder.sign(unsignedTx)
const { hash } = await sdk.transaction.submit(txPacked)
```

**Option 3: Static methods**

```typescript
import {
	TransactionBuilder,
	deriveSkAndSeed64FromBase58Seed,
	getPublicKey
} from '@amadeus-protocol/sdk'

const senderSeed = '5Kd3N...'

// Build and sign in one step
const transfer = TransactionBuilder.buildSignedTransfer({
	senderPrivkey: senderSeed,
	recipient: '5Kd3N...',
	amount: 1.5,
	symbol: 'AMA'
})

// Or build unsigned with an explicit public key, then sign
const { seed64 } = deriveSkAndSeed64FromBase58Seed(senderSeed)
const unsignedTx = TransactionBuilder.buildTransfer(
	{ recipient: '5Kd3N...', amount: 1.5, symbol: 'AMA' },
	getPublicKey(seed64)
)
const signed = TransactionBuilder.sign(unsignedTx, senderSeed)
```

### Confirmed vs Finalized

- **Confirmed**: the transaction is included in an entry and has a receipt, but consensus on that
  entry may not be reached yet.
- **Finalized**: validators have reached consensus on the entry, and the transaction's
  `metadata.status` is `'finalized'`.

`submitAndWait(txPacked)` returns when the transaction is confirmed; pass `{ finalized: true }`
to wait for finality, for example before crediting an off-chain ledger.

### Networks

Mainnet and testnet sign under different domain separation tags, so a transaction signed for one
is rejected on the other with `invalid_signature`. Everything signs for mainnet by default. For
testnet, pass the network: `new TransactionBuilder(key, { network: NetworkType.TESTNET })`,
`TransactionBuilder.signCall(key, call, NetworkType.TESTNET)`,
`createContract(abi).connect(key, NetworkType.TESTNET)`, or the network-aware primitives:

```typescript
import {
	AmadeusSDK,
	NETWORK_URLS,
	NetworkType,
	buildCoinTransfer,
	signContractCall
} from '@amadeus-protocol/sdk'

const testnet = new AmadeusSDK({ baseUrl: `${NETWORK_URLS[NetworkType.TESTNET]}/api` })

const call = buildCoinTransfer({ recipient: '5Kd3N...', amount: 1, symbol: 'AMA' })
const { txPacked } = signContractCall('5Kd3N...', call, NetworkType.TESTNET)
const { hash } = await testnet.transaction.submit(txPacked)
```

`buildAndSignRaw(...)` and `signUnsigned(...)` take the same trailing `network` argument. Testnet
AMA comes from the faucet at `TESTNET_FAUCET_URL` (`https://mcp.ama.one/testnet-faucet`): 100 AMA
per claim, once every 24 hours per IP.

### Amounts

AMA has 9 decimal places. `TransactionBuilder.transfer()` and `buildCoinTransfer()` take AMA and
convert for you; raw `build()` args and ABI params take atomic units as strings.

```typescript
import { toAtomicAma, fromAtomicAma, flatToAma } from '@amadeus-protocol/sdk'

const atomic = toAtomicAma(1.5) // 1500000000
const human = fromAtomicAma(1500000000) // 1.5
const staked = flatToAma(12_000_000_000_000_000n) // 12000000, bigint-safe
```

Balances from the node carry both forms: `float` (AMA) and `flat` (atomic).

### Encrypting Wallet Data

```typescript
import { encryptWithPassword, decryptWithPassword } from '@amadeus-protocol/sdk'

const userPassword = 'correct horse battery staple'

// Encrypt a seed before storing it
const encrypted = await encryptWithPassword('5Kd3N...', userPassword)
// Store encrypted.encryptedData, encrypted.iv and encrypted.salt

// Decrypt when needed
const seed = await decryptWithPassword(encrypted, userPassword)
```

**Security Notes:**

- AES-GCM with 256-bit keys
- PBKDF2 key derivation with 100,000 iterations
- A new salt and IV for every encryption
- Never store passwords in plain text

## Common Patterns

### Checking Balance

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const address = '5Kd3N...'

// One token
const { balance } = await sdk.wallet.getBalance(address, 'AMA')
console.log('Balance:', balance.float, 'AMA')

// All tokens: `balances` is an array
const { balances } = await sdk.wallet.getAllBalances(address)
for (const { symbol, float } of balances) {
	console.log(`${symbol}: ${float}`)
}
```

### Transaction History

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const address = '5Kd3N...'

// Sent by the address; use `arg0: address` for transfers it received
const { txs, cursor } = await sdk.chain.getByFilter({ signer: address, limit: 10, sort: 'desc' })
for (const tx of txs) {
	console.log(tx.hash, tx.tx.action.contract, tx.tx.action.function, tx.receipt.success)
}

// Next page
const nextPage = cursor
	? await sdk.chain.getByFilter({ signer: address, limit: 10, sort: 'desc', cursor })
	: null
```

### Building Contract Calls

For built-in contracts, use the ABI-driven API: it checks the function name and params. On
mainnet (node 1.6.5) `Lockup`, `LockupPrime` and `Nft` are disabled and their calls fail with
`invalid_bic_action` in the receipt; they run on testnet, which needs testnet signing (see
[Networks](#networks)).

```typescript
import { TransactionBuilder, LOCKUP_PRIME_ABI, toAtomicAma } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder('5Kd3N...')

const { txPacked } = builder
	.contract(LOCKUP_PRIME_ABI)
	.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })
```

For anything else, `build`/`buildAndSign` take raw args:

```typescript
import { TransactionBuilder, fromBase58, toAtomicAma } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder('5Kd3N...')

// Coin.transfer expects recipient bytes and an atomic amount string
const { txHash, txPacked } = builder.buildAndSign('Coin', 'transfer', [
	fromBase58('5Kd3N...'),
	toAtomicAma(1.5).toString(),
	'AMA'
])
```

### Submitting and Waiting

```typescript
import {
	AmadeusSDK,
	AmadeusSDKError,
	TransactionBuilder,
	getExecutionErrorMessage,
	getValidationErrorMessage
} from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const { txPacked } = new TransactionBuilder('5Kd3N...').transfer({
	recipient: '5Kd3N...',
	amount: 1.5,
	symbol: 'AMA'
})

try {
	const { hash, metadata, receipt } = await sdk.transaction.submitAndWait(txPacked)
	if (receipt.success) {
		console.log('Confirmed:', hash, 'in entry', metadata.entry_hash)
	} else {
		// Included, but execution failed (e.g. insufficient_funds)
		console.error('Execution failed:', getExecutionErrorMessage(receipt.result ?? 'unknown'))
	}
} catch (error) {
	if (!(error instanceof AmadeusSDKError)) throw error
	// Rejected by the node, or a network error
	console.error('Rejected:', getValidationErrorMessage(error.message.replace(/^HTTP \d+: /, '')))
}
```

### Error Handling

```typescript
import { AmadeusSDK, AmadeusSDKError } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()

try {
	const { balance } = await sdk.wallet.getBalance('5Kd3N...', 'AMA')
	console.log(balance.float)
} catch (error) {
	if (error instanceof AmadeusSDKError) {
		if (error.status === 404) {
			console.log('Not found')
		} else {
			console.error('API Error:', error.message, error.status)
		}
	} else {
		console.error('Unexpected error:', error)
	}
}
```

See [Errors](./API.md#errors) for every `message`/`status` combination.

### Querying Chain Data

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()

// Latest entry: header fields live under entry.header
const { entry } = await sdk.chain.getTip()
console.log('Current height:', entry.header.height, 'signer:', entry.header.signer)

// Chain statistics
const { stats } = await sdk.chain.getStats()
console.log('Finalized height:', stats.rooted_height)
console.log('Mempool:', stats.tx_pool_size, 'Burned:', stats.burned, 'Staked:', stats.total_locked)

// Protocol KPIs
const { kpi } = await sdk.chain.getKpi()
console.log('Total transactions:', kpi.total_tx)
```

### Reading a Staking Position

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const currentEpoch = await sdk.staking.getCurrentEpoch()

const position = await sdk.staking.getPosition('5Kd3N...', { currentEpoch })
console.log(`${position.totalStaked} AMA in ${position.vaultCount} vaults`)
console.log(`Weighted APY: ${position.weightedApyPercent}%`)
```

## Best Practices

### 1. Private Key Security

**Never:**

- Commit private keys to version control
- Log private keys
- Share private keys
- Store private keys in plain text

**Always:**

- Load keys from environment variables or a secret store
- Encrypt keys at rest (`encryptWithPassword`)
- Use separate keys for development and production

```typescript
import { TransactionBuilder } from '@amadeus-protocol/sdk'

// Good: read the seed from the environment
const seed = process.env.AMADEUS_SEED
if (!seed) throw new Error('AMADEUS_SEED not set')
const builder = new TransactionBuilder(seed)
```

### 2. Error Handling

Treat the two failure layers separately: `submit`/`submitAndWait` **throw** when the node rejects
a transaction, and a confirmed transaction can still have `receipt.success === false`. See
[Submitting and Waiting](#submitting-and-waiting).

### 3. Transaction Nonces

The nonce is `Date.now() * 1_000_000`, taken when the transaction is built. The node only accepts
a nonce higher than the signer's last on-chain nonce and rejects the rest with
`invalid_tx_nonce`, so build a signer's transactions in the order they should run. Two
transactions built in the same millisecond get the same nonce, so only one of them can land: space
out high-frequency builds by at least a millisecond.

### 4. Amount Precision

Use the SDK conversions instead of multiplying floats:

```typescript
import { toAtomicAma, isValidAmount } from '@amadeus-protocol/sdk'

const input = '8.2'
if (!isValidAmount(input)) throw new Error('Invalid amount')

// Good: 8200000000 (exact for up to 9 decimals)
const atomic = toAtomicAma(input)

// Bad: 8199999999.999999
const drifting = Number(input) * 1_000_000_000
```

### 5. Request Timeouts

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK({
	baseUrl: 'https://mainnet-rpc.ama.one/api',
	timeout: 60000 // 60 seconds
})
```

### 6. Parallel Requests

Since 1.7.0 one `AmadeusSDK` instance can run requests in parallel. Earlier versions cancelled the
request in flight whenever a new one started; upgrade before using `Promise.all` on a shared
instance. `sdk.cancel()` aborts every in-flight request.

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const [{ entry }, { stats }, { kpi }] = await Promise.all([
	sdk.chain.getTip(),
	sdk.chain.getStats(),
	sdk.chain.getKpi()
])
```

### 7. Retry Logic

Retry reads and network failures. Do not blindly retry a submit that failed with a node error
code: the code tells you what to fix.

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()

const withRetry = async <T>(
	request: () => Promise<T>,
	attemptsLeft = 3,
	delayMs = 1000
): Promise<T> => {
	try {
		return await request()
	} catch (error) {
		if (attemptsLeft <= 1) throw error
		await new Promise((resolve) => setTimeout(resolve, delayMs))
		return withRetry(request, attemptsLeft - 1, delayMs * 2)
	}
}

const { stats } = await withRetry(() => sdk.chain.getStats())
```

## Troubleshooting

### Common Issues

#### `ERR_MODULE_NOT_FOUND` when importing the package

**Cause:** SDK `1.0.x` published imports without `.js` extensions, which raw `node` cannot
resolve.

**Solution:** Upgrade to `1.1.0` or later (`npm install @amadeus-protocol/sdk@latest`), or run
through `tsx` or a bundler.

#### `require()` of the package fails

**Cause:** The package is ESM-only.

**Solution:** Use `import`, set `"type": "module"`, or run scripts with `tsx`.

#### "Expected Base58 encoded address string" (or another schema validation error)

**Cause:** An address, hash or key contains characters outside the Base58 alphabet. The SDK checks
the characters only, so a value of the wrong length reaches the node.

**Solution:** Validate input first; `validateAddress` also checks for 48 bytes:

```typescript
import { validateAddress } from '@amadeus-protocol/sdk'

const result = validateAddress('5Kd3N...')
if (!result.valid) console.error(result.error)
```

#### `invalid_signature` on testnet

**Cause:** The transaction was signed with the mainnet domain, for example by
`TransactionBuilder`, and submitted to testnet.

**Solution:** Sign with `NetworkType.TESTNET` (see [Networks](#networks)).

#### `not_enough_tx_exec_balance` or `not_enough_txpool_balance`

**Cause:** The account's AMA balance cannot cover the transaction's budget, 0.01 AMA plus any
attached gas (`not_enough_tx_exec_balance`), or that plus the budgets of its transactions already
waiting in the pool (`not_enough_txpool_balance`).

**Solution:** Check the balance before submitting. A transfer needs its amount on top of that
budget; the chain charges only what the transaction uses and refunds the rest. Keep
`AMA_TRANSFER_FEE` (0.02 AMA) free as a conservative margin:

```typescript
import { AMA_TRANSFER_FEE, AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const amount = 1.5

const { balance } = await sdk.wallet.getBalance('5Kd3N...', 'AMA')
if (balance.float < amount + AMA_TRANSFER_FEE) {
	throw new Error('Insufficient balance')
}
```

#### The receipt says `insufficient_funds`

**Cause:** The transaction was included, but the contract found too little balance when it ran.
This comes back in `receipt.result` with `receipt.success === false`, not as a thrown error.

**Solution:** Check the balance, then build and submit a new transaction.

#### "Request timeout after 30000ms"

**Cause:** Network issues or a slow node.

**Solution:** Increase `timeout` or retry:

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK({ timeout: 60000 })
```

#### "Request cancelled" or timeouts when making parallel calls

**Cause:** Before 1.7.0, a new request on the same client aborted the one in flight.

**Solution:** Upgrade to 1.7.0 or later.

#### Staked balances missing, or "Expected MAP type"

**Cause:** Since node `78b5e9c`, `get_prefix` answers in pages, which SDKs before 1.7.0 could not
decode.

**Solution:** Upgrade to 1.7.0 or later, and read prefixes with `contract.getPrefixEntries()` (or
`readAllPrefixPages()`), never `contract.getPrefix()`.

#### A recovery phrase opens a different (empty) address

**Cause:** Since 1.4.0, `mnemonicToSeedBase58()` uses EIP-2333. A wallet created with SDK 1.3.0 or
earlier used the raw BIP39 seed (`legacy`).

**Solution:** Derive both accounts with `mnemonicToCandidateKeypairs()`, or let
`resolveMnemonicImport()` pick the one with history (see [Recovery Phrases](#recovery-phrases)).

#### Decryption fails

**Cause:** Wrong password or corrupted payload.

```typescript
import { decryptWithPassword } from '@amadeus-protocol/sdk'

const encrypted = { encryptedData: '...', iv: '...', salt: '...' }

try {
	const seed = await decryptWithPassword(encrypted, 'my-password')
} catch (error) {
	if (error instanceof Error && error.message.startsWith('Decryption failed')) {
		console.error('Wrong password')
	}
}
```

### Debugging

`AmadeusSDKError` keeps the error body (parsed JSON, or the text) in `error.response` and the
status in `error.status`. `sdk.getConfig()` shows the base URL, timeout and headers in use.

### Getting Help

- Read the [API Reference](./API.md)
- Run the [examples](../examples/)
- Open an issue on [GitHub](https://github.com/amadeusprotocol/amadeus-typescript-sdk/issues)
