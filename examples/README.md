# SDK Examples

This directory contains example code demonstrating how to use the Amadeus SDK.

## Examples

### Basic Usage (`basic-usage.ts`)

Demonstrates basic SDK functionality:

- SDK initialization
- Keypair generation
- Chain queries
- Wallet balance queries
- Transaction building
- Serialization
- Base58 encoding

**Run:**

```bash
npm run examples/basic-usage.ts
# or
tsx examples/basic-usage.ts
```

### Transaction Flow (`transaction-flow.ts`)

Complete end-to-end transaction flow:

1. Initialize SDK
2. Generate keypairs
3. Check balance
4. Build transaction
5. Verify transaction structure
6. Submit transaction
7. Wait for confirmation
8. Query transaction status

**Run:**

```bash
npm run examples/transaction-flow.ts
# or
tsx examples/transaction-flow.ts
```

### API Usage (`api-usage.ts`)

Demonstrates all API endpoints:

- Chain API
- Wallet API
- Contract API
- Epoch API
- Peer API

**Run:**

```bash
npm run examples/api-usage.ts
# or
tsx examples/api-usage.ts
```

## Usage

All examples can be imported and used in your code:

```typescript
import { basicExamples } from '@amadeus-protocol/sdk/examples/basic-usage'

await basicExamples()
```

## Environment Variables

For testing against a local node:

```bash
export TEST_NODE_URL=http://localhost:8080/api
```

## Notes

- Examples use the default public node URL
- Some examples may fail if accounts have no balance (expected)
- Replace placeholder addresses with actual addresses for real testing
