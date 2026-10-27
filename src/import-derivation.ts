/**
 * Dual-derivation recovery-phrase import
 *
 * Since 1.4.0 one recovery phrase can open two accounts: the standard EIP-2333
 * account (`m/12381'/36969'/0'/0'/0'`, used by the hub, Prime Hub, cli-wallet
 * and current wallets) and the `legacy` raw-BIP39-seed account created by older
 * wallet builds. On import, derive both, probe the node for history, and open
 * one only when the answer is unambiguous. Otherwise the user chooses.
 */

import { AmadeusClient } from './client'
import { mnemonicToCandidateKeypairs } from './mnemonic'
import type { MnemonicCandidate } from './mnemonic'
import type { GetAllBalancesResponse, TxByFilterResponse } from './types'

/** `unknown` means at least one probe failed or timed out and none showed history. */
export type AddressActivity = 'active' | 'inactive' | 'unknown'

export interface CandidateWithActivity extends MnemonicCandidate {
	activity: AddressActivity
}

export type ImportResolutionReason =
	/** Exactly one candidate has history and the other was checked clean. */
	| 'single-active'
	/** Both were checked clean; the standard candidate is opened. */
	| 'none-active'
	| 'both-active'
	/** A probe failed, so we cannot tell which account the user means. */
	| 'check-failed'

export interface ResolvedMnemonicImport {
	/** Both candidates, standard (EIP-2333) first. */
	candidates: CandidateWithActivity[]
	/** The account to open, or `null` when the user must choose. */
	chosen: CandidateWithActivity | null
	needsChoice: boolean
	reason: ImportResolutionReason
}

/** Default per-request timeout for {@link addressHasActivity}. */
export const ACTIVITY_PROBE_TIMEOUT_MS = 8_000

type ProbeResult = 'hit' | 'empty' | 'failed'

async function probe(
	request: (client: AmadeusClient) => Promise<readonly unknown[] | undefined>,
	apiBaseUrl: string,
	timeoutMs: number
): Promise<ProbeResult> {
	let timer: ReturnType<typeof setTimeout> | undefined
	// cancel() aborts every request on a client, so each probe needs its own client.
	let client: AmadeusClient | undefined
	// The client's own timeout stops once headers arrive; cancel() also aborts the body read.
	const deadline = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => {
			client?.cancel()
			reject(new Error('Activity probe timed out'))
		}, timeoutMs)
	})
	try {
		client = new AmadeusClient({ baseUrl: apiBaseUrl, timeout: timeoutMs })
		const list = await Promise.race([request(client), deadline])
		// Only a list is a real answer; anything else is not proof of an empty account.
		if (!Array.isArray(list)) return 'failed'
		return list.length > 0 ? 'hit' : 'empty'
	} catch {
		return 'failed'
	} finally {
		clearTimeout(timer)
	}
}

/**
 * Check an address for history: current balances (`balance_all`, includes
 * PRIME) and past transactions in either direction (`tx_by_filter` on `arg0`
 * and `signer`), so a funded-then-emptied account still counts. Any history
 * wins; otherwise a single failed or timed-out request makes the answer
 * `unknown` rather than `inactive`. Never throws.
 *
 * @param apiBaseUrl - Node API base URL, path prefix included (e.g. `https://mainnet-rpc.ama.one/api`).
 *   Requests go to `${apiBaseUrl}/wallet/...` and `${apiBaseUrl}/chain/...`
 * @param address - Base58 account address
 * @param timeoutMs - Per-request timeout (default {@link ACTIVITY_PROBE_TIMEOUT_MS})
 * @returns `'active'`, `'inactive'` or `'unknown'`
 *
 * @example
 * ```ts
 * const activity = await addressHasActivity('https://mainnet-rpc.ama.one/api', address)
 * ```
 */
export async function addressHasActivity(
	apiBaseUrl: string,
	address: string,
	timeoutMs: number = ACTIVITY_PROBE_TIMEOUT_MS
): Promise<AddressActivity> {
	// Absolute URLs keep any path prefix; the client resolves '/api/...' against the origin.
	const base = apiBaseUrl.replace(/\/+$/, '')
	const txsBy = (filter: 'arg0' | 'signer') => (client: AmadeusClient) =>
		client
			.get<TxByFilterResponse>(`${base}/chain/tx_by_filter`, { [filter]: address, limit: 1 })
			.then((response) => response.txs)
	const results = await Promise.all([
		probe(
			(client) =>
				client
					.get<GetAllBalancesResponse>(
						`${base}/wallet/balance_all/${encodeURIComponent(address)}`
					)
					.then((response) => response.balances),
			base,
			timeoutMs
		),
		probe(txsBy('arg0'), base, timeoutMs),
		probe(txsBy('signer'), base, timeoutMs)
	])
	if (results.includes('hit')) return 'active'
	if (results.includes('failed')) return 'unknown'
	return 'inactive'
}

/**
 * Resolve which account a recovery phrase should open.
 *
 * - Exactly one candidate has history and the other is confirmed empty → open it.
 * - Both are confirmed empty → the standard (EIP-2333) candidate, which is what
 *   every new Amadeus wallet uses.
 * - Both have history, or any probe failed → `needsChoice`; the caller asks.
 *
 * Always show the user the other address too, so a wrong pick can be undone.
 *
 * Like {@link mnemonicToCandidateKeypairs}, this does not validate the phrase:
 * call `validateMnemonic` first.
 *
 * @param mnemonic - BIP39 mnemonic phrase
 * @param probeActivity - Probes an address for history, usually
 *   `(address) => addressHasActivity(apiBaseUrl, address)`. A probe that throws counts as `unknown`.
 * @returns Both candidates with their activity, and the one to open if unambiguous
 *
 * @example
 * ```ts
 * const result = await resolveMnemonicImport(mnemonic, (address) =>
 *   addressHasActivity(apiBaseUrl, address)
 * )
 * if (result.needsChoice) showPicker(result.candidates)
 * else openAccount(result.chosen)
 * ```
 */
export async function resolveMnemonicImport(
	mnemonic: string,
	probeActivity: (address: string) => Promise<AddressActivity>
): Promise<ResolvedMnemonicImport> {
	const candidates: CandidateWithActivity[] = await Promise.all(
		mnemonicToCandidateKeypairs(mnemonic).map(async (candidate) => ({
			...candidate,
			activity: await probeActivity(candidate.publicKey).catch(
				(): AddressActivity => 'unknown'
			)
		}))
	)
	const active = candidates.filter((candidate) => candidate.activity === 'active')
	const anyUnknown = candidates.some((candidate) => candidate.activity === 'unknown')

	if (anyUnknown) return { candidates, chosen: null, needsChoice: true, reason: 'check-failed' }
	if (active.length > 1) {
		return { candidates, chosen: null, needsChoice: true, reason: 'both-active' }
	}
	if (active.length === 1) {
		return { candidates, chosen: active[0], needsChoice: false, reason: 'single-active' }
	}
	return { candidates, chosen: candidates[0], needsChoice: false, reason: 'none-active' }
}
