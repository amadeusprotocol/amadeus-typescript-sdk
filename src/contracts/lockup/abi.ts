/**
 * Lockup Smart Contract ABI
 *
 * Standard ABI format
 * Based on: /root/node/ex/native/rdb/src/consensus/bic/lockup.rs
 */
export const LOCKUP_ABI = {
	contractName: 'Lockup',
	contractVersion: '1.0.0',
	abi: [
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
			description: 'Unlock a vault and receive locked tokens',
			requirements: [
				'vault must exist',
				'vault must belong to caller',
				'entry_height >= unlock_height'
			],
			storage: {
				reads: [
					{
						key: 'bic:lockup:vault:{caller}:{vault_index}',
						value: '{unlock_height}-{amount}-{symbol}',
						description: 'Reads vault data'
					}
				],
				writes: [
					{
						key: 'bic:lockup:vault:{caller}:{vault_index}',
						operation: 'delete',
						description: 'Deletes vault after unlock'
					},
					{
						key: 'bic:coin:balance:{caller}:AMA',
						operation: 'increment',
						amount: 'amount',
						description: 'Returns locked AMA tokens'
					}
				]
			}
		}
	],
	storage: {
		keys: [
			{
				name: 'vault',
				pattern: 'bic:lockup:vault:{account}:{index}',
				type: 'mapping',
				description: 'Lockup vault storage key',
				valueFormat: 'string',
				valueSchema: {
					type: 'string',
					format: '{unlock_height}-{amount}-{symbol}',
					description: 'Vault data format: unlock_height-amount-symbol'
				},
				query: {
					method: 'POST',
					endpoint: '/contract/get_prefix',
					prefix: 'bic:lockup:vault:{account_binary}:',
					description: 'Get all vaults for an account'
				}
			}
		]
	},
	errors: []
} as const
