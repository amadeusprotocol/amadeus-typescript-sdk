# API Reference

API reference for `@amadeus-protocol/sdk` 1.7.0. For task-oriented examples see the
[Developer Guide](./GUIDE.md).

## Table of Contents

- [AmadeusSDK](#amadeussdk)
- [Errors](#errors)
- [API Modules](#api-modules)
    - [Chain](#chain-api-sdkchain)
    - [Wallet](#wallet-api-sdkwallet)
    - [Transaction](#transaction-api-sdktransaction)
    - [Contract](#contract-api-sdkcontract)
    - [Epoch](#epoch-api-sdkepoch)
    - [Peer](#peer-api-sdkpeer)
    - [Proof](#proof-api-sdkproof)
    - [Staking](#staking-api-sdkstaking)
    - [MetricsAPI](#metricsapi)
- [TransactionBuilder](#transactionbuilder)
- [Contracts and ABIs](#contracts-and-abis)
- [Signing Primitives](#signing-primitives)
- [Networks](#networks)
- [Crypto Utilities](#crypto-utilities)
- [Mnemonics](#mnemonics)
- [Encoding Utilities](#encoding-utilities)
- [Serialization and Contract State](#serialization-and-contract-state)
- [Conversion Utilities](#conversion-utilities)
- [Encryption Utilities](#encryption-utilities)
- [Validation, Formatting and Explorer Links](#validation-formatting-and-explorer-links)
- [Transaction Error Messages](#transaction-error-messages)
- [Constants](#constants)

## AmadeusSDK

Main SDK class providing access to all API modules.

### Constructor

```typescript
new AmadeusSDK(config?: AmadeusSDKConfig)
```

**Parameters:**

- `config.baseUrl` (string, optional): Node API base URL. Defaults to `NODE_API_URL`
  (`https://mainnet-rpc.ama.one/api`). Must be an `http:` or `https:` URL, or the constructor
  throws `AmadeusSDKError`.
- `config.timeout` (number, optional): Request timeout in milliseconds. Defaults to `30000`.
- `config.headers` (Record<string, string>, optional): Additional HTTP headers.

Endpoints are absolute (`/api/...`) and resolved against `baseUrl`, so only its scheme and host
are used: a path prefix such as `https://host/node1/api` is not kept.

**Example:**

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK({
	baseUrl: 'https://mainnet-rpc.ama.one/api',
	timeout: 60000
})
```

### Methods

#### `AmadeusSDK.getVersion(): string`

Static. Returns the SDK version (`SDK_VERSION`).

#### `getConfig(): AmadeusSDKConfig`

Returns the current configuration.

#### `setBaseUrl(url: string): void`

Updates the base URL. Throws `AmadeusSDKError` on an invalid URL.

#### `setHeaders(headers: Record<string, string>): void`

Merges headers into every following request.

#### `cancel(): void`

Aborts every in-flight request on this SDK instance. A call aborted before the response arrives
rejects with `AmadeusSDKError('Request cancelled')`. Since 1.7.0, concurrent requests on one instance are
independent; earlier versions aborted the request in flight whenever a new one started.

### Properties

- `sdk.chain`, `sdk.wallet`, `sdk.transaction`, `sdk.contract`, `sdk.epoch`, `sdk.peer`,
  `sdk.proof`, `sdk.staking`: the [API modules](#api-modules)
- `sdk.client`: the underlying `AmadeusClient`

### AmadeusClient

Low-level HTTP client used by every module. `new AmadeusClient(config)` takes the same config as
`AmadeusSDK`.

- `get<T>(endpoint, params?): Promise<T>`: GET with optional query parameters
- `post<T>(endpoint, data?): Promise<T>`: POST. `Uint8Array`/`ArrayBuffer` bodies are sent as
  `application/octet-stream`, other objects as JSON
- `postBinary(endpoint, data?): Promise<Uint8Array>`: POST returning the raw body, for binary
  endpoints such as `/api/contract/get_prefix`
- `getConfig()`, `setBaseUrl(url)`, `setHeaders(headers)`, `cancel()`

`get` and `post` remove the node's `error: 'ok'` field from the response and throw for any other
`error` value.

## Errors

API calls and argument validation throw `AmadeusSDKError`:

```typescript
class AmadeusSDKError extends Error {
	status?: number
	response?: Record<string, unknown>
}
```

| Situation                                          | `message`                      | `status`    |
| -------------------------------------------------- | ------------------------------ | ----------- |
| The node answers with an error code                | the code, e.g. `invalid_epoch` | `400`       |
| The node answers `not_found` in a 200 body         | `Resource not found`           | `404`       |
| HTTP error status (e.g. an unknown hash or height) | `HTTP <status>: <error>`       | the status  |
| Timeout                                            | `Request timeout after <ms>ms` | `408`       |
| `cancel()`                                         | `Request cancelled`            | `0`         |
| Network failure                                    | `Request failed: <reason>`     | `0`         |
| Invalid argument (e.g. a malformed Base58 address) | a schema validation message    | `undefined` |

`response` holds the error body: the parsed JSON object, or the body text (an HTML page's title)
when it is not JSON. The Base58 check on arguments covers the alphabet only, not the length. Helpers
that do not call the node (key derivation, `TransactionBuilder` without a key, `MetricsAPI` date
checks, `resolveCandidateForAddress` with an invalid phrase, `decryptWithPassword`) throw a plain
`Error`, and so does `sdk.staking.*` for a public key that is not 48-byte Base58.

**Example:**

```typescript
import { AmadeusSDK, AmadeusSDKError } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()

try {
	await sdk.epoch.getSolInEpoch(100, '5Kd3N...')
	console.log('Solution found')
} catch (error) {
	if (error instanceof AmadeusSDKError) {
		console.error(error.message, error.status) // e.g. 'invalid_epoch' 400
	}
}
```

## API Modules

### Chain API (`sdk.chain`)

#### `getTip(): Promise<GetTipResponse>`

Returns `{ entry }`, the latest entry. Header fields live under `entry.header`
(`height`, `slot`, `prev_hash`, `signer`, ...); `entry.hash` and `entry.tx_count` are top level.

#### `getStats(): Promise<GetStatsResponse>`

Returns `{ stats }`: `height`, `rooted_height`, `tip_hash`, `tip`, `tx_pool_size`,
`cur_validator`, `next_validator`, `emission_for_epoch`, `circulating`, `burned`,
`total_supply`, `total_locked`, `supply_computed_at_height`, `total_supply_y3`,
`total_supply_y30`, `diff_bits`, `pflops`, `txs_per_sec`, `segment_vr_hash` and
`validators` (keyed by validator public key: `commission_bps`, `commission_pending?`, `sols`,
`in_validator_set`, `staked`, `staked_flat`).

#### `getByHeight(height: number): Promise<GetByHeightResponse>`

Returns `{ entries }` at a height.

#### `getByHeightWithTxs(height: number): Promise<GetByHeightResponse>`

Same, with transactions included.

#### `getByHash(hash: string, filterOnFunction?: string): Promise<GetByHashResponse>`

Returns `{ entry }`. With `filterOnFunction`, the entry carries the matching transactions in
`txs_filtered`.

#### `getTransaction(txid: string): Promise<Transaction>`

Returns one transaction: `hash`, `signature`, `tx` (`signer`, `nonce`, `action`), `metadata`
(`entry_hash`, `entry_height`, `status`) and `receipt` (`success`, `result`, `logs`, `exec_used`).

#### `getTransactionsInEntry(entryHash: string): Promise<GetTransactionsInEntryResponse>`

Returns `{ txs }` for an entry.

#### `getByFilter(filters?: TxByFilterParams): Promise<TxByFilterResponse>`

Queries transactions by `signer`, `arg0` (usually the receiver), `contract` or `contract_b58`,
and `function`. Also takes `limit` (default 100, at most 1,000), `sort` (`'asc'` by default or
`'desc'`) and `cursor`. Returns `{ txs, cursor }`; pass `cursor` back to read the next page.

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const { txs, cursor } = await sdk.chain.getByFilter({
	signer: '5Kd3N...',
	contract: 'Coin',
	function: 'transfer',
	limit: 10,
	sort: 'desc'
})
for (const tx of txs) {
	console.log(tx.hash, tx.tx.action.function, tx.receipt.success)
}
```

#### `getTransactionEventsByAccount(account: string, filters?: TransactionFilters): Promise<GetTransactionEventsByAccountResponse>`

Transactions sent or received by an account. `filters` takes `limit`, `sort`, `cursor`,
`contract`, `function` and `type` (`TransactionEventType.SENT` or `TransactionEventType.RECEIVED`).
The node returns full transaction records (the same shape as `getByFilter`, with
`metadata.tx_event` set to `'sent'` or `'recv'`); the declared `TransactionEvent` element type
does not match that. The public RPC also answered `cursor: null` on full pages, so page with
`getByFilter` instead.

#### `getKpi(): Promise<GetKpiResponse>`

Returns `{ kpi }`: `ama_burned`, `fees_paid`, `active_validator_keys`, `active_peers`,
`block_time`, `total_tx`, `uaw`.

#### `getMetricsBlock(height: number): Promise<MetricsBlockResponse>`

Rooted transaction evidence for one block. Requires a node that serves
`/api/chain/metrics/block/{height}`; node 1.6.5 and the public RPC answer `404 not_found`.
See [PUBLIC-METRICS.md](./PUBLIC-METRICS.md).

### Wallet API (`sdk.wallet`)

#### `getBalance(address: string, symbol = 'AMA'): Promise<WalletBalance>`

Returns `{ balance: { symbol, float, flat } }`.

#### `getAllBalances(address: string): Promise<GetAllBalancesResponse>`

Returns `{ balances }`, an **array** of `{ symbol, float, flat }`.

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const { balances } = await sdk.wallet.getAllBalances('5Kd3N...')
for (const { symbol, float } of balances) {
	console.log(`${symbol}: ${float}`)
}
```

There is no wallet history method: use `sdk.chain.getByFilter({ signer })` or
`sdk.chain.getTransactionEventsByAccount(address)`.

### Transaction API (`sdk.transaction`)

#### `submit(txPacked: Uint8Array | string): Promise<SubmitTransactionResponse>`

Submits a packed transaction (bytes or Base58). Returns `{ hash }` once the node accepts it into
its pool. A rejected transaction throws `AmadeusSDKError` whose message is the node code, such as
`invalid_signature`, `invalid_tx_nonce`, `not_enough_tx_exec_balance`,
`not_enough_txpool_balance`, `tx_exceeds_budget` or `txpool_full`.

#### `submitAndWait(txPacked: Uint8Array | string, options?: SubmitAndWaitOptions): Promise<SubmitAndWaitTransactionResponse>`

Submits and waits until the transaction is included in an entry, or finalized with
`{ finalized: true }`. Returns `{ hash, metadata, receipt }`. A transaction that executed but
failed has `receipt.success === false` and the reason in `receipt.result`. The node checks every
100 ms for about 6 seconds; past that the call fails without a receipt, although the transaction
can still land, so look it up with `get(txHash)` before submitting it again.

```typescript
import {
	AmadeusSDK,
	AmadeusSDKError,
	TransactionBuilder,
	getExecutionErrorMessage
} from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const { txPacked } = new TransactionBuilder('5Kd3N...').transfer({
	recipient: '5Kd3N...',
	amount: 1.5,
	symbol: 'AMA'
})

try {
	const { hash, metadata, receipt } = await sdk.transaction.submitAndWait(txPacked, {
		finalized: true
	})
	if (!receipt.success) {
		console.error(getExecutionErrorMessage(receipt.result ?? 'unknown'))
	}
	console.log(hash, metadata.entry_height, metadata.status)
} catch (error) {
	if (error instanceof AmadeusSDKError) console.error('Rejected:', error.message)
}
```

#### `get(txid: string): Promise<Transaction>`

Same as `chain.getTransaction`.

#### `getByEntry(entryHash: string): Promise<GetTransactionsInEntryResponse>`

Same as `chain.getTransactionsInEntry`: returns `{ txs }`.

### Contract API (`sdk.contract`)

#### `get(key: Uint8Array | string): Promise<ContractDataValue>`

Reads the value stored at one contract state key.

#### `getPrefixEntries(key: Uint8Array | string): Promise<Array<[Uint8Array, Uint8Array]>>`

Reads every key under a prefix as raw `[key, value]` byte pairs, following the paged
`{ rows, cursor }` answer of `/api/contract/get_prefix` (at most 1,000 rows per page). Keys come
back with the queried prefix stripped. A string prefix is sent as UTF-8, not Base58, so a prefix
that contains a public key must be passed as bytes. Throws `AmadeusSDKError` on an empty prefix,
an HTTP error (the node rejects prefixes under 8 bytes with `prefix_too_short`) or a page that
does not decode.

```typescript
import { AmadeusSDK, buildOwnerVaultsKeyPrefix } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const entries = await sdk.contract.getPrefixEntries(buildOwnerVaultsKeyPrefix('5Kd3N...'))
for (const [key, value] of entries) {
	console.log(new TextDecoder().decode(key), value.length)
}
```

#### `getPrefix(key: Uint8Array | string): Promise<ContractDataValue[]>`

Do not use for `get_prefix`: the endpoint answers with a VecPack binary body, which this method
parses as text and mangles. Use `getPrefixEntries`.

#### `getRichlist(): Promise<GetRichlistResponse>`

Returns `{ richlist }`: the top 1,000 AMA holders, largest first, each
`{ pk, symbol, flat, float }`. The rank is the array index. The node caches the list for up to an
hour.

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const { richlist } = await sdk.contract.getRichlist()
richlist.slice(0, 10).forEach((holder, index) => {
	console.log(`#${index + 1} ${holder.pk} ${holder.float} ${holder.symbol}`)
})
```

#### `view(params: ContractViewParams): Promise<ContractViewResponse>`

Runs a function read-only against the chain tip; the node rolls back any writes. `params` is
`{ contract, function, args?, pk? }`, where `pk` is an optional 48-byte caller key. Returns
`{ success, result, logs }`. The node runs a deployed contract only when `contract` is its raw
48-byte public key; `view()` sends the `contract` string as UTF-8, so a name or a Base58 address
goes to the built-in contracts instead. There, a function that is not a built-in action answers
`{ success: false, result: 'invalid_bic_action' }` (live for `Coin` and `LockupPrime`).

#### `validateBytecode(bytecode: Uint8Array | ArrayBuffer): Promise<ValidateBytecodeResponse>`

Posts to `/api/contract/validate_bytecode`, which node 1.6.5 and the public RPC do not serve:
the call throws `AmadeusSDKError` (`HTTP 404: not_found`).

### Epoch API (`sdk.epoch`)

#### `getScore(publicKey?: string): Promise<EpochScore>`

Without a key, returns `[publicKey, score][]` for every validator. With a key, returns
`{ score }`.

#### `getAllScores(): Promise<[string, number][]>`

Every validator's `[publicKey, score]`.

#### `getValidatorScore(publicKey: string): Promise<number>`

One validator's score.

#### `getTopValidators(limit = 10): Promise<[string, number][]>`

The highest scores, sorted descending.

#### `getEmissionAddress(publicKey: string): Promise<GetEmissionAddressResponse>`

Returns `{ emission_address }` for a validator, `null` when none is set.

#### `getSolInEpoch(epoch: number, solHash: string | Uint8Array): Promise<GetSolInEpochResponse>`

Resolves to `{}` when the node's Bloom filter for the current epoch matches the solution hash
(false positives are possible). Otherwise throws `AmadeusSDKError` with message `sol_not_found`,
or `invalid_epoch` for any epoch other than the current one. Pass `solHash` as a Base58 string:
a `Uint8Array` is put in the URL as comma-separated numbers, which the node cannot decode.

### Peer API (`sdk.peer`)

Each method returns a wrapper object:

| Method                  | Returns                            |
| ----------------------- | ---------------------------------- |
| `getNodes()`            | `{ nodes: PeerInfo[] }`            |
| `getTrainers()`         | `{ trainers: PeerInfo[] }`         |
| `getRemovedTrainers()`  | `{ removed_trainers: PeerInfo[] }` |
| `getANRs()`             | `{ anrs: ANRInfo[] }`              |
| `getANRValidators()`    | `{ anrs: ANRInfo[] }`              |
| `getANRByPk(publicKey)` | `{ anr: ANRInfo \| null }`         |

```typescript
import { AmadeusSDK } from '@amadeus-protocol/sdk'

const sdk = new AmadeusSDK()
const { nodes } = await sdk.peer.getNodes()
nodes.forEach((node) => console.log(node.pk, node.version, node.rooted_height))
```

### Proof API (`sdk.proof`)

#### `getContractStateProof(key: Uint8Array | string, value?: Uint8Array | string): Promise<ContractStateProof>`

Merkle proof for a contract state key (bytes, or a Base58 string). On node 1.6.5 the body is
`{ entry_height, entry_hash, root_contractstate, proofs: [{ key, namespace, proof }] }`, which
differs from the declared `ContractStateProof` type, so read the fields you need defensively.
Passing `value` requests `/api/proof/contractstate/{key}/{value}`, which node 1.6.5 does not
serve.

#### `getValidators(entryHash: string): Promise<ProofValidators>`

Requests `/api/proof/validators/{entryHash}`, which node 1.6.5 and the public RPC do not serve
(`HTTP 404: not_found`).

### Staking API (`sdk.staking`)

Reads `LockupVault` staking positions (`bic:lockup_vault:`). Not to be confused with `Lockup`
(vesting) or `LockupPrime` (PRIME points).

#### `getPosition(publicKey: string | Uint8Array, options?: StakingQueryOptions): Promise<StakingPosition>`

The account's vaults plus the rolled-up `StakingSummary`: `totalStaked`, `totalPrincipal`,
`totalAccrued` (AMA numbers, with `*Flat` bigint twins), `vaultCount`, `lockedCount`,
`maturedCount`, `unlockingCount`, `releasableCount`, `weightedApyBps`, `weightedApyPercent`,
`epochYieldFlat`, `annualYieldFlat`, `annualYield`, `nextMatureEpoch` and `stakeByValidator`.
Also `vaults` and the `epoch` the position was resolved against.

#### `getVaults(publicKey, options?): Promise<LockupVaultEntry[]>`

The account's vaults, ordered by index. Each has `index`, `tier`, `principalFlat`,
`accruedFlat`, `totalFlat`, `rateBps`, `createdEpoch`, `matureEpoch`, `validator`,
`pendingValidator`, `isMatured`, `isUnlocking`, `isReleasable`, `epochsUntilMature`,
`epochsUntilRelease` and more.

#### `getAllVaults(options?): Promise<LockupVaultEntry[]>`

Every vault on the chain, with `owner` set.

#### `getValidatorCommissions(options?): Promise<Record<string, ValidatorCommission>>`

Commission per validator (`bps`, `pendingBps`, `pendingEpoch`), keyed by validator public key.

#### `getCurrentEpoch(): Promise<number>`

`epochFromHeight(stats.height)` from `chain.getStats()`.

`options.currentEpoch` pins the reference epoch, so several calls resolve consistently and skip
the extra request. `*Flat` amounts are `bigint`: convert with `flatToAma()`.

### MetricsAPI

Client for the separately deployed public activity metrics service. It is not part of
`AmadeusSDK`; construct it with the service origin.

#### `new MetricsAPI(config: AmadeusSDKConfig & { baseUrl: string })`

#### `getDaily(start: string, end: string): Promise<DailyActivityResponse>`

`YYYY-MM-DD` UTC dates, `end` exclusive, 1 to 31 days. See [PUBLIC-METRICS.md](./PUBLIC-METRICS.md).

## TransactionBuilder

Builds and signs transactions. Every signing method uses the **mainnet** signing domain; to sign
for testnet, use the [signing primitives](#signing-primitives) with `NetworkType.TESTNET`.

On mainnet (node 1.6.5) the `Lockup`, `LockupPrime` and `Nft` built-in contracts are disabled: a
call to them is included, but its receipt fails with `invalid_bic_action`. They run on testnet
only, so the `lockup*`, `nft*` and `LOCKUP_ABI`/`LOCKUP_PRIME_ABI`/`NFT_ABI` calls need testnet
signing.

### Constructor

```typescript
new TransactionBuilder(privateKey?: string)
```

- `privateKey` (string, optional): Base58 64-byte seed. Instance methods that sign need it,
  unless you pass the keys explicitly.

All signing methods return `BuildTransactionResult`: `{ txHash: string, txPacked: Uint8Array }`.
Build methods return `UnsignedTransactionWithHash`: `{ tx, hash }`.

### ABI-driven

#### `contract(abi): SignedContract<TAbi>`

Returns an object with one method per ABI function. Each method takes the ABI inputs as strings
and builds and signs in one step. Throws if the builder has no private key.

```typescript
import { TransactionBuilder, LOCKUP_PRIME_ABI, toAtomicAma } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder('5Kd3N...')
const { txHash, txPacked } = builder
	.contract(LOCKUP_PRIME_ABI)
	.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })
```

### Instance methods

| Method                                                       | Returns                       |
| ------------------------------------------------------------ | ----------------------------- |
| `build(contract, method, args, signerPk?)`                   | `UnsignedTransactionWithHash` |
| `sign(unsignedTx, signerSk?)`                                | `BuildTransactionResult`      |
| `buildAndSign(contract, method, args, signerPk?, signerSk?)` | `BuildTransactionResult`      |
| `buildFromCall(call)`                                        | `UnsignedTransactionWithHash` |
| `buildAndSignCall(call)`                                     | `BuildTransactionResult`      |
| `buildTransfer({ recipient, amount, symbol })`               | `UnsignedTransactionWithHash` |
| `transfer({ recipient, amount, symbol })`                    | `BuildTransactionResult`      |
| `nftTransfer({ recipient, amount, collection, token })`      | `BuildTransactionResult`      |
| `nftMint({ recipient, amount, collection, token })`          | `BuildTransactionResult`      |
| `nftCreateCollection({ collection, soulbound? })`            | `BuildTransactionResult`      |
| `lockupPrimeLock({ amount, tier })`                          | `BuildTransactionResult`      |
| `lockupPrimeUnlock({ vaultIndex })`                          | `BuildTransactionResult`      |
| `lockupPrimeDailyCheckin({ vaultIndex })`                    | `BuildTransactionResult`      |
| `lockupUnlock({ vaultIndex })`                               | `BuildTransactionResult`      |

- `args` for `build`/`buildAndSign` are passed as is: the `Coin` contract expects the recipient
  as raw bytes (`fromBase58(...)`) and the amount as an atomic string (`toAtomicAma(...).toString()`).
- `transfer`/`buildTransfer` take `amount` in AMA and convert it.
- `lockupPrimeLock` takes `amount` in AMA; `tier` is `'7d'`, `'30d'`, `'90d'`, `'180d'` or `'365d'`.
- NFT `amount` is an integer count, not atomic AMA.

```typescript
import { TransactionBuilder } from '@amadeus-protocol/sdk'

const builder = new TransactionBuilder('5Kd3N...')

const unsignedTx = builder.buildTransfer({ recipient: '5Kd3N...', amount: 1.5, symbol: 'AMA' })
console.log('Nonce:', unsignedTx.tx.nonce)
const { txHash, txPacked } = builder.sign(unsignedTx)
```

### Static methods

| Method                                                                                                                        | Returns                       |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `build(signerPk, contract, method, args)`                                                                                     | `UnsignedTransactionWithHash` |
| `sign(unsignedTx, signerSk)`                                                                                                  | `BuildTransactionResult`      |
| `buildAndSign(signerPk, signerSk, contract, method, args)`                                                                    | `BuildTransactionResult`      |
| `buildTransfer({ recipient, amount, symbol }, signerPk)`                                                                      | `UnsignedTransactionWithHash` |
| `buildSignedTransfer({ senderPrivkey, recipient, amount, symbol })`                                                           | `BuildTransactionResult`      |
| `signCall(senderPrivkey, call)`                                                                                               | `BuildTransactionResult`      |
| `buildFromCall(call, signerPk)`                                                                                               | `UnsignedTransactionWithHash` |
| `buildAndSignCall(signerPk, signerSk, call)`                                                                                  | `BuildTransactionResult`      |
| `buildSignedNftTransfer`, `buildSignedNftMint`, `buildSignedNftCreateCollection`                                              | `BuildTransactionResult`      |
| `buildSignedLockupUnlock`, `buildSignedLockupPrimeLock`, `buildSignedLockupPrimeUnlock`, `buildSignedLockupPrimeDailyCheckin` | `BuildTransactionResult`      |

The `buildSigned*` methods take the instance method's params plus `senderPrivkey`. `signerSk`
accepts a Base58 seed or a secret key (`Uint8Array`), as returned by
`deriveSkAndSeed64FromBase58Seed`.

The nonce is `Date.now() * 1_000_000`, generated when the transaction is built.

## Contracts and ABIs

### `createContract(abi): TypedContract<TAbi>`

Returns one method per ABI function; each returns a `ContractCall` (`{ contract, method, args }`).
`.connect(privateKey)` returns a version whose methods sign (mainnet domain). Missing params and
values outside an input's `enum` throw.

```typescript
import {
	TransactionBuilder,
	createContract,
	LOCKUP_PRIME_ABI,
	toAtomicAma
} from '@amadeus-protocol/sdk'

const lockupPrime = createContract(LOCKUP_PRIME_ABI)
const call = lockupPrime.lock({ amount: toAtomicAma(100).toString(), tier: '30d' })
const { txHash, txPacked } = TransactionBuilder.signCall('5Kd3N...', call)
```

### `buildContractCall(abi, functionName, params): ContractCall`

The lower-level function behind `createContract`.

### Built-in ABIs

- `LOCKUP_ABI`: `Lockup` (vesting): `unlock(vaultIndex)`
- `LOCKUP_PRIME_ABI`: `LockupPrime`: `lock(amount, tier)`, `unlock(vaultIndex)`,
  `daily_checkin(vaultIndex)`; `amount` is atomic, tiers `7d`, `30d`, `90d`, `180d`, `365d`
- `NFT_ABI`: `Nft`: `transfer(receiver, amount, collection, token)`,
  `mint(receiver, amount, collection, token)`, `create_collection(collection, soulbound)`

### Call builders

- `buildCoinTransfer({ recipient, amount, symbol })`: amount in AMA, recipient Base58
- `buildNftTransfer({ recipient, amount, collection, token })`
- `buildNftMint({ recipient, amount, collection, token })`: collection owner only
- `buildNftCreateCollection({ collection, soulbound? })`: tokens of a soulbound collection cannot
  be transferred

In node 1.6.5, `Nft.create_collection` and `Nft.mint` take a single VecPack-encoded map argument,
while `buildNftCreateCollection`, `buildNftMint` and `NFT_ABI` send positional arguments, so the
node fails those two calls with `invalid_args`. `Nft.transfer` takes positional arguments.

## Signing Primitives

Stateless functions behind `TransactionBuilder`. The signing ones take an optional `network`;
the default is mainnet. Testnet verifies signatures under its own domain separation tag, so a
transaction signed for one network is rejected (`invalid_signature`) by the other.

- `buildUnsigned(signerPk, contract, method, args): UnsignedTransactionWithHash`
- `buildUnsignedFromCall(signerPk, call): UnsignedTransactionWithHash`
- `signUnsigned(unsignedTx, signerSk, network?): BuildTransactionResult`
- `buildAndSignRaw(signerPk, signerSk, contract, method, args, network?): BuildTransactionResult`
- `signContractCall(senderPrivkey, call, network?): BuildTransactionResult`
- `txDstForNetwork(network?): string`: the domain separation tag
- `normalizeSignerSk(signerSk)`: Base58 seed or bytes to a secret key

```typescript
import { NetworkType, buildCoinTransfer, signContractCall } from '@amadeus-protocol/sdk'

const call = buildCoinTransfer({ recipient: '5Kd3N...', amount: 1, symbol: 'AMA' })
const { txHash, txPacked } = signContractCall('5Kd3N...', call, NetworkType.TESTNET)
```

## Networks

- `NetworkType`: `MAINNET = 'mainnet'`, `TESTNET = 'testnet'`, `CUSTOM = 'custom'`
- `NETWORK_URLS`: `{ mainnet: 'https://mainnet-rpc.ama.one', testnet: 'https://testnet-rpc.ama.one' }`.
  Host only: append `/api` for `AmadeusSDK`
- `NETWORK_EXPLORER_URLS`: `https://explorer.ama.one`, `https://testnet.explorer.ama.one`
- `NETWORK_CONFIGS`: `{ rpcUrl, explorerUrl }` per network
- `TESTNET_FAUCET_URL`: `https://mcp.ama.one/testnet-faucet`

## Crypto Utilities

### `generateKeypair(): KeyPair`

Generates a new BLS12-381 keypair. Returns `{ publicKey, privateKey }`, both Base58; the private
key is the 64-byte seed.

### `generatePrivateKey(): Uint8Array`

Random 64-byte seed.

### `getPublicKey(seed64: Uint8Array): Uint8Array`

48-byte public key for a 64-byte seed.

### `derivePublicKeyFromSeedBase58(base58Seed: string): string`

Base58 public key for a Base58 seed. Throws unless the seed decodes to 64 bytes.

### `deriveSkAndSeed64FromBase58Seed(base58Seed64: string): { sk: Uint8Array, seed64: Uint8Array }`

Secret key and raw seed from a Base58 seed.

### `secretKeyToSeedBase58(secretKey: Uint8Array): string`

Wraps a raw 32-byte BLS secret key (big-endian, e.g. an EIP-2333 key exported from the hub) into
a Base58 64-byte seed that signs as that key.

## Mnemonics

Since 1.4.0 one phrase can open two accounts: the standard `eip2333` account
(`m/12381'/36969'/0'/0'/0'`, shared with the hub, Prime Hub and cli-wallet) and the `legacy`
account (the raw BIP39 seed, used by SDK 1.3.0 and earlier).

- `generateMnemonic(): string`: 12 words
- `validateMnemonic(mnemonic): boolean`: wordlist and checksum, after `normalizeMnemonic`
- `normalizeMnemonic(mnemonic): string`: trimmed, lowercase, single-spaced
- `mnemonicToSeedBase58(mnemonic): string`: the `eip2333` seed
- `mnemonicToCandidateKeypairs(mnemonic): MnemonicCandidate[]`: `[eip2333, legacy]`, each
  `{ derivation, seed, publicKey }`. Does not validate the phrase
- `resolveCandidateForAddress(mnemonic, address): MnemonicCandidate | null`: the candidate that
  opens `address`. Throws on an invalid phrase
- `derivationForSeed(mnemonic, seed): 'eip2333' | 'legacy' | null`: never throws
- `resolveMnemonicImport(mnemonic, probeActivity): Promise<ResolvedMnemonicImport>`: returns
  `{ candidates, chosen, needsChoice, reason }`; `reason` is `'single-active'`, `'none-active'`,
  `'both-active'` or `'check-failed'`
- `addressHasActivity(apiBaseUrl, address, timeoutMs = 8000): Promise<'active' | 'inactive' | 'unknown'>`:
  checks balances and transactions in both directions; never throws. Keeps the path of
  `apiBaseUrl`
- `detectInputType(input): 'mnemonic' | 'seed'`
- `encodeVaultSecret(seed, mnemonic?)`, `decodeVaultSecret(decrypted)`: JSON `{ seed, mnemonic? }`,
  and plain Base58 seeds from older vaults

```typescript
import { addressHasActivity, resolveMnemonicImport, validateMnemonic } from '@amadeus-protocol/sdk'

const mnemonic = 'your twelve word recovery phrase ...'
if (!validateMnemonic(mnemonic)) throw new Error('Invalid recovery phrase')

const result = await resolveMnemonicImport(mnemonic, (address) =>
	addressHasActivity('https://mainnet-rpc.ama.one/api', address)
)
console.log(result.reason, result.chosen?.publicKey)
```

## Encoding Utilities

| Function                                                   | Description               |
| ---------------------------------------------------------- | ------------------------- |
| `toBase58(buf: Uint8Array): string`                        | Bytes to Base58           |
| `fromBase58(str: string): Uint8Array`                      | Base58 to bytes           |
| `uint8ArrayToBase64(bytes: Uint8Array): string`            | Bytes to Base64           |
| `base64ToUint8Array(base64: string): Uint8Array`           | Base64 to bytes           |
| `arrayBufferToBase64(buffer: ArrayBuffer): string`         | ArrayBuffer to Base64     |
| `base64ToArrayBuffer(base64: string): ArrayBuffer`         | Base64 to ArrayBuffer     |
| `uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer`  | Uint8Array to ArrayBuffer |
| `arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array` | View over an ArrayBuffer  |

## Serialization and Contract State

### `encode(value: SerializableValue): Uint8Array`

VecPack canonical encoding of `null`, booleans, integers (`number` or `bigint`; a fractional
number throws), strings, `Uint8Array`, arrays, plain objects and `Map`s.

### `decode(bytes: Uint8Array | number[]): DecodedValue`

Decodes VecPack bytes: strings come back as `Uint8Array`, integers as `bigint`, and objects as
`Map`s. Throws on trailing bytes.

### `decodeContractStatePage(bytes): { entries, cursor }`

Decodes one `get_prefix` page: the paged `{ rows, cursor }` answer, or the older bare map or
empty list (with `cursor: null`). Any other shape throws.

### `decodeContractState(bytes): Array<[Uint8Array, Uint8Array]>`

The entries of one page. Use `readAllPrefixPages` to read past the first 1,000 rows.

### `readAllPrefixPages(fetchPage, options?): Promise<Array<[Uint8Array, Uint8Array]>>`

Calls `fetchPage(cursor)` (`null` first) until the cursor is `null`. Throws on a page that does
not decode, a repeated cursor, or more than `options.maxPages` pages (default 50).

### `prefixPagePath(cursor, endpoint = '/contract/get_prefix'): string`

The page path with `?cursor=` after the first page. The default suits string concatenation with
an `/api` base; pass `'/api/contract/get_prefix'` for `AmadeusClient`.

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

### Other helpers

- `decodeContractStateToBase64(bytes)`: one page as Base64 `[key, value]` strings
- `parseStateNumber(value)`: digits or little-endian bytes to a number (0 when unparseable)
- `parseStateString(value)`: bytes to a UTF-8 string

## Conversion Utilities

### `toAtomicAma(ama: number | string): number`

AMA to atomic units (9 decimals). Exact for up to 9 decimals; finer input is rounded
(`toAtomicAma('1.0000000005')` is `1000000001`), so validate it with `validateAmount` first.

### `fromAtomicAma(atomicAma: number | string): number`

Atomic units to AMA. Returns 0 for 0 or `NaN`; throws for negative values, values between 0 and
1, and values above `Number.MAX_SAFE_INTEGER`.

### `flatToAma(flat: bigint): number`

`bigint` atomic amount to AMA without losing precision above `2^53`. Use it for the staking
`*Flat` fields.

## Encryption Utilities

Password-based encryption for wallet data: AES-GCM with a 256-bit key derived by PBKDF2
(100,000 iterations).

### `encryptWithPassword(plaintext: string, password: string): Promise<EncryptedPayload>`

Returns `{ encryptedData, iv, salt }`, all Base64.

### `decryptWithPassword(payload: EncryptedPayload, password: string): Promise<string>`

Throws `Error('Decryption failed. Incorrect password or corrupted data.')` on a wrong password or
corrupted payload.

```typescript
import { encryptWithPassword, decryptWithPassword } from '@amadeus-protocol/sdk'

const encrypted = await encryptWithPassword('sensitive data', 'my-password')
const decrypted = await decryptWithPassword(encrypted, 'my-password')
```

### Lower-level helpers

- `generateSalt(): Uint8Array` (16 bytes)
- `generateIV(): Uint8Array` (12 bytes)
- `deriveKey(password, salt, iterations = 100000): Promise<CryptoKey>`

## Validation, Formatting and Explorer Links

Validators return `{ valid: true }` or `{ valid: false, error }`; the `is*` forms return a boolean.

- `validateAddress(address)`, `isValidAddress(address)`: Base58 that decodes to 48 bytes
- `validateSeed(seed)`, `isValidSeed(seed)`: Base58 that decodes to 64 bytes
- `validateAmount(amount: string)`, `isValidAmount(amount)`: positive, at most 9 decimals
- `validatePassword(password, options?)`: length 8 to 128 and lower, upper, digit and special
  characters by default
- `validateTokenSymbol(symbol)`: 1 to 10 uppercase letters or digits

Formatters:

- `formatNumber(num, digits = 9)`, `formatAMAAmount(amount)` (adds ` AMA`),
  `formatBalance(amount)`, `formatBalanceWithPrivacy(amount, hide)`,
  `formatShortAddress(address, chars = 6)`

Explorer links (default base: `https://explorer.ama.one`):

- `makeTransactionUrl(txHash, baseUrl?)`: `<base>/network/tx/<hash>`
- `makeAddressUrl(address, baseUrl?)`: `<base>/network/address/<address>`
- `makeExplorerUrl(type: ExplorerType, id, baseUrl?)`

## Transaction Error Messages

- `getValidationErrorMessage(code)`: message for a code thrown by `submit`/`submitAndWait`
- `getExecutionErrorMessage(code)`: message for a failed `receipt.result`
- `getTransactionErrorMessage(code)`: tries both tables
- `TRANSACTION_VALIDATION_ERROR_MESSAGES`, `TRANSACTION_EXECUTION_ERROR_MESSAGES`,
  `TransactionValidationError`, `TransactionExecutionError`

Unknown codes fall back to a generic message that includes the code.

## Constants

| Constant                         | Value                             |
| -------------------------------- | --------------------------------- |
| `SDK_VERSION`                    | `'1.7.0'`                         |
| `NODE_API_URL`                   | `https://mainnet-rpc.ama.one/api` |
| `EXPLORER_URL`                   | `https://explorer.ama.one`        |
| `DEFAULT_TIMEOUT`                | `30000` ms                        |
| `AMADEUS_PUBLIC_KEY_BYTE_LENGTH` | `48`                              |
| `AMADEUS_SEED_BYTE_LENGTH`       | `64`                              |
| `AMA_TOKEN_DECIMALS`             | `9`                               |
| `AMA_TOKEN_DECIMALS_MULTIPLIER`  | `10 ** 9`                         |
| `MIN_TRANSFERABLE_AMOUNT`        | `1e-9` AMA (one atomic unit)      |
| `AMA_TRANSFER_FEE`               | `0.02` AMA                        |

Staking constants (`EPOCH_INTERVAL`, `MIN_VAULT_AMOUNT_FLAT`, `VALIDATOR_MIN_STAKE_FLAT`,
`UNLOCK_PERIOD_EPOCHS`, `LOCKUP_VAULT_TIERS`, ...) are exported alongside the staking helpers.
