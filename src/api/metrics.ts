import { AmadeusClient } from '../client'
import type { AmadeusSDKConfig } from '../types'

export interface MetricsBlock {
	height: number
	hash: string
	previous_hash: string
	finalized: true
	timestamp: null
	timestamp_basis: 'unavailable'
	/** Local node insertion time in Unix milliseconds; not verified block UTC. */
	node_seen_time_ms?: number | null
	node_seen_time_basis?: 'local_database_insertion'
	transaction_count: number
	transactions: { hash: string; signer: string; success: boolean }[]
}

export type MetricsBlockResponse =
	| { error: 'ok'; schema_version: 1; chain_id: string; block: MetricsBlock }
	| {
			error:
				| 'not_finalized'
				| 'history_pruned'
				| 'history_missing'
				| 'history_changed_or_missing'
				| 'receipt_missing'
				| 'invalid_height'
	  }

export interface DailyActivity {
	date: string
	start: number
	end: number
	status: 'complete' | 'incomplete'
	reasons: string[]
	blocks: number | null
	transactions: number | null
	successful_transactions: number | null
	unique_active_addresses: number | null
	new_addresses: number | null
	new_addresses_status: 'complete' | 'incomplete'
	source: null | {
		from_height: number
		to_height_exclusive: number
		previous_block: { height: number; hash: string; timestamp: number } | null
		next_block: { height: number; hash: string; timestamp: number }
		timestamp_basis: 'external_archive'
		time_sources: { digest: string; url: string }[]
	}
}

export interface DailyActivityResponse {
	schema_version: 1
	chain: 'amadeus'
	chain_id: string
	methodology_version: 'amadeus-activity-v1'
	status: 'complete' | 'incomplete'
	days: DailyActivity[]
}

/** Public analytics service. Its URL is explicit because it is deployed separately from the node. */
export class MetricsAPI {
	private readonly client: AmadeusClient

	constructor(config: AmadeusSDKConfig & { baseUrl: string }) {
		this.client = new AmadeusClient(config)
	}

	/** UTC date range, end exclusive, at most 31 days. Missing coverage remains null. */
	async getDaily(start: string, end: string): Promise<DailyActivityResponse> {
		const parse = (date: string): number => {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Expected YYYY-MM-DD')
			const value = Date.parse(`${date}T00:00:00Z`)
			if (
				!Number.isFinite(value) ||
				value < 0 ||
				new Date(value).toISOString().slice(0, 10) !== date
			) {
				throw new Error('Invalid UTC date')
			}
			return value
		}
		const duration = parse(end) - parse(start)
		if (duration <= 0 || duration > 31 * 86400000)
			throw new Error('Range must be 1..31 UTC days')
		return this.client.get<DailyActivityResponse>('/v1/metrics/daily', { start, end })
	}
}
