# Public activity metrics

The analytics service is separate from the node. Configure its deployed origin
explicitly; there is no default public metrics endpoint until deployment.

```ts
import { MetricsAPI, AmadeusSDK } from '@amadeus-protocol/sdk'

const metrics = new MetricsAPI({ baseUrl: 'https://YOUR-METRICS-ORIGIN' })
const response = await metrics.getDaily('2026-01-02', '2026-01-03')
for (const day of response.days) {
	if (day.status !== 'complete') {
		console.log(day.date, day.reasons)
		continue
	}
	console.log(day.date, day.unique_active_addresses, day.transactions)
	// new_addresses can still be null if prehistory is incomplete.
}

const node = new AmadeusSDK({ baseUrl: 'https://YOUR-ARCHIVAL-NODE' })
const evidence = await node.chain.getMetricsBlock(123)
```

Ranges use UTC dates and exclusive end dates, with a 31-day maximum. Incomplete
counts are null, never a fallback zero. Active addresses count successful
transaction signers, including bots; they do not count people or Hub users.
Block UTC times come from an explicitly identified external archive, not from
Amadeus consensus headers. Node evidence therefore carries a null timestamp.
Source failures propagate through the normal client error handling.
