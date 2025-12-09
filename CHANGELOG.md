# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-XX-XX

### Added

- Initial release of @amadeus-protocol/sdk
- Canonical serialization (VecPack) for deterministic encoding
- BLS12-381 cryptographic operations (key generation, signing, verification)
- Transaction building and signing utilities
- Password-based encryption (AES-GCM with PBKDF2) for wallet data
- Base58 and Base64 encoding/decoding utilities
- Token amount conversion utilities (atomic units ↔ human-readable)
- Full-featured HTTP API client for Amadeus nodes
  - Chain API (tip, stats, entries, transactions)
  - Wallet API (balances)
  - Transaction API (submit, query)
  - Contract API (bytecode validation, data queries, richlist)
  - Epoch API (validator scores, emissions)
  - Peer API (nodes, trainers, ANR)
  - Proof API (validator proofs)
- Runtime validation using Effect Schema
- Complete TypeScript type definitions
- Comprehensive test suite and documentation
