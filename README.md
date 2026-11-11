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

> **ESM-only**: this package is published as pure ESM (`"type": "module"`), with no CommonJS
> build. Use Node.js 20+ with `"type": "module"` in your `package.json`, or any modern bundler
> (Vite, webpack, esbuild, Metro). In TypeScript, set `module`/`moduleResolution` to `NodeNext`
> or `Bundler`. CommonJS projects can run scripts with [`tsx`](https://github.com/privatenumber/tsx).
> On `1.0.x`, raw `node` fails with `ERR_MODULE_NOT_FOUND`: upgrade to `1.1.0` or later (see
> [Troubleshooting](https://docs.ama.one/sdk/9.-troubleshooting)).

## What's New

### 1.7.0

- **Paged `get_prefix`**: since node `78b5e9c` the endpoint answers in `{ rows, cursor }` pages.
  `contract.getPrefixEntries()` (and so the `staking.*` vault reads) follows the cursor, and
  `decodeContractState()` reads both the paged and the old shape. Making your own HTTP calls?
  Use `readAllPrefixPages()` with `prefixPagePath()`
- **Concurrent requests** on one `AmadeusClient` no longer abort each other. Before 1.7.0 a new
  request cancelled the one in flight and reported it as a timeout

### 1.6.0

- **Dual-derivation import**: `resolveMnemonicImport()` derives both accounts a phrase can open,
  checks each one for history with the probe you pass (usually `addressHasActivity()`), and tells
  you which to open or that the user must choose. See [Importing a phrase into a wallet](#importing-a-phrase-into-a-wallet)
- **`resolveCandidateForAddress()`** finds the derivation of a phrase that opens a known address
- **`derivationForSeed()`** finds which derivation produced a stored seed
- `validateMnemonic()` and the derive functions accept phrases with extra whitespace or line
  breaks (`normalizeMnemonic()`)
- `SDK_VERSION` reports the real package version (it was stuck at `1.2.0`)

### 1.5.0

- **`mnemonicToCandidateKeypairs()`** derives both accounts a phrase can open (see 1.4.0), so
  wallets can recover either. See [Mnemonics and account derivation](#mnemonics-and-account-derivation)
- **`secretKeyToSeedBase58()`** imports a raw 32-byte BLS key (e.g. a hub export)

### 1.4.0 (breaking): `mnemonicToSeedBase58` returns a different account

`mnemonicToSeedBase58()` kept its name but switched from the raw BIP39 seed (`legacy`) to the
EIP-2333 path `m/12381'/36969'/0'/0'/0'` (`eip2333`), the standard shared with the hub, Prime Hub
and cli-wallet. Restoring a phrase with 1.4.0+ opens a **different address** than 1.3.0 and
earlier did. Seeds already stored in a vault are unaffected.

### 1.3.0

- **Network-bound signing**: testnet signs under its own domain separation tag, so a transaction
  signed for one network cannot be replayed on another. `signContractCall`, `buildAndSignRaw`
  and `signUnsigned` take an optional `network`; see [Networks and testnet](#networks-and-testnet)
- **`MetricsAPI`** for the separately deployed public activity metrics service, and
  `chain.getMetricsBlock()`. See [docs/PUBLIC-METRICS.md](./docs/PUBLIC-METRICS.md)

### 1.2.0

- **Staking (`LockupVault`)**: `sdk.staking.getPosition(publicKey)` returns every vault plus the
  rolled-up totals (total staked, accrued yield, stake-weighted APY, maturity and unlock state,
  stake per validator)
- **`contract.getPrefixEntries()`** returns raw `[key, value]` byte pairs. `/api/contract/get_prefix`
  answers with a VecPack _binary_ body, which `getPrefix()` mangles by parsing it as text
- **`client.postBinary()`**: POST returning raw bytes, for the binary endpoints
- **`ChainStats`** gained the fields the node returns: `total_locked`, `total_supply`,
  `supply_computed_at_height` and `validators` (per-validator `commission_bps` and stake)

### 1.1.2

- **Types match the node**: entry fields live under `entry.header` (there is no `entry.height`
  or `entry.timestamp`), `ChainStats` has no `total_entries`/`total_transactions`, and richlist
  entries are `{ pk, symbol, flat, float }`
- The `submit()` and `submitAndWait()` types drop the `error` field they never carried: the client
  strips `error: 'ok'` and throws on any other value, so a resolved call is `{ hash }` or
  `{ hash, metadata, receipt }`

### 1.1.0

- **`contract.view()`**, **`chain.getByFilter()`**, **`chain.getKpi()`**,
  **`proof.getContractStateProof()`** and **`submitAndWait(txPacked, { finalized: true })`**
- **NFT contract**: `NFT_ABI`, `buildNftTransfer/Mint/CreateCollection`,
  `TransactionBuilder.nftTransfer/nftMint/nftCreateCollection`
- **ESM fix**: `dist/*.js` resolves under raw `node` (the `1.0.x` `ERR_MODULE_NOT_FOUND` bug)

See the [CHANGELOG](./CHANGELOG.md) for the full release history, and the
[migration guide](https://docs.ama.one/sdk/migration-guide) to upgrade from 1.0.x or 1.1.x.

## Features

- **Canonical Serialization (VecPack)**: Deterministic encoding/decoding for cryptographic operations
- **Cryptographic Operations**: BLS12-381 key generation and transaction signing
- **Recovery Phrases**: BIP39 mnemonics with EIP-2333 derivation, plus recovery of legacy-derived accounts
- **Password-Based Encryption**: AES-GCM encryption with PBKDF2 key derivation for wallet data
- **Transaction Building**: Build and sign Coin, NFT, Lockup and LockupPrime calls, or any ABI
- **Network-Bound Signing**: Mainnet and testnet signatures use different domains
- **Staking**: Read LockupVault positions: totals, per-vault detail and stake-weighted APY
- **API Client**: Typed HTTP client for Amadeus nodes
- **Token Conversions, Encoding, Validation, Formatting and Explorer Links**
- **Type Safety**: Complete TypeScript definitions for all APIs
- **No HTTP library**: Uses native `fetch` (no axios)

## Quick Start

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

// Defaults to https://mainnet-rpc.ama.one/api
const sdk = new AmadeusSDK()

const { entry } = await sdk.chain.getTip()
console.log('Current height:', entry.header.height)

const { balance } = await sdk.wallet.getBalance('5Kd3N...', 'AMA')
console.log('Balance:', balance.float, balance.symbol)
```

## Usage

### API Client

Every response is the node's JSON with the `error: 'ok'` envelope removed. Any other `error`
is thrown as an `AmadeusSDKError` (see [Error Handling](#error-handling)).

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK({
	baseUrl: 'https://mainnet-rpc.ama.one/api',
	timeout: 30000 // Optional, in milliseconds
})
const address = '5Kd3N...'

// Chain API
const { stats } = await sdk.chain.getStats()
const { entry } = await sdk.chain.getTip()
const { entries } = await sdk.chain.getByHeight(stats.rooted_height)
const { kpi } = await sdk.chain.getKpi()

// Transaction history: pass `cursor` back to read the next page
const { txs, cursor } = await sdk.chain.getByFilter({ signer: address, limit: 10, sort: 'desc' })

// Wallet API
const { balance } = await sdk.wallet.getBalance(address, 'AMA')
const { balances } = await sdk.wallet.getAllBalances(address) // [{ symbol, float, flat }]

// Transaction API
const tx = await sdk.transaction.get(txs[0].hash)
const { txs: entryTxs } = await sdk.transaction.getByEntry(tx.metadata.entry_hash)

// Contract API
const { richlist } = await sdk.contract.getRichlist() // [{ pk, symbol, flat, float }]

// Epoch API
const scores = await sdk.epoch.getAllScores() // [publicKey, score][]
const { emission_address } = await sdk.epoch.getEmissionAddress(entry.header.signer)

// Peer API
const { nodes } = await sdk.peer.getNodes()
const { trainers } = await sdk.peer.getTrainers()

// Staking API
const position = await sdk.staking.getPosition(address)
```

`entry.header` holds `height`, `slot` and `signer`. `stats` holds `height`, `rooted_height`,
`tx_pool_size`, `circulating`, `burned`, `total_locked`, `emission_for_epoch` and per-validator
`validators[publicKey]`.

`baseUrl` is used for its scheme and host only: endpoints are rooted at `/api`, so a path prefix
such as `https://host/node1/api` is not kept.

### Key Generation

```typescript
import { generateKeypair, derivePublicKeyFromSeedBase58 } from '@amadeus-protocol/sdk'

// Generate a new keypair
const keypair = generateKeypair()
console.log(keypair.publicKey) // Base58 public key (the address)
console.log(keypair.privateKey) // Base58 64-byte seed

// Derive the public key from an existing seed
const publicKey = derivePublicKeyFromSeedBase58(keypair.privateKey)
```

To create an account from a recovery phrase, see
[Mnemonics and account derivation](#mnemonics-and-account-derivation).

### Transaction Building

`TransactionBuilder` and `createContract(...).connect(...)` sign for **mainnet** by default. To sign
for testnet, see [Networks and testnet](#networks-and-testnet).

On mainnet (node 1.6.5) the `Lockup`, `LockupPrime` and `Nft` built-in contracts are disabled: a
call to them is included in an entry, but its receipt fails with `invalid_bic_action`. They run on
testnet only, so sign those calls for `NetworkType.TESTNET`.

#### TransactionBuilder

```typescript
import { TransactionBuilder, fromBase58, toAtomicAma } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder('5Kd3N...') // Base58 seed

// Build and sign a Coin transfer in one step (amount in AMA)
const transfer = builder.transfer({ recipient: '5Kd3N...', amount: 10.5, symbol: 'AMA' })

// Build unsigned, inspect, then sign
const unsignedTx = builder.buildTransfer({ recipient: '5Kd3N...', amount: 10.5, symbol: 'AMA' })
console.log('Nonce:', unsignedTx.tx.nonce, 'Action:', unsignedTx.tx.action)
const signed = builder.sign(unsignedTx)

// Any contract call from raw args (Coin needs recipient bytes and atomic amounts)
const custom = builder.buildAndSign('Coin', 'transfer', [
	fromBase58('5Kd3N...'),
	toAtomicAma(10.5).toString(),
	'AMA'
])

// Each result is { txHash, txPacked }, ready for sdk.transaction.submit(txPacked)
console.log(transfer.txHash, signed.txHash, custom.txHash)
```

#### ABI-Driven (Lockup, LockupPrime, any ABI)

Pass an `as const` ABI to `builder.contract(abi)` to get one typed method per ABI function. Each
method builds and signs in one step. ABI params are strings: amounts are atomic units.

```typescript
import {
	TransactionBuilder,
	LOCKUP_PRIME_ABI,
	LOCKUP_ABI,
	toAtomicAma
} from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder('5Kd3N...')

// LockupPrime: tier is one of '7d', '30d', '90d', '180d', '365d'
const lock = builder
	.contract(LOCKUP_PRIME_ABI)
	.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })
const primeUnlock = builder.contract(LOCKUP_PRIME_ABI).unlock({ vaultIndex: '3' })
const checkin = builder.contract(LOCKUP_PRIME_ABI).daily_checkin({ vaultIndex: '7' })

// Lockup (vesting)
const unlock = builder.contract(LOCKUP_ABI).unlock({ vaultIndex: '5' })
```

The convenience methods `lockupPrimeLock({ amount, tier })` (amount in AMA), `lockupPrimeUnlock`,
`lockupPrimeDailyCheckin` and `lockupUnlock({ vaultIndex })` do the same.

#### NFT (transfer, mint, create_collection)

The `Nft` built-in contract has dedicated builder methods. NFT amounts are integer counts, **not**
AMA atomic units.

`Nft` runs on testnet only (see above), so build with `{ network: NetworkType.TESTNET }`.
`Nft.create_collection` and `Nft.mint` take a single VecPack-encoded map argument, which these
methods send; `Nft.transfer` takes positional arguments.

```typescript
import { NetworkType, TransactionBuilder } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder('5Kd3N...', { network: NetworkType.TESTNET })

// Create a collection (the caller becomes its owner)
const created = builder.nftCreateCollection({ collection: 'AGENTIC', soulbound: false })

// Mint tokens (collection admins only)
const minted = builder.nftMint({
	recipient: '5Kd3N...',
	amount: 10,
	collection: 'AGENTIC',
	token: '1'
})

// Transfer (not possible in a soulbound collection)
const sent = builder.nftTransfer({
	recipient: '5Kd3N...',
	amount: 1,
	collection: 'AGENTIC',
	token: '1'
})
```

Static variants `TransactionBuilder.buildSignedNftTransfer/Mint/CreateCollection(input)` take the
same params plus `senderPrivkey`.

#### Build a `ContractCall`, sign separately

Build a `ContractCall` with a standalone helper or `createContract(ABI)`, then sign it with
`TransactionBuilder.signCall(privkey, call)`. Useful when you want to inspect or log the call
before signing, or when the key lives in another process.

```typescript
import {
	TransactionBuilder,
	createContract,
	LOCKUP_PRIME_ABI,
	buildCoinTransfer,
	buildNftTransfer,
	toAtomicAma
} from '@amadeus-protocol/sdk'

// Standalone helpers
const coinCall = buildCoinTransfer({ recipient: '5Kd3N...', amount: 10.5, symbol: 'AMA' })
const nftCall = buildNftTransfer({
	recipient: '5Kd3N...',
	amount: 1,
	collection: 'AGENTIC',
	token: '1'
})

// ABI-driven, any contract
const lockupPrime = createContract(LOCKUP_PRIME_ABI)
const lockCall = lockupPrime.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })
console.log('Will call:', lockCall.contract, lockCall.method, lockCall.args)

// Sign with any private key, no builder instance needed
const { txHash, txPacked } = TransactionBuilder.signCall('5Kd3N...', lockCall)
```

#### Static methods

```typescript
import {
	TransactionBuilder,
	deriveSkAndSeed64FromBase58Seed,
	getPublicKey
} from '@amadeus-protocol/sdk'

const seed = '5Kd3N...'

// Build and sign a transfer in one step
const transfer = TransactionBuilder.buildSignedTransfer({
	senderPrivkey: seed,
	recipient: '5Kd3N...',
	amount: 10.5,
	symbol: 'AMA'
})

// Build unsigned with an explicit signer public key, then sign
const { seed64 } = deriveSkAndSeed64FromBase58Seed(seed)
const unsignedTx = TransactionBuilder.buildTransfer(
	{ recipient: '5Kd3N...', amount: 10.5, symbol: 'AMA' },
	getPublicKey(seed64)
)
const signed = TransactionBuilder.sign(unsignedTx, seed)
```

### Submitting Transactions

`submit()` returns `{ hash }` once the node accepts the transaction into its pool.
`submitAndWait()` also waits for it to land in an entry and returns `{ hash, metadata, receipt }`.
A rejected transaction (bad signature, nonce, or not enough balance to cover execution) is thrown
as an `AmadeusSDKError` whose message is the node's error code. A transaction that was included
but failed during execution comes back with `receipt.success === false` and the reason in
`receipt.result`.

```typescript
import {
	AmadeusSDK,
	AmadeusSDKError,
	TransactionBuilder,
	getExecutionErrorMessage,
	getValidationErrorMessage
} from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const builder = new TransactionBuilder('5Kd3N...')
const { txPacked } = builder.transfer({ recipient: '5Kd3N...', amount: 1.5, symbol: 'AMA' })

try {
	const { hash, metadata, receipt } = await sdk.transaction.submitAndWait(txPacked)
	if (receipt.success) {
		console.log('Included at height', metadata.entry_height, hash)
	} else {
		console.error('Execution failed:', getExecutionErrorMessage(receipt.result ?? 'unknown'))
	}
} catch (error) {
	if (!(error instanceof AmadeusSDKError)) throw error
	// e.g. invalid_signature, invalid_tx_nonce, not_enough_tx_exec_balance, txpool_full
	console.error('Rejected:', getValidationErrorMessage(error.message.replace(/^HTTP \d+: /, '')))
}
```

**Confirmed vs finalized.** By default `submitAndWait` returns as soon as the transaction is
included in an entry (confirmed). Pass `{ finalized: true }` to wait until consensus is reached on
that entry, for example before crediting an off-chain ledger:

```typescript
import { AmadeusSDK, TransactionBuilder } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const { txPacked } = new TransactionBuilder('5Kd3N...').transfer({
	recipient: '5Kd3N...',
	amount: 1,
	symbol: 'AMA'
})

const { hash, metadata } = await sdk.transaction.submitAndWait(txPacked, { finalized: true })
console.log(hash, metadata.status)
```

Submit each packed transaction once: calling `submit()` and then `submitAndWait()` with the same
`txPacked` sends it twice.

### Networks and testnet

```typescript
import {
	AmadeusSDK,
	NETWORK_URLS,
	NetworkType,
	TESTNET_FAUCET_URL,
	buildCoinTransfer,
	signContractCall
} from '@amadeus-protocol/sdk'

// NETWORK_URLS holds the host only; the SDK base URL needs /api
const testnet = new AmadeusSDK({ baseUrl: `${NETWORK_URLS[NetworkType.TESTNET]}/api` })

// Testnet verifies signatures under its own domain, so sign with NetworkType.TESTNET
const call = buildCoinTransfer({ recipient: '5Kd3N...', amount: 1, symbol: 'AMA' })
const { txPacked } = signContractCall('5Kd3N...', call, NetworkType.TESTNET)

const { hash } = await testnet.transaction.submit(txPacked)
console.log('Submitted', hash, '- testnet AMA:', TESTNET_FAUCET_URL)
```

| Network | API base URL                      | Explorer                           |
| ------- | --------------------------------- | ---------------------------------- |
| Mainnet | `https://mainnet-rpc.ama.one/api` | `https://explorer.ama.one`         |
| Testnet | `https://testnet-rpc.ama.one/api` | `https://testnet.explorer.ama.one` |

Everything signs with the mainnet domain by default, and a testnet node rejects that with
`invalid_signature`. For testnet use `new TransactionBuilder(seed, { network: NetworkType.TESTNET })`,
`TransactionBuilder.signCall(seed, call, NetworkType.TESTNET)`,
`createContract(abi).connect(seed, NetworkType.TESTNET)`,
`signContractCall(seed, call, NetworkType.TESTNET)`,
`buildAndSignRaw(pk, sk, contract, method, args, NetworkType.TESTNET)` or
`signUnsigned(unsignedTx, sk, NetworkType.TESTNET)`. `txDstForNetwork(network)` returns the tag.
The testnet faucet (`TESTNET_FAUCET_URL`) gives 100 AMA per claim, once every 24 hours per IP.

### Reading Contract State

`/api/contract/get_prefix` answers with VecPack binary pages of `{ rows, cursor }` (at most 1,000
rows each). `contract.getPrefixEntries()` follows the cursor and returns every row as raw bytes,
with the queried prefix stripped from each key. The node rejects prefixes shorter than 8 bytes.
`contract.getPrefix()` parses the body as text and cannot read it.

```typescript
import { AmadeusSDK, buildOwnerVaultsKeyPrefix } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()

// Prefix bytes, or a plain string sent as UTF-8 (not Base58)
const entries = await sdk.contract.getPrefixEntries(buildOwnerVaultsKeyPrefix('5Kd3N...'))
for (const [key, value] of entries) {
	console.log(new TextDecoder().decode(key), value.length, 'bytes')
}
```

Making your own HTTP calls, `readAllPrefixPages()` runs the paging loop:

```typescript
import {
	buildOwnerVaultsKeyPrefix,
	prefixPagePath,
	readAllPrefixPages
} from '@amadeus-protocol/sdk'

const apiBaseUrl = 'https://mainnet-rpc.ama.one/api'
const prefix = buildOwnerVaultsKeyPrefix('5Kd3N...')

const entries = await readAllPrefixPages(async (cursor) => {
	const response = await fetch(apiBaseUrl + prefixPagePath(cursor), {
		method: 'POST',
		body: new Uint8Array(prefix)
	})
	if (!response.ok) throw new Error(`get_prefix failed: HTTP ${response.status}`)
	return response.arrayBuffer()
})
```

It throws on a page that does not decode, on a repeated cursor, or past `maxPages` (default 50),
instead of returning a cut-off list.

### Staking (LockupVault)

Amadeus staking is the `LockupVault` contract (`bic:lockup_vault:`): AMA locked for a tier
duration, optionally backing a validator, and earning an APY fixed when the vault is created. Not to be
confused with `Lockup` (vesting) or `LockupPrime` (PRIME points).

```typescript
import { AmadeusSDK, flatToAma } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const position = await sdk.staking.getPosition('5Kd3N...')

console.log(position.totalStaked) // AMA staked = principal + yield compounded into the vaults
console.log(position.totalAccrued) // yield compounded so far
console.log(position.weightedApyPercent) // stake-weighted average APY
console.log(position.vaultCount, position.nextMatureEpoch)

for (const vault of position.vaults) {
	console.log(vault.index, vault.tier, flatToAma(vault.totalFlat), vault.validator)
}
```

- `sdk.staking.getPosition(publicKey, options?)`: vaults plus rolled-up totals
- `sdk.staking.getVaults(publicKey, options?)`: just the vaults
- `sdk.staking.getAllVaults(options?)`: every vault on the chain (explorer-style views)
- `sdk.staking.getValidatorCommissions(options?)`: commission per validator, epoch-resolved
- `sdk.staking.getCurrentEpoch()`: epoch from the chain height

Pass `{ currentEpoch }` across several calls so they resolve against one epoch and skip the extra
round trip. Amounts ending in `Flat` are atomic `bigint`s, because real positions exceed `2^53`
atomic units: convert them with `flatToAma()`, not `Number(...) / 1e9` or `fromAtomicAma()`.

The building blocks are exported for callers that own their HTTP layer:
`buildOwnerVaultsKeyPrefix`, `readAllPrefixPages`, `prefixPagePath`, `decodeContractStatePage`,
`decodeContractState`, `parseLockupVaultEntries`, `summarizeLockupVaults`, `epochFromHeight`,
`flatToAma`.

### Serialization

```typescript
import { encode, decode } from '@amadeus-protocol/sdk'

// Encode data to canonical VecPack bytes
const encoded = encode({ foo: 'bar', count: 42, items: [1, 2, 3] })

// Decode back: a Map with byte-string keys, integers as bigint
const decoded = decode(encoded)
```

### Token Conversions

```typescript
import { toAtomicAma, fromAtomicAma, flatToAma } from '@amadeus-protocol/sdk'

const atomic = toAtomicAma(1.5) // 1500000000 (also accepts '1.5')
const ama = fromAtomicAma(1500000000) // 1.5
const large = flatToAma(40_414_833_934_371_491n) // bigint-safe
```

`fromAtomicAma()` returns 0 for 0 and throws for negative values, values between 0 and 1, and
values above `Number.MAX_SAFE_INTEGER`; use `flatToAma()` for `bigint` amounts. `toAtomicAma()` is
exact for up to 9 decimals and rounds anything finer (`toAtomicAma('1.0000000005')` is
`1000000001`), so check user input with `validateAmount()` first.

### Mnemonics and account derivation

```typescript
import { generateMnemonic, validateMnemonic, mnemonicToSeedBase58 } from '@amadeus-protocol/sdk'

// Generate a 12-word mnemonic
const mnemonic = generateMnemonic()

if (validateMnemonic(mnemonic)) {
	// Base58 seed for TransactionBuilder (EIP-2333 derivation)
	const seedBase58 = mnemonicToSeedBase58(mnemonic)
}
```

One phrase can open **two different accounts**, depending on how it was derived:

| Derivation | How the seed is derived                                       | Produced by                                                              |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `eip2333`  | EIP-2333 BLS12-381 along `m/12381'/36969'/0'/0'/0'`           | `mnemonicToSeedBase58` in SDK 1.4.0+, hub, Prime Hub, cli-wallet         |
| `legacy`   | The raw 64-byte BIP39 seed, used directly as the Amadeus seed | `mnemonicToSeedBase58` in SDK 1.3.0 and earlier, and wallets built on it |

`mnemonicToSeedBase58` always returns the `eip2333` seed. To recover a wallet that may have been
created with the legacy derivation, derive both candidates:

```typescript
import { mnemonicToCandidateKeypairs, validateMnemonic } from '@amadeus-protocol/sdk'

const mnemonic = 'your twelve word recovery phrase ...'

// Candidates skip the checksum, so validate first: a typo still derives two wrong accounts
if (!validateMnemonic(mnemonic)) throw new Error('Invalid recovery phrase')

const [standard, legacy] = mnemonicToCandidateKeypairs(mnemonic)
// standard.derivation === 'eip2333', legacy.derivation === 'legacy'
console.log(standard.publicKey, legacy.publicKey)
```

When you already know the address (for example, copied from the wallet), resolve the matching
candidate directly. It trims the address and throws on an invalid phrase:

```typescript
import { TransactionBuilder, resolveCandidateForAddress } from '@amadeus-protocol/sdk'

const mnemonic = 'your twelve word recovery phrase ...'
const walletAddress = '5Kd3N...'

const candidate = resolveCandidateForAddress(mnemonic, walletAddress)
if (!candidate) throw new Error('This phrase does not open that address')

// candidate.seed signs as walletAddress, whichever derivation created it
const builder = new TransactionBuilder(candidate.seed)
```

#### Importing a phrase into a wallet

`resolveMnemonicImport` probes both candidates and opens one only when one has history and the
other is confirmed empty, or both are confirmed empty (standard wins). Otherwise (both have
history, or any probe is unknown) it reports that the user must choose. Always show the other
address too. `addressHasActivity` is the default probe: it checks current balances (including
PRIME) and transactions sent or received, and answers `'unknown'` rather than `'inactive'` when a
request fails or times out (8 s by default). Pass the same API base URL the rest of your app
uses; unlike `AmadeusSDK`, it keeps any path prefix.

```typescript
import { addressHasActivity, resolveMnemonicImport, validateMnemonic } from '@amadeus-protocol/sdk'

const mnemonic = 'your twelve word recovery phrase ...'
if (!validateMnemonic(mnemonic)) throw new Error('Invalid recovery phrase')

const apiBaseUrl = 'https://mainnet-rpc.ama.one/api'
const result = await resolveMnemonicImport(mnemonic, (address) =>
	addressHasActivity(apiBaseUrl, address)
)

if (result.needsChoice) {
	// reason is 'both-active' or 'check-failed': let the user pick from result.candidates
} else {
	// reason is 'single-active' or 'none-active': open result.chosen, still showing the other
}
```

To label an account that was saved with its phrase but without a recorded derivation, use
`derivationForSeed(mnemonic, seed)`. It returns `'eip2333'`, `'legacy'` or `null` (also for a
malformed phrase, so it never throws).

### Encoding Utilities

```typescript
import { toBase58, fromBase58, uint8ArrayToBase64, base64ToUint8Array } from '@amadeus-protocol/sdk'

// Base58
const encoded = toBase58(new Uint8Array([1, 2, 3]))
const decoded = fromBase58(encoded)

// Base64
const base64 = uint8ArrayToBase64(new Uint8Array([1, 2, 3]))
const bytes = base64ToUint8Array(base64)
```

### Password-Based Encryption

```typescript
import { encryptWithPassword, decryptWithPassword } from '@amadeus-protocol/sdk'

// Encrypt sensitive data (e.g., a seed)
const encrypted = await encryptWithPassword('sensitive wallet data', 'my-password')
// { encryptedData, iv, salt }, all Base64

// Throws 'Decryption failed. Incorrect password or corrupted data.' on a wrong password
const decrypted = await decryptWithPassword(encrypted, 'my-password')
```

## API Reference

The method-by-method reference is in [docs/API.md](./docs/API.md), and task-oriented examples are
in [docs/GUIDE.md](./docs/GUIDE.md). The summary below lists every export group.

### Constants

- `AMADEUS_PUBLIC_KEY_BYTE_LENGTH`: Byte length of a public key (48)
- `AMADEUS_SEED_BYTE_LENGTH`: Byte length of a seed (64)
- `AMA_TOKEN_DECIMALS`: Decimal places (9)
- `AMA_TOKEN_DECIMALS_MULTIPLIER`: Multiplier for conversions (10^9)
- `MIN_TRANSFERABLE_AMOUNT`: Smallest amount in AMA (1 atomic unit)
- `AMA_TRANSFER_FEE`: Conservative balance reserve for a standard transfer, in AMA (0.02). Not
  a flat fee: the chain locks a 0.01 AMA budget per transaction, charges actual usage (well under
  0.01 AMA for a transfer) and refunds the rest
- `EXPLORER_URL`: Default explorer URL (`https://explorer.ama.one`)
- `NODE_API_URL`: Default node API URL (`https://mainnet-rpc.ama.one/api`)
- `DEFAULT_TIMEOUT`: Default request timeout in ms (30000)
- `SDK_VERSION`: Package version

### Networks

- `NetworkType`: `MAINNET` (`'mainnet'`), `TESTNET` (`'testnet'`), `CUSTOM` (`'custom'`)
- `NETWORK_URLS`: RPC host per network (no `/api` suffix)
- `NETWORK_EXPLORER_URLS`, `NETWORK_CONFIGS` (`{ rpcUrl, explorerUrl }`)
- `TESTNET_FAUCET_URL`: `https://mcp.ama.one/testnet-faucet`

### API Client

- `new AmadeusSDK(config?)`: `config.baseUrl`, `config.timeout`, `config.headers`
- Modules: `sdk.chain`, `sdk.wallet`, `sdk.transaction`, `sdk.contract`, `sdk.epoch`, `sdk.peer`,
  `sdk.proof`, `sdk.staking`
- `sdk.getConfig()`, `sdk.setBaseUrl(url)`, `sdk.setHeaders(headers)`, `sdk.cancel()` (aborts
  every in-flight request), `AmadeusSDK.getVersion()`
- `sdk.client`: the underlying `AmadeusClient` (`get`, `post`, `postBinary`)
- `new MetricsAPI({ baseUrl })`: public activity metrics, see [docs/PUBLIC-METRICS.md](./docs/PUBLIC-METRICS.md)

### Serialization

- `encode(term: SerializableValue): Uint8Array` - Encode value to canonical format
- `decode(bytes: Uint8Array | number[]): DecodedValue` - Decode from canonical format
- `decodeContractStatePage(bytes)`: one `get_prefix` page as `{ entries, cursor }`
- `decodeContractState(bytes)`: one page's `[key, value]` pairs

### Contract State

- `readAllPrefixPages(fetchPage, { maxPages }?)`: follow `get_prefix` pages to the end
- `prefixPagePath(cursor, endpoint?)`: page path with the `?cursor=` query
- `decodeContractStateToBase64(bytes)`: one page as Base64 `[key, value]` strings
- `parseStateNumber(value)`, `parseStateString(value)`: decode stored values

### Crypto

- `generateKeypair(): KeyPair` - Generate a new keypair
- `generatePrivateKey(): Uint8Array` - Generate a random 64-byte seed
- `getPublicKey(seed64: Uint8Array): Uint8Array` - Derive public key from seed
- `derivePublicKeyFromSeedBase58(base58Seed: string): string` - Derive public key from Base58 seed
- `deriveSkAndSeed64FromBase58Seed(base58Seed64: string)` - Derive secret key and seed
- `secretKeyToSeedBase58(secretKey: Uint8Array): string` - Wrap a raw 32-byte BLS secret key into a 64-byte Base58 seed

### Mnemonics (BIP39)

- `generateMnemonic(): string` - Generate a 12-word BIP39 mnemonic
- `validateMnemonic(mnemonic: string): boolean` - Validate a BIP39 mnemonic
- `normalizeMnemonic(mnemonic: string): string` - Trim, lowercase and collapse whitespace; the form to store and compare phrases in
- `mnemonicToSeedBase58(mnemonic: string): string` - Derive the standard (`eip2333`) Base58 seed. Returned the `legacy` seed before 1.4.0
- `mnemonicToCandidateKeypairs(mnemonic: string): MnemonicCandidate[]` - Derive both candidates, `eip2333` first and `legacy` second. Does not validate the mnemonic
- `resolveCandidateForAddress(mnemonic: string, address: string): MnemonicCandidate | null` - Validate the mnemonic and return the candidate that opens `address`, or `null`
- `derivationForSeed(mnemonic: string, seed: string): HdDerivation | null` - Which derivation of the mnemonic produced `seed`, or `null`
- `resolveMnemonicImport(mnemonic: string, probeActivity: (address: string) => Promise<AddressActivity>): Promise<ResolvedMnemonicImport>` - Derive both candidates, probe each for history and pick the account to open, or report that the user must choose
- `addressHasActivity(apiBaseUrl: string, address: string, timeoutMs?: number): Promise<AddressActivity>` - `'active'`, `'inactive'` or `'unknown'` from balances and transaction history. Never throws
- `detectInputType(input: string): 'mnemonic' | 'seed'` - Whether user input looks like a 12/24-word phrase or a Base58 seed
- `encodeVaultSecret(seed, mnemonic?)`, `decodeVaultSecret(decrypted)` - Store a seed with its optional phrase

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

- `toAtomicAma(ama: number | string): number` - Convert AMA to atomic units (rounds past 9 decimals)
- `fromAtomicAma(atomicAma: number | string): number` - Convert atomic units to AMA. Returns 0 for 0; throws for negative values, values between 0 and 1, and values above `Number.MAX_SAFE_INTEGER`
- `flatToAma(flat: bigint): number` - Convert a `bigint` atomic amount to AMA

### Encryption

- `encryptWithPassword(plaintext: string, password: string): Promise<EncryptedPayload>` - Encrypt data with password (AES-GCM + PBKDF2, 100,000 iterations)
- `decryptWithPassword(payload: EncryptedPayload, password: string): Promise<string>` - Decrypt data with password
- `generateSalt(): Uint8Array` - Generate random salt (16 bytes)
- `generateIV(): Uint8Array` - Generate random IV (12 bytes)
- `deriveKey(password: string, salt: Uint8Array | ArrayBuffer, iterations?: number): Promise<CryptoKey>` - Derive AES-GCM key from password

### Transaction Building

- `TransactionBuilder` - Class for building and signing transactions (mainnet signing domain by default)
    - **Constructor:** `new TransactionBuilder(privateKey?: string, options?: { network?: NetworkType })` - Base58 seed used by the instance methods; `network` sets the signing domain
    - **ABI-driven:**
        - `contract(abi)` - Typed, signer-bound contract; each ABI function builds and signs in one step
    - **Generic instance methods:**
        - `build(contract, method, args, signerPk?): UnsignedTransactionWithHash`
        - `sign(unsignedTx, signerSk?): BuildTransactionResult`
        - `buildAndSign(contract, method, args, signerPk?, signerSk?): BuildTransactionResult`
        - `buildFromCall(call): UnsignedTransactionWithHash`
        - `buildAndSignCall(call): BuildTransactionResult`
    - **Coin transfer:**
        - `buildTransfer({ recipient, amount, symbol }): UnsignedTransactionWithHash`
        - `transfer({ recipient, amount, symbol }): BuildTransactionResult`
    - **NFT (Nft contract):**
        - `nftTransfer({ recipient, amount, collection, token }): BuildTransactionResult`
        - `nftMint({ recipient, amount, collection, token, soulbound? }): BuildTransactionResult`
        - `nftCreateCollection({ collection, soulbound?, nonfungible? }): BuildTransactionResult`
    - **Lockup / LockupPrime convenience methods:**
        - `lockupUnlock({ vaultIndex }): BuildTransactionResult`
        - `lockupPrimeLock({ amount, tier }): BuildTransactionResult` (amount in AMA)
        - `lockupPrimeUnlock({ vaultIndex }): BuildTransactionResult`
        - `lockupPrimeDailyCheckin({ vaultIndex }): BuildTransactionResult`
    - **Static methods:** `build`, `sign`, `buildAndSign`, `buildTransfer`, `signCall`, `buildFromCall`, `buildAndSignCall`, `buildSignedTransfer`, `buildSignedNft{Transfer,Mint,CreateCollection}`, `buildSignedLockupUnlock`, `buildSignedLockupPrime{Lock,Unlock,DailyCheckin}`; the signing ones take an optional last `network`

### Signing Primitives

Stateless functions behind `TransactionBuilder`. The ones that sign take an optional `network`
(default mainnet):

- `buildUnsigned(signerPk, contract, method, args)`, `buildUnsignedFromCall(signerPk, call)`
- `signUnsigned(unsignedTx, signerSk, network?)`
- `buildAndSignRaw(signerPk, signerSk, contract, method, args, network?)`
- `signContractCall(senderPrivkey, call, network?)`
- `txDstForNetwork(network?)`, `normalizeSignerSk(signerSk)`

### Contract ABIs

`as const` ABI definitions for built-in contracts. Pass any ABI to `createContract(abi)` or
`builder.contract(abi)` for fully-typed function calls.

- `LOCKUP_ABI` - `Lockup` (vesting): `unlock(vaultIndex)`
- `LOCKUP_PRIME_ABI` - `LockupPrime`: `lock(amount, tier)`, `unlock(vaultIndex)`, `daily_checkin(vaultIndex)`; tiers `7d`, `30d`, `90d`, `180d`, `365d`
- `NFT_ABI` - `Nft`: `transfer`, `mint`, `create_collection`

Builders that return a `ContractCall` (`{ contract, method, args }`):

- `buildCoinTransfer({ recipient, amount, symbol })`
- `buildNftTransfer({ recipient, amount, collection, token })`
- `buildNftMint({ recipient, amount, collection, token, soulbound? })`
- `buildNftCreateCollection({ collection, soulbound?, nonfungible? })`
- `createContract(abi).fn(params)` - generic ABI-driven builder; `.connect(privateKey, network?)` signs
- `buildContractCall(abi, fn, params)` - lower-level ABI-driven builder

### Staking (LockupVault)

- `sdk.staking.getPosition`, `getVaults`, `getAllVaults`, `getValidatorCommissions`, `getCurrentEpoch`
- Key builders: `buildOwnerVaultsKeyPrefix(publicKey)`, `buildAllVaultsKeyPrefix()`, `buildVaultKey(publicKey, index)`, `buildAllValidatorCommissionsKeyPrefix()`
- Parsers: `parseLockupVaultEntries`, `parseValidatorCommissions`, `summarizeLockupVaults`
- Helpers and constants: `flatToAma`, `epochFromHeight`, `EPOCH_INTERVAL` (100,000 blocks), `MIN_VAULT_AMOUNT_FLAT` (1,000 AMA), `VALIDATOR_MIN_STAKE_FLAT` (1,000,000 AMA), `UNLOCK_PERIOD_EPOCHS` (37 epochs, 21 days), `LOCKUP_VAULT_TIERS` (`og`, `3m`, `6m`, `12m`)

### Validation, Formatting, Explorer and Errors

- `validateAddress`, `isValidAddress`, `validateSeed`, `isValidSeed`, `validateAmount`, `isValidAmount`, `validatePassword`, `validateTokenSymbol` - return `{ valid: true }` or `{ valid: false, error }` (the `is*` forms return a boolean)
- `formatNumber`, `formatAMAAmount`, `formatBalance`, `formatBalanceWithPrivacy`, `formatShortAddress`
- `makeTransactionUrl(txHash, baseUrl?)`, `makeAddressUrl(address, baseUrl?)`, `makeExplorerUrl(type, id, baseUrl?)` - default to the mainnet explorer
- `getValidationErrorMessage(code)`, `getExecutionErrorMessage(code)`, `getTransactionErrorMessage(code)` - human-readable messages for node error codes

### Full documentation

Guides and end-to-end examples: [docs.ama.one/sdk](https://docs.ama.one/sdk/1.-introduction).

## Examples

See the [`examples/`](./examples/) directory:

- **Basic Usage** - SDK initialization, key generation, queries
- **Transaction Flow** - Building and submitting transactions
- **API Usage** - The API modules
- **Staking** - Reading a LockupVault position

```bash
npm run example:basic
npm run example:tx
npm run example:api
npm run example:staking
```

## Testing

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

API calls and input validation throw `AmadeusSDKError`:

```typescript
import { AmadeusSDK, AmadeusSDKError } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()

try {
	const { balance } = await sdk.wallet.getBalance('5Kd3N...', 'AMA')
	console.log(balance.float)
} catch (error) {
	if (error instanceof AmadeusSDKError) {
		console.error('SDK Error:', error.message)
		console.error('Status:', error.status)
		console.error('Response:', error.response)
	}
}
```

| Situation                                          | `message`                      | `status`    |
| -------------------------------------------------- | ------------------------------ | ----------- |
| The node answers with an error code                | the code, e.g. `invalid_epoch` | `400`       |
| The node answers `not_found` in a 200 body         | `Resource not found`           | `404`       |
| HTTP error status (e.g. an unknown hash or height) | `HTTP <status>: <error>`       | the status  |
| Timeout                                            | `Request timeout after <ms>ms` | `408`       |
| `sdk.cancel()`                                     | `Request cancelled`            | `0`         |
| Network failure                                    | `Request failed: <reason>`     | `0`         |
| Invalid argument (e.g. a malformed Base58 address) | a schema validation message    | `undefined` |

Local helpers that do not call the node (key derivation, `TransactionBuilder` without a key,
`resolveCandidateForAddress` with an invalid phrase, `decryptWithPassword`) throw a plain `Error`,
and so does `sdk.staking.*` for a public key that is not 48-byte Base58.

## License

MIT

## Contributing

Contributions are welcome! Please ensure all code follows the existing style and includes appropriate tests.
