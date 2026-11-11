/**
 * Type definitions for the Nft built-in contract.
 */

/** Parameters for `Nft.transfer(receiver, amount, collection, token)` */
export interface NftTransferParams {
	/** Base58-encoded recipient address */
	recipient: string
	/** Number of token units to transfer */
	amount: number | string | bigint
	/** Collection name */
	collection: string
	/** Token id within the collection */
	token: string
}

/** Parameters for `Nft.mint({ receiver, amount, collection, token, soulbound })` */
export interface NftMintParams {
	/** Base58-encoded recipient address */
	recipient: string
	/** Number of token units to mint */
	amount: number | string | bigint
	/** Collection name */
	collection: string
	/** Token id within the collection */
	token: string
	/** Mark this token soulbound; must match the flag of an already-minted token (default false) */
	soulbound?: boolean
}

/** Parameters for `Nft.create_collection({ collection, soulbound, nonfungible })` */
export interface NftCreateCollectionParams {
	/** Collection name (ASCII alphanumeric, 1-32 chars) */
	collection: string
	/** When true, tokens cannot be transferred after minting */
	soulbound?: boolean
	/** When true, each token id can be minted once with amount 1 (default false) */
	nonfungible?: boolean
}

/** Inputs for builder convenience methods that need a private key */
export interface NftTransferInput extends NftTransferParams {
	/** Base58-encoded sender private key (seed) */
	senderPrivkey: string
}

export interface NftMintInput extends NftMintParams {
	senderPrivkey: string
}

export interface NftCreateCollectionInput extends NftCreateCollectionParams {
	senderPrivkey: string
}
