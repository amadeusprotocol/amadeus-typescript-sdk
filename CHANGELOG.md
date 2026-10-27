# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-10-27

### Added

- **`decodeContractStatePage(bytes)`** returns `{ entries, cursor }` for one
  `get_prefix` page. It reads the paged answer (`{rows, cursor}`, node `78b5e9c`
  onwards) and the older bare row map or empty list. Any other shape throws.
- **`readAllPrefixPages(fetchPage, { maxPages })`** follows `?cursor=` until the
  last page. It throws past `maxPages` (default 50) or on a repeated cursor,
  never returning a cut-off list.
- **`prefixPagePath(cursor, endpoint?)`** builds the page URL path.

### Fixed

- **Staked balances missing.** `decodeContractState` read the node's paged
  answer as two bad rows and threw, so `staking.*` reads failed and wallets showed
  no stake. It now decodes both shapes, and `contract.getPrefixEntries` reads
  every page.
- **Parallel requests cancelled each other.** `AmadeusClient` aborted the request
  in flight whenever a new one started and reported it as a timeout. Each request
  now has its own controller; `cancel()` aborts all of them.

## [1.6.0] - 2026-10-22

### Added

- **Dual-derivation phrase import** (`src/import-derivation.ts`), moved here from
  the extension and mobile wallets so they share one implementation:
  - **`resolveMnemonicImport(mnemonic, probeActivity)`** — derives both
    candidates, probes each address and returns a `ResolvedMnemonicImport`
    (`candidates`, `chosen`, `needsChoice`, `reason`). It opens one account only
    when the answer is unambiguous: `single-active` (one has history, the other
    is confirmed empty) or `none-active` (both confirmed empty, so the standard
    account). `both-active` and `check-failed` (any probe unknown or throwing)
    set `needsChoice` and leave `chosen` as `null`. Candidates are listed
    standard first. The probe is injected, so callers can test or replace it.
  - **`addressHasActivity(apiBaseUrl, address, timeoutMs?)`** — the default
    probe. It checks `wallet/balance_all` (includes PRIME) and
    `chain/tx_by_filter` on `arg0` and `signer`, so a funded-then-emptied
    account still counts. Any history returns `'active'`. Otherwise an HTTP
    error, network error, error payload, missing list or timeout returns
    `'unknown'`, never `'inactive'`. It never throws. Requests go to
    `${apiBaseUrl}/wallet/...` and `${apiBaseUrl}/chain/...`, keeping any path
    prefix of a custom RPC URL. Each uses its own `AmadeusClient`, so they run
    in parallel without cancelling each other, and each request, body read
    included, is aborted after `ACTIVITY_PROBE_TIMEOUT_MS` (8 s) by default.
  - Types `AddressActivity`, `CandidateWithActivity`, `ImportResolutionReason`
    and `ResolvedMnemonicImport`.
- **`normalizeMnemonic(mnemonic)`** — the canonical trimmed, lowercased,
  single-spaced form of a phrase, so wallets store and compare phrases the same
  way the SDK derives them.
- **`derivationForSeed(mnemonic, seed)`** — returns `'eip2333'` or `'legacy'` for
  the derivation of `mnemonic` that produced a stored `seed`, or `null` (also
  for a malformed phrase; it never throws). Use it for accounts saved before
  their derivation was recorded.
- **`resolveCandidateForAddress(mnemonic, address)`** — returns the
  `MnemonicCandidate` (`eip2333` or `legacy`) whose `publicKey` equals `address`,
  or `null` if neither derivation opens it. It trims the address and throws on a
  phrase that fails the BIP39 wordlist or checksum check. Use it whenever the
  expected address is known, e.g. before signing an API token as a specific
  account.

### Changed

- `validateMnemonic`, `mnemonicToSeedBase58` and `mnemonicToCandidateKeypairs`
  now collapse runs of whitespace inside the phrase (e.g. a pasted phrase with
  double spaces or line breaks). `validateMnemonic` used to reject such input,
  and the derive functions could silently derive a different key from it. The
  wallets always validated first, so no existing account changes; single-spaced
  phrases derive exactly the same keys as before.

### Fixed

- **`SDK_VERSION`** was stuck at `'1.2.0'` through 1.3.0 to 1.5.0, so
  `AmadeusSDK.getVersion()` and the `X-Client-Type` header reported the wrong
  version. It now matches `package.json`, and a test fails if they drift apart.

### Documentation

- `mnemonicToCandidateKeypairs` now states that it does not validate the
  mnemonic. Its behaviour is unchanged: call `validateMnemonic` first, or use
  `resolveCandidateForAddress`.

## [1.5.0] - 2026-10-11

### Added

- **`mnemonicToCandidateKeypairs(mnemonic)`** — derives both accounts a phrase
  can open: the standard `eip2333` candidate first, and the `legacy` (pre-1.4.0,
  raw BIP39 seed) candidate second. Each is a `MnemonicCandidate`
  (`{ derivation, seed, publicKey }`) with a vault-compatible 64-byte base58
  seed. Importers use it to open the account that has history instead of
  stranding users on an empty address. New `HdDerivation` and
  `MnemonicCandidate` types.
- **`secretKeyToSeedBase58(secretKey)`** — wraps a raw 32-byte big-endian BLS
  secret key (e.g. an EIP-2333 key exported from the hub or a Google account)
  into a 64-byte Amadeus seed that signs as that key. No vault format change.

## [1.4.0] - 2026-10-07

### BREAKING: `mnemonicToSeedBase58` derives a different account

`mnemonicToSeedBase58(mnemonic)` keeps its name and signature but now returns a
**different seed, and therefore a different address**, for the same phrase.

- **Before (≤ 1.3.0, "legacy")** — the raw 64-byte BIP39 seed was used directly
  as the Amadeus seed.
- **Now (≥ 1.4.0, "eip2333")** — the BIP39 seed goes through EIP-2333 BLS12-381
  key derivation along `m/12381'/36969'/0'/0'/0'`. The 32-byte secret key is
  embedded little-endian in the low 32 bytes of the returned 64-byte seed. This
  matches the hub, Prime Hub and cli-wallet.

Impact: a wallet that restores a phrase with 1.4.0+ opens a different address
than one created or restored with ≤ 1.3.0. Seeds already stored in a vault are
unaffected, since only re-deriving from the phrase changes the result. Wallets
that import phrases should derive both accounts with
`mnemonicToCandidateKeypairs` (1.5.0+) and open the one in use, or use
`resolveCandidateForAddress` (1.6.0+) when the expected address is known.

### Added

- Dependency-free EIP-2333 implementation (`src/eip2333.ts`), verified against
  the official spec test vectors.

### Changed

- npm publishing uses OIDC trusted publishing (no token).

## [1.3.0] - 2026-10-02

### Added

- **Network-aware transaction signing** — `signUnsigned`, `buildAndSignRaw` and
  `signContractCall` take an optional `network`. Testnet signs under its own
  domain separation tag (`..._TX_TESTNET_`), so a transaction signed for one
  network cannot be replayed on another. Mainnet and custom networks keep the
  original tag, and the default is mainnet, so existing callers are unaffected.
- **`txDstForNetwork(network?)`** and the signing primitives (`buildUnsigned`,
  `signUnsigned`, `buildAndSignRaw`, `buildUnsignedFromCall`,
  `signContractCall`, `normalizeSignerSk`) are now exported from the package
  entry point.
- **`MetricsAPI`** — typed client for the separately deployed public activity
  metrics service (`getDaily(start, end)`, UTC dates, end exclusive, at most 31
  days). See `docs/PUBLIC-METRICS.md`.
- **`chain.getMetricsBlock(height)`** — canonical rooted transaction evidence for
  a block (`MetricsBlockResponse`). Timestamps are intentionally unavailable,
  and node seen-time is exposed as optional metadata.

### Changed

- The publish workflow now publishes to npm automatically when a merge to `main`
  changes the `package.json` version.

## [1.2.0] - 2026-07-31

### Added

#### Staking (`LockupVault`)

New `contracts/lockup-vault` module and `sdk.staking` API for reading an account's
staking position. Amadeus staking is the `bic:lockup_vault:` contract — AMA locked
for a tier duration, backing a validator, earning a locked-in APY. This is distinct
from the existing `Lockup` (`bic:lockup:`, vesting) and `LockupPrime`
(`bic:lockup_prime:`, points) modules, which are unchanged.

- **`sdk.staking.getPosition(pk, opts?)`** — every vault owned by an account plus the
  rolled-up `StakingSummary`: total staked, principal, accrued, vault counts by
  lifecycle state, stake-weighted APY, estimated epoch/annual yield, next maturity
  epoch, and stake per backing validator.
- **`sdk.staking.getVaults`**, **`getAllVaults`**, **`getValidatorCommissions`**,
  **`getCurrentEpoch`**.
- **Building blocks** for callers that own their HTTP layer:
  `buildOwnerVaultsKeyPrefix`, `buildAllVaultsKeyPrefix`, `buildVaultKey`,
  `buildValidatorCommissionKey`, `parseLockupVaultEntry(ies)`,
  `decodeLockupVaultRecord`, `splitLockupVaultKey`, `parseValidatorCommissions`,
  `summarizeLockupVaults`, `estimateEpochYieldFlat`, `estimateYieldOverEpochs`,
  `flatToAma`, `epochFromHeight`, `daysToEpochs`, `monthsToEpochs`, and the
  consensus constants (`APY_EPOCH_DENOM`, `UNLOCK_PERIOD_EPOCHS`,
  `MIN_VAULT_AMOUNT_FLAT`, `VALIDATOR_MIN_STAKE_FLAT`, ...).
- Amounts are atomic `bigint` (`*Flat` fields). Real positions exceed `2^53` atomic
  units, so `Number(flat) / 1e9` is lossy; `flatToAma()` splits integer and
  fractional parts instead.
- Epoch-dependent fields are resolved against a reference epoch, matching the node:
  a queued validator change is not live until its epoch, and maturity / unlock are
  epoch comparisons.
- Verified against mainnet: summing every vault reproduces the node's own
  `stats.total_locked` exactly.

#### Binary contract reads

- **`contract.getPrefixEntries(prefix)`** — returns decoded `[key, value]` byte pairs.
  `/api/contract/get_prefix` answers with a VecPack binary body; the existing
  `getPrefix()` parses responses as text and cannot represent it.
- **`client.postBinary(endpoint, data)`** — POST returning the raw response body.

### Fixed

- **`decodeContractState`** threw `Expected MAP type, got object` when a prefix matched
  nothing. The node answers an empty result with an empty VecPack *list*, not an empty
  map. Empty lists and empty bodies now decode to `[]`. This was the common path for
  any account with no contract state — e.g. every wallet that has never staked.

### Changed

- **`ChainStats`** — added the fields the node returns but the type omitted:
  `total_locked`, `total_supply`, `supply_computed_at_height`, and `validators`
  (new `ChainStatsValidator`: `commission_bps`, `commission_pending`, `sols`,
  `in_validator_set`, `staked`, `staked_flat`). All optional, so existing code is
  unaffected.

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
