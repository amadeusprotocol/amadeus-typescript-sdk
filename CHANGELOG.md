# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-05-09

### Fixed

End-to-end audit of every public SDK type against live mainnet responses.
All types corrected to match the actual node API. Several types were
not updated after node api updates.

#### Chain types

- **`ChainEntry`, `ChainEntryHeader`** — `entry.height`, `entry.timestamp`,
  `entry.mutations_hash`, and `entry.header_unpacked` never existed. Fields
  live under `entry.header.*` (slot, height, dr, vr, prev_hash, signer,
  root_tx, root_validator, prev_slot). Added optional
  `next_entry_hash_finality_reached` and `txs_filtered`.
- **`ChainStats`** — `total_entries` / `total_transactions` never existed.
  Replaced with the real fields: `rooted_height`, `tip_hash`, `tx_pool_size`,
  `cur_validator`, `next_validator`, `emission_for_epoch`, `circulating`,
  `total_supply_y3`, `total_supply_y30`, `burned`, `diff_bits`, `pflops`,
  `txs_per_sec`, `segment_vr_hash`.

#### Transaction types

- **`TransactionMetadata`** — added `status?: 'finalized' | string` (returned
  by `chain.getTransaction` once the tx is rooted).
- **`TransactionReceipt.result`** — now correctly typed as nullable;
  successful txs without a return value have `result: null`.
- **`TransactionResult.error`** — now correctly typed as nullable;
  successful txs have `error: null`.
- **`SubmitTransactionResponse`** — removed phantom `error` field. The SDK
  strips `error: 'ok'` and throws `AmadeusSDKError` on failure, so the
  successful response is just `{ hash }`.
- **`SubmitAndWaitTransactionResponse`** — same fix; type is now
  `{ hash, metadata, receipt }` (all required on success).

#### Contract / Epoch / Wallet types

- **`RichlistEntry`** — completely wrong. Was `{ address, balance, symbol,
  rank }`, real shape is `{ pk, symbol, flat, float }`.
- **`ValidateBytecodeResponse`** — `error` is undefined on success after the
  SDK strips `:ok`; added `logs` field.
- **`GetEmissionAddressResponse`** — removed phantom `error` field; type
  is now `{ emission_address: string | null }`.
- **`GetSolInEpochResponse`** — type is now `Record<string, never>` (success
  returns empty object; SDK throws on `invalid_epoch` / `sol_not_found`).
- **`EpochScoreSingle`** — removed phantom `error` field; type is now
  `{ score: number }`.
- **`GetAllBalancesResponse`** — dropped legacy `WalletBalances` map type
  (never returned by the node) and the optional `error` field.

#### Documentation

- **README, all 9 docs pages, `examples/api-usage.ts`, `examples/basic-usage.ts`**
  — fixed 20+ broken `if (result.error === 'ok')` patterns. The SDK strips
  the `:ok` envelope on success and throws `AmadeusSDKError` on failure, so
  this branch never executed at runtime — examples now use `try/catch`.
- All `tip.entry.height` references updated to `tip.entry.header.height`.
- `richlist[i].address`/`balance`/`rank` examples corrected to
  `richlist[i].pk`/`float`/`flat`/`symbol`.

### Migration

```diff
// Chain entry shape
- tip.entry.height
+ tip.entry.header.height

- entry.timestamp        // never existed
- entry.mutations_hash   // never existed
- entry.header_unpacked  // never existed; key is .header
+ entry.header.height, entry.header.signer, etc.

// Chain stats
- stats.total_entries        // never existed
- stats.total_transactions   // never existed
+ stats.height, stats.rooted_height, stats.burned, etc.

// Submit / submitAndWait responses (SDK throws on failure, no error field on success)
- if (result.error === 'ok') console.log(result.hash)
+ try { const { hash } = await sdk.transaction.submit(txPacked); /* … */ }
+ catch (err) { console.error(err.message) }

// Richlist entries
- richlist[i].address        → richlist[i].pk
- richlist[i].balance        → richlist[i].flat (atomic) or .float (display)
- richlist[i].rank           → use array index instead

// Single-pk epoch score
- if (result.error === 'ok') return result.score
+ const { score } = await sdk.epoch.getScore(pk)
```

If your code was already accessing `entry.header.height`, `richlist[i].pk`,
or wrapping submits in `try/catch`, no runtime change is needed — TypeScript
just agrees with reality now.

No runtime changes — `dist/*.js` behaviour is identical to 1.1.1. Only
`.d.ts` types and documentation changed. The audit covered all 29 public
SDK methods; their request/response shapes are now verified against live
mainnet (`mainnet-rpc.ama.one`).

## [1.1.1] - 2026-05-09

### Documentation

- README updated to reflect 1.1.0 features (`contract.view`, `chain.getByFilter`,
  `chain.getKpi`, `proof.getContractStateProof`, `submitAndWait { finalized }`,
  NFT support).
- ESM-only consumption note added to installation section.
- Fixed broken Signing API reference (previously listed `signTx`/`signOOB` which
  do not exist; replaced with the actual signing primitives).
- Added Mnemonics (BIP39), Contract ABIs, and Proof API sections.

No code or runtime changes — `dist/` is identical to 1.1.0.

## [1.1.0] - 2026-05-09

### Fixed

- **ESM resolution under plain Node.js** — compiled `dist/*.js` files were missing
  `.js` file extensions on relative imports, causing `ERR_MODULE_NOT_FOUND` when the
  package was consumed via raw `node` (Node 20+ ESM resolver requires explicit
  extensions). Bundlers (Vite, webpack, esbuild, Metro) were not affected. The fix
  is fully transparent to consumers — no source changes required on your side. If
  you were stuck on `1.0.8` and could not upgrade, the documented workaround was to
  run via `tsx` or any bundler.

### Added

- **`sdk.contract.view({ contract, function, args?, pk? })`** — execute a contract
  function in read-only mode against the current chain tip. Returns
  `{ success, result, logs }`. Useful for querying state through a contract's own
  logic (e.g. computed balances, vault status) without building a transaction.
- **`sdk.chain.getByFilter({ signer?, arg0?, contract?, contract_b58?, function?, limit?, sort?, cursor? })`**
  — generic transaction filtering with cursor pagination. Returns `{ cursor, txs }`.
  Replaces the need to call `getTransactionEventsByAccount` when filtering by
  contract or function across all signers.
- **`sdk.chain.getKpi()`** — protocol-level KPIs:
  `{ ama_burned, fees_paid, active_validator_keys, active_peers, block_time, total_tx, uaw }`.
- **`sdk.proof.getContractStateProof(key, value?)`** — merkle proof for a contract
  state entry. Pass `value` to additionally verify it against the proof
  (returns `result: boolean`). Foundation for light-client verification.
- **`sdk.transaction.submitAndWait(txPacked, { finalized?: boolean })`** — second
  argument is new and optional. Pass `{ finalized: true }` to wait for finality
  (consensus reached) instead of just confirmation. Default behavior is unchanged
  and backwards-compatible.
- **NFT contract support** — wrappers for the built-in `Nft` contract:
  - `NFT_ABI` — contract ABI definition
  - `buildNftTransfer`, `buildNftMint`, `buildNftCreateCollection` — standalone
    `ContractCall` builders
  - `TransactionBuilder` instance methods: `nftTransfer`, `nftMint`,
    `nftCreateCollection`
  - `TransactionBuilder` static methods: `buildSignedNftTransfer`,
    `buildSignedNftMint`, `buildSignedNftCreateCollection`

### Changed

- **Build tooling** — switched the package build from `tsc` to
  [`tsdown`](https://tsdown.dev/) (Rolldown-based, by the Vite team), with
  `unbundle: true` to preserve per-file output and tree-shaking. This is what
  fixes the ESM extension bug above. No effect on the public API or runtime
  behaviour for consumers.

## [1.0.8] - 2026-03-17

### Added

- **BIP39 mnemonic utilities** (`src/mnemonic.ts`) — generate and recover
  keypairs from human-readable seed phrases:
  - `generateMnemonic()`
  - `validateMnemonic(mnemonic)`
  - `mnemonicToSeedBase58(mnemonic)`
  - `encodeVaultSecret`, `decodeVaultSecret`, `detectInputType`
- New `@scure/bip39` runtime dependency.

## [1.0.7] - 2026-02-19

### Added

- **Lockup contract** (`src/contracts/lockup/`) — full ABI, helpers, parsers, and
  storage-key builders for the `Lockup` (vesting) built-in contract.
- **LockupPrime contract** (`src/contracts/lockup-prime/`) — full ABI, helpers,
  parsers, storage keys, and tier-aware types for `LockupPrime`.
- **Contracts module** (`src/contracts/`) — generic ABI infrastructure:
  - `abi-types.ts` — shared ABI type extractors
  - `contract.ts` / `contract-call.ts` — `createContract()` and typed
    `ContractCall` representation
  - `coin.ts` — `buildCoinTransfer()` for the native `Coin` contract
- **Signing pipeline** (`src/signing.ts`) — stateless `buildUnsigned`,
  `signUnsigned`, `signContractCall`, and `buildAndSignRaw` primitives. Both
  `TransactionBuilder` and ABI-driven `createContract().connect()` now delegate
  to these.
- **Contract state helpers** (`src/contract-state.ts`) — `parseStateNumber`,
  `parseStateString`, `decodeContractStateToBase64`.
- Comprehensive test suites for contracts, lockup, lockup-prime, transaction
  builder, contract state, and serialization (~1500 new test lines).

### Changed

- **`TransactionBuilder` rewritten** to consume the new signing primitives and
  add ABI-driven contract methods (`builder.contract(ABI).fn(...)`). All existing
  static and instance methods remain backwards-compatible.

## [1.0.6] - 2026-02-09

### Fixed

- `formatNumber` now uses `AMA_TOKEN_DECIMALS` for default fraction digits,
  matching the rest of the formatter pipeline.

## [1.0.5] - 2026-02-09

### Changed

- **Conversion precision** — `toAtomicAma` / `fromAtomicAma` reworked to handle
  edge cases (negative zero, scientific notation, trailing zeros, very small
  amounts) without precision loss.

## [1.0.4] - 2026-02-04

### Changed

- Default API base URL updated from the previous host to
  `https://mainnet-rpc.ama.one/api` across `constants.ts`, `networks.ts`,
  `sdk.ts`, and the example scripts.

## [1.0.3] - 2026-01-21

### Added

- **Explorer utilities** (`src/explorer.ts`) — `makeExplorerUrl`,
  `makeAddressUrl`, `makeTransactionUrl`, `ExplorerType`.
- **Network configs** (`src/networks.ts`) — `NETWORK_CONFIGS`, `NETWORK_URLS`,
  `NETWORK_EXPLORER_URLS`, `TESTNET_FAUCET_URL`, `NetworkType`.
- **Formatter utilities** (`src/formatters.ts`) — `formatAMAAmount`,
  `formatBalance`, `formatBalanceWithPrivacy`, `formatNumber`,
  `formatShortAddress`.
- **Transaction-error helpers** (`src/transaction-errors.ts`) — human-readable
  message lookups for validation and execution errors
  (`getTransactionErrorMessage`, `getValidationErrorMessage`,
  `getExecutionErrorMessage`).
- New constants: explorer URL, transfer fee, minimum transferable amount.

## [1.0.2] - 2025-12-15

### Added

- **`TransactionExecutionError` enum** — full set of contract-execution error
  codes (exec budget, storage budget, KV ops, WASM execution, contract-specific
  errors for Coin/Lockup/Lockup Prime/NFT, etc.).
- Expanded transaction interfaces (`Transaction`, `TransactionReceipt`,
  `TransactionMetadata`) to expose execution results, logs, and metadata.

## [1.0.1] - 2025-12-09

### Fixed

- Patch release shortly after `1.0.0` to address packaging/publish issues from
  the initial release.

## [1.0.0] - 2025-12-09

### Added

- Initial release of `@amadeus-protocol/sdk`.
- Canonical serialization (VecPack) for deterministic encoding.
- BLS12-381 cryptographic operations (key generation, signing, verification).
- Transaction building and signing utilities.
- Password-based encryption (AES-GCM with PBKDF2) for wallet data.
- Base58 and Base64 encoding/decoding utilities.
- Token amount conversion utilities (atomic units ↔ human-readable).
- Full-featured HTTP API client for Amadeus nodes:
  - Chain API (tip, stats, entries, transactions)
  - Wallet API (balances)
  - Transaction API (submit, query)
  - Contract API (bytecode validation, data queries, richlist)
  - Epoch API (validator scores, emissions)
  - Peer API (nodes, trainers, ANR)
  - Proof API (validator proofs)
- Runtime validation using Effect Schema.
- Complete TypeScript type definitions.
- Comprehensive test suite and documentation.
