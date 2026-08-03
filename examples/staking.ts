/**
 * Staking Examples
 *
 * Reading an account's LockupVault position — how much it has staked, at what
 * APY, and when each vault unlocks.
 *
 * Run with: npx tsx examples/staking.ts [publicKey]
 */

import { AmadeusSDK, flatToAma, summarizeLockupVaults } from '../src/index'

const ama = (value: number) => `${value.toLocaleString('en-US', { maximumFractionDigits: 4 })} AMA`

async function stakingExamples() {
	console.log('=== Staking Examples ===\n')

	const sdk = new AmadeusSDK({
		baseUrl: 'https://mainnet-rpc.ama.one/api'
	})

	// One epoch for every call below, so they all resolve consistently and we
	// only pay for the chain-stats round trip once.
	const currentEpoch = await sdk.staking.getCurrentEpoch()
	console.log('Current epoch:', currentEpoch, '\n')

	// ========================================================================
	// An account's position
	// ========================================================================
	console.log('=== Account position ===')

	// Default to the largest staker on chain so the example shows real data.
	let publicKey = process.argv[2]
	if (!publicKey) {
		const allVaults = await sdk.staking.getAllVaults({ currentEpoch })
		const byOwner = new Map<string, bigint>()
		for (const vault of allVaults) {
			if (!vault.owner) continue
			byOwner.set(vault.owner, (byOwner.get(vault.owner) ?? 0n) + vault.totalFlat)
		}
		publicKey = [...byOwner.entries()].sort((a, b) => (b[1] > a[1] ? 1 : -1))[0]![0]
		console.log('(no public key given — using the largest staker)')
	}

	const position = await sdk.staking.getPosition(publicKey, { currentEpoch })

	console.log('Account:      ', publicKey)
	console.log('Total staked: ', ama(position.totalStaked))
	console.log('  principal:  ', ama(position.totalPrincipal))
	console.log('  accrued:    ', ama(position.totalAccrued))
	console.log('Weighted APY: ', `${position.weightedApyPercent}%`)
	console.log('Vaults:       ', position.vaultCount)
	console.log(
		'  locked / matured / unlocking:',
		position.lockedCount,
		'/',
		position.maturedCount,
		'/',
		position.unlockingCount
	)
	console.log('Est. annual yield:', ama(position.annualYield))
	console.log('Next maturity epoch:', position.nextMatureEpoch ?? '—')

	// ========================================================================
	// Per-vault detail
	// ========================================================================
	console.log('\n=== Vaults ===')

	for (const vault of position.vaults) {
		const state = vault.isUnlocking
			? `unlocking, ${vault.epochsUntilRelease} epochs to release`
			: vault.isMatured
				? 'matured — unlock available'
				: `locked, ${vault.epochsUntilMature} epochs to maturity`

		console.log(
			`  #${vault.index} ${vault.tier.padEnd(3)} ${ama(flatToAma(vault.totalFlat)).padStart(18)}` +
				`  ${(vault.rateBps / 100).toString().padStart(5)}%  ${state}`
		)
		if (vault.validator) {
			console.log(`      backing ${vault.validator}`)
		}
		if (vault.pendingValidator) {
			console.log(
				`      switching to ${vault.pendingValidator} at epoch ${vault.pendingValidatorEpoch}`
			)
		}
	}

	// ========================================================================
	// What the backing validators charge
	// ========================================================================
	console.log('\n=== Validator commissions ===')

	const commissions = await sdk.staking.getValidatorCommissions({ currentEpoch })
	for (const [validator, stakeFlat] of Object.entries(position.stakeByValidator)) {
		const commission = commissions[validator]
		const rate = commission ? `${commission.bps / 100}%` : '0% (no record)'
		const pending = commission?.pendingBps
			? ` → ${commission.pendingBps / 100}% at epoch ${commission.pendingEpoch}`
			: ''
		console.log(`  ${validator}`)
		console.log(`    staked ${ama(flatToAma(stakeFlat))}, commission ${rate}${pending}`)
	}

	// ========================================================================
	// Chain-wide totals
	// ========================================================================
	console.log('\n=== Chain-wide ===')

	const allVaults = await sdk.staking.getAllVaults({ currentEpoch })
	const chainTotal = summarizeLockupVaults(allVaults)
	const { stats } = await sdk.chain.getStats()

	console.log('Vaults on chain:  ', chainTotal.vaultCount)
	console.log('Total staked:     ', ama(chainTotal.totalStaked))
	console.log('Node total_locked:', stats.total_locked ? ama(stats.total_locked) : '—')
	console.log('Validators backed:', Object.keys(chainTotal.stakeByValidator).length)
}

stakingExamples().catch((error) => {
	console.error('Example failed:', error)
	process.exitCode = 1
})
