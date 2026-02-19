/**
 * LockupPrime Smart Contract ABI
 *
 * Standard ABI format
 * Based on: /root/node/ex/native/rdb/src/consensus/bic/lockup_prime.rs
 */
export const LOCKUP_PRIME_ABI = {
	contractName: 'LockupPrime',
	contractVersion: '1.0.0',
	abi: [
		{
			type: 'function',
			name: 'lock',
			inputs: [
				{
					name: 'amount',
					type: 'string',
					description: 'Amount in flat units (as string, must be > 1 flat unit)',
					validation: {
						min: '1',
						type: 'i128'
					}
				},
				{
					name: 'tier',
					type: 'string',
					description: 'Lock tier',
					enum: ['7d', '30d', '90d', '180d', '365d']
				}
			],
			outputs: [],
			stateMutability: 'nonpayable',
			description: 'Lock AMA tokens for a specified tier to earn PRIME points',
			requirements: [
				'amount > 1 flat unit',
				'sufficient AMA balance',
				'amount and tier must be UTF-8 encoded strings'
			],
			storage: {
				writes: [
					{
						key: 'bic:lockup_prime:vault:{caller}:{vault_index}',
						value: '{tier}-{multiplier}-{unlock_epoch}-{amount}',
						description: 'Creates a new vault entry'
					},
					{
						key: 'bic:lockup_prime:unique_index',
						operation: 'increment',
						description: 'Increments global vault index counter'
					},
					{
						key: 'bic:coin:balance:{caller}:AMA',
						operation: 'decrement',
						amount: 'amount',
						description: "Deducts AMA from caller's balance"
					}
				],
				reads: [
					{
						key: 'bic:coin:balance:{caller}:AMA',
						description: "Checks caller's AMA balance"
					}
				]
			}
		},
		{
			type: 'function',
			name: 'unlock',
			inputs: [
				{
					name: 'vaultIndex',
					type: 'string',
					description: 'Vault index to unlock (as string, e.g., "0", "1", "2")'
				}
			],
			outputs: [],
			stateMutability: 'nonpayable',
			description: 'Unlock a vault and receive PRIME points (or penalty if early)',
			requirements: ['vault must exist', 'vault must belong to caller'],
			storage: {
				reads: [
					{
						key: 'bic:lockup_prime:vault:{caller}:{vault_index}',
						value: '{tier}-{multiplier}-{unlock_epoch}-{amount}',
						description: 'Reads vault data'
					}
				],
				writes: [
					{
						key: 'bic:lockup_prime:vault:{caller}:{vault_index}',
						operation: 'delete',
						description: 'Deletes vault after unlock'
					},
					{
						condition: 'if current_epoch < unlock_epoch (early unlock)',
						writes: [
							{
								key: 'bic:coin:balance:{treasury}:AMA',
								operation: 'increment',
								amount: 'penalty (25% of amount)',
								description: 'Penalty sent to treasury'
							},
							{
								key: 'bic:lockup:vault:{caller}:{index}',
								operation: 'create',
								amount: 'disbursement (75% of amount)',
								duration: '5 epochs',
								description: 'Remaining amount locked for 5 epochs'
							}
						]
					},
					{
						condition: 'if current_epoch >= unlock_epoch (normal unlock)',
						writes: [
							{
								key: 'bic:coin:balance:{caller}:PRIME',
								operation: 'mint',
								amount: 'amount * multiplier',
								description: 'Mints PRIME points'
							},
							{
								key: 'bic:coin:balance:{caller}:AMA',
								operation: 'increment',
								amount: 'amount',
								description: 'Returns locked AMA'
							}
						]
					}
				]
			}
		},
		{
			type: 'function',
			name: 'daily_checkin',
			inputs: [
				{
					name: 'vaultIndex',
					type: 'string',
					description: 'Vault index for checkin (as string, e.g., "0", "1", "2")'
				}
			],
			outputs: [],
			stateMutability: 'nonpayable',
			description: 'Daily checkin to earn bonus PRIME points and maintain streak',
			requirements: [
				'vault must exist',
				'must be within 2-epoch checkin window',
				'vault must belong to caller'
			],
			storage: {
				reads: [
					{
						key: 'bic:lockup_prime:vault:{caller}:{vault_index}',
						value: '{tier}-{multiplier}-{unlock_epoch}-{amount}',
						description: 'Reads vault amount for bonus calculation'
					},
					{
						key: 'bic:lockup_prime:next_checkin_epoch:{caller}',
						value: 'epoch (as string)',
						description: 'Next allowed checkin epoch'
					}
				],
				writes: [
					{
						condition: 'if delta == 0 || delta == 1 (valid checkin)',
						writes: [
							{
								key: 'bic:lockup_prime:next_checkin_epoch:{caller}',
								value: 'current_epoch + 2',
								description: 'Updates next checkin epoch'
							},
							{
								key: 'bic:coin:balance:{caller}:PRIME',
								operation: 'mint',
								amount: 'unlock_amount / 100',
								description: 'Daily bonus (1% of locked amount)'
							},
							{
								key: 'bic:lockup_prime:daily_streak:{caller}',
								operation: 'increment',
								description: 'Increments streak counter'
							},
							{
								condition: 'if streak >= 30',
								writes: [
									{
										key: 'bic:lockup_prime:daily_streak:{caller}',
										value: '0',
										description: 'Resets streak after bonus'
									},
									{
										key: 'bic:coin:balance:{caller}:PRIME',
										operation: 'mint',
										amount: 'daily_bonus * 30',
										description: 'Streak bonus (30x daily bonus)'
									}
								]
							}
						]
					},
					{
						condition: 'if delta > 2 (missed checkin)',
						writes: [
							{
								key: 'bic:lockup_prime:next_checkin_epoch:{caller}',
								value: 'current_epoch + 2',
								description: 'Resets next checkin epoch'
							},
							{
								key: 'bic:lockup_prime:daily_streak:{caller}',
								value: '0',
								description: 'Resets streak to 0'
							}
						]
					}
				]
			}
		}
	],
	errors: [
		{
			name: 'invalid_args',
			code: 'INVALID_ARGS',
			description: 'Invalid number of arguments'
		},
		{
			name: 'invalid_amount',
			code: 'INVALID_AMOUNT',
			description: 'Amount must be > 1 flat unit and valid i128'
		},
		{
			name: 'invalid_tier',
			code: 'INVALID_TIER',
			description: 'Tier must be one of: 7d, 30d, 90d, 180d, 365d'
		},
		{
			name: 'insufficient_funds',
			code: 'INSUFFICIENT_FUNDS',
			description: 'Insufficient AMA balance'
		},
		{
			name: 'invalid_vault',
			code: 'INVALID_VAULT',
			description: 'Vault does not exist or does not belong to caller'
		},
		{
			name: 'invalid_multiplier',
			code: 'INVALID_MULTIPLIER',
			description: 'Invalid multiplier value in vault data'
		},
		{
			name: 'invalid_unlock_epoch',
			code: 'INVALID_UNLOCK_EPOCH',
			description: 'Invalid unlock epoch value in vault data'
		},
		{
			name: 'invalid_unlock_amount',
			code: 'INVALID_UNLOCK_AMOUNT',
			description: 'Invalid unlock amount value in vault data'
		},
		{
			name: 'invalid_next_checkin_epoch',
			code: 'INVALID_NEXT_CHECKIN_EPOCH',
			description: 'Invalid next checkin epoch value'
		}
	],
	storage: {
		keys: [
			{
				name: 'vault',
				pattern: 'bic:lockup_prime:vault:{account}:{vault_index}',
				type: 'mapping',
				description: 'Vault data for each account and vault index',
				valueFormat: '{tier}-{multiplier}-{unlock_epoch}-{amount}',
				valueSchema: {
					tier: {
						type: 'string',
						enum: ['7d', '30d', '90d', '180d', '365d']
					},
					multiplier: {
						type: 'string',
						description: 'Multiplier as string (e.g., "17", "27")',
						parseAs: 'u64'
					},
					unlock_epoch: {
						type: 'string',
						description: 'Unlock epoch as string',
						parseAs: 'u64'
					},
					amount: {
						type: 'string',
						description: 'Locked amount in flat units as string',
						parseAs: 'u64'
					}
				},
				query: {
					method: 'POST',
					endpoint: '/api/contract/get_prefix',
					prefix: 'bic:lockup_prime:vault:{account_binary}:',
					description:
						'Get all vaults for an account. Returns array of [key, value] tuples.'
				}
			},
			{
				name: 'daily_streak',
				pattern: 'bic:lockup_prime:daily_streak:{account}',
				type: 'value',
				description: 'Current daily checkin streak count',
				valueFormat: 'string (number)',
				valueSchema: {
					type: 'string',
					parseAs: 'u64',
					description: 'Streak count as string (e.g., "5", "0")'
				},
				query: {
					method: 'POST',
					endpoint: '/api/contract/get',
					key: 'bic:lockup_prime:daily_streak:{account_binary}',
					description: 'Get daily streak for an account'
				}
			},
			{
				name: 'next_checkin_epoch',
				pattern: 'bic:lockup_prime:next_checkin_epoch:{account}',
				type: 'value',
				description: 'Next epoch when checkin is allowed',
				valueFormat: 'string (number)',
				valueSchema: {
					type: 'string',
					parseAs: 'u64',
					description: 'Epoch as string (e.g., "145", "200")'
				},
				query: {
					method: 'POST',
					endpoint: '/api/contract/get',
					key: 'bic:lockup_prime:next_checkin_epoch:{account_binary}',
					description: 'Get next checkin epoch for an account'
				}
			},
			{
				name: 'unique_index',
				pattern: 'bic:lockup_prime:unique_index',
				type: 'value',
				description: 'Global vault index counter',
				valueFormat: 'string (number)',
				valueSchema: {
					type: 'string',
					parseAs: 'u64',
					description: 'Global counter as string'
				},
				query: {
					method: 'POST',
					endpoint: '/api/contract/get',
					key: 'bic:lockup_prime:unique_index',
					description: 'Get global vault index counter'
				}
			}
		]
	},
	constants: {
		tiers: {
			'7d': {
				epochs: 10,
				multiplier: 13,
				label: '7 Days'
			},
			'30d': {
				epochs: 45,
				multiplier: 17,
				label: '30 Days'
			},
			'90d': {
				epochs: 135,
				multiplier: 27,
				label: '90 Days'
			},
			'180d': {
				epochs: 270,
				multiplier: 35,
				label: '180 Days'
			},
			'365d': {
				epochs: 547,
				multiplier: 54,
				label: '365 Days'
			}
		},
		values: {
			MIN_LOCK_AMOUNT: '1',
			DAILY_BONUS_PERCENTAGE: '100',
			STREAK_BONUS_THRESHOLD: '30',
			STREAK_BONUS_MULTIPLIER: '30',
			EARLY_UNLOCK_PENALTY: '0.25',
			EARLY_UNLOCK_LOCK_DURATION: '5',
			CHECKIN_WINDOW: '2'
		}
	},
	encoding: {
		args: {
			format: 'UTF-8 encoded strings',
			description:
				'All function arguments must be UTF-8 encoded as Uint8Array using TextEncoder',
			example: {
				lock: [
					"new TextEncoder().encode('1000000000000')",
					"new TextEncoder().encode('30d')"
				]
			}
		},
		storage: {
			keys: {
				format: 'Binary (48 bytes for account)',
				description: 'Storage keys use binary account addresses, not base58'
			},
			values: {
				format: 'UTF-8 strings',
				description: 'All storage values are UTF-8 encoded strings'
			}
		}
	}
} as const
