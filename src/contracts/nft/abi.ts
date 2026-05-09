/**
 * Nft Smart Contract ABI
 *
 * Built-in NFT contract.
 * Source of truth: ex/native/rdb/src/consensus/bic/nft.rs
 */
export const NFT_ABI = {
	contractName: 'Nft',
	contractVersion: '1.0.0',
	abi: [
		{
			type: 'function',
			name: 'transfer',
			inputs: [
				{
					name: 'receiver',
					type: 'address',
					description: 'Recipient public key (48-byte raw bytes)'
				},
				{
					name: 'amount',
					type: 'string',
					description: 'Amount of token units to transfer (positive integer as string)'
				},
				{
					name: 'collection',
					type: 'string',
					description: 'Collection name (ASCII alphanumeric, 1-32 chars)'
				},
				{
					name: 'token',
					type: 'string',
					description: 'Token id within the collection (1-32 bytes)'
				}
			],
			outputs: [],
			stateMutability: 'nonpayable',
			description: 'Transfer NFT tokens to another account',
			requirements: [
				'receiver must be a valid public key or burn address',
				'amount must be > 0',
				'caller must hold at least `amount` tokens of (collection, token)',
				'collection must not be soulbound'
			]
		},
		{
			type: 'function',
			name: 'create_collection',
			inputs: [
				{
					name: 'collection',
					type: 'string',
					description: 'Collection name (ASCII alphanumeric, 1-32 chars)'
				},
				{
					name: 'soulbound',
					type: 'string',
					description: 'Soulbound flag — "true" to disable transfers, otherwise "false"'
				}
			],
			outputs: [],
			stateMutability: 'nonpayable',
			description: 'Create a new NFT collection owned by the caller',
			requirements: [
				'collection name must be ASCII alphanumeric, 1-32 chars',
				'collection must not already exist',
				'collection name must not be reserved'
			]
		},
		{
			type: 'function',
			name: 'mint',
			inputs: [
				{
					name: 'receiver',
					type: 'address',
					description: 'Recipient public key (48-byte raw bytes)'
				},
				{
					name: 'amount',
					type: 'string',
					description: 'Amount of token units to mint (positive integer as string)'
				},
				{
					name: 'collection',
					type: 'string',
					description: 'Collection name'
				},
				{
					name: 'token',
					type: 'string',
					description: 'Token id within the collection (1-32 bytes)'
				}
			],
			outputs: [],
			stateMutability: 'nonpayable',
			description: 'Mint new NFT tokens (only callable by the collection owner)',
			requirements: [
				'collection must exist',
				'caller must be the collection owner (view_account)',
				'token id must be 1-32 bytes',
				'amount must be > 0'
			]
		}
	],
	storage: {
		keys: [
			{
				name: 'balance',
				pattern: 'account:{pk}:nft:{collection}:{token}',
				type: 'mapping',
				description: 'Per-token NFT balance for an account',
				valueFormat: 'string',
				valueSchema: {
					type: 'string',
					format: 'i128',
					description: 'Token balance as integer string'
				}
			},
			{
				name: 'view_account',
				pattern: 'nft:{collection}:view_account',
				type: 'value',
				description: 'Owner of the collection (raw 48-byte pk)'
			},
			{
				name: 'soulbound',
				pattern: 'nft:{collection}:soulbound',
				type: 'value',
				description: 'Soulbound flag for the collection ("true" or absent)'
			}
		]
	},
	errors: []
} as const
