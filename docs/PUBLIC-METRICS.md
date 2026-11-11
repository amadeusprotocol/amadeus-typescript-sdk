# Public activity metrics

Two APIs (added in 1.3.0) expose daily activity metrics and the block evidence behind them.

- `MetricsAPI.getDaily(start, end)` reads the analytics service. The service is deployed
  separately from the node, and there is no default public endpoint: pass its origin explicitly.
- `sdk.chain.getMetricsBlock(height)` reads one block's rooted transaction evidence from a node
  that serves `/api/chain/metrics/block/{height}`. Node 1.6.5 and the public RPC
  (`https://mainnet-rpc.ama.one/api`) do not serve it and answer `404 not_found`.

```ts
import { AmadeusSDK, MetricsAPI } from '@amadeus-protocol/sdk'

const metrics = new MetricsAPI({ baseUrl: 'https://YOUR-METRICS-ORIGIN' })
const response = await metrics.getDaily('2026-01-02', '2026-01-03')
for (const day of response.days) {
	if (day.status !== 'complete') {
		console.log(day.date, day.reasons)
		continue
	}
	// new_addresses can still be null if prehistory is incomplete
	console.log(day.date, day.unique_active_addresses, day.transactions, day.new_addresses)
}

const node = new AmadeusSDK({ baseUrl: 'https://YOUR-ARCHIVAL-NODE/api' })
const evidence = await node.chain.getMetricsBlock(123)
if ('block' in evidence) {
	console.log(evidence.block.hash, evidence.block.transaction_count)
}
```

### `getDaily(start, end)`

- `start` and `end` are `YYYY-MM-DD` UTC dates; `end` is exclusive and the range is 1 to 31 days.
  Other input throws a plain `Error` before any request is made.
- The response has `chain_id`, `methodology_version`, an overall `status` and one entry per day
  in `days`. Each day has `status` (`'complete'` or `'incomplete'`), `reasons`, `blocks`,
  `transactions`, `successful_transactions`, `unique_active_addresses`, `new_addresses` and
  `source` (the height range and the time sources used).
- Incomplete counts are `null`, never a fallback zero.
- Active addresses count successful transaction signers, including bots; they do not count people
  or Hub users.
- Block UTC times come from an explicitly identified external archive, not from Amadeus consensus
  headers.

### `getMetricsBlock(height)`

- Returns `{ schema_version, chain_id, block }`. `block` has `height`, `hash`, `previous_hash`,
  `finalized`, `transaction_count` and `transactions` (`{ hash, signer, success }`).
- `block.timestamp` is always `null` (`timestamp_basis: 'unavailable'`). The optional
  `node_seen_time_ms` is the node's local insertion time, not a verified block time.
- The node's other answers (`not_finalized`, `history_pruned`, `history_missing`,
  `history_changed_or_missing`, `receipt_missing`, `invalid_height`) are thrown as
  `AmadeusSDKError` like any other node error code, so a resolved call carries `block`.
- A height that is not a non-negative safe integer throws a plain `Error` before any request.

Both clients use the normal `AmadeusClient`: only the scheme and host of `baseUrl` are used (the
paths are absolute), and failures throw `AmadeusSDKError` as described in
[Errors](./API.md#errors).
