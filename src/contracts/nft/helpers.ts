/**
 * Builder helpers for the Nft built-in contract.
 *
 * Each helper returns a `ContractCall` that can be passed to `TransactionBuilder`
 * for signing and submission. NFT amounts are integer counts (not atomic AMA), and
 * `receiver` is decoded from Base58 to raw 48-byte public key bytes.
 */

import { fromBase58 } from '../../encoding'
import { encode } from '../../serialization'
import type { ContractCall } from '../contract-call'
import type { NftTransferParams, NftMintParams, NftCreateCollectionParams } from './types'

function amountToIntegerString(amount: number | string | bigint): string {
	if (typeof amount === 'bigint') return amount.toString()
	if (typeof amount === 'string') return amount
	if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
		throw new Error(`invalid_amount: ${amount}`)
	}
	return amount.toString()
}

/**
 * Build an `Nft.transfer` ContractCall.
 */
export function buildNftTransfer(params: NftTransferParams): ContractCall {
	return {
		contract: 'Nft',
		method: 'transfer',
		args: [
			fromBase58(params.recipient),
			amountToIntegerString(params.amount),
			params.collection,
			params.token
		]
	}
}

/**
 * Build an `Nft.mint` ContractCall.
 *
 * Only callable by a collection admin. The node takes one VecPak map argument
 * `{ receiver, amount, collection, token, soulbound }`.
 */
export function buildNftMint(params: NftMintParams): ContractCall {
	return {
		contract: 'Nft',
		method: 'mint',
		args: [
			encode({
				receiver: fromBase58(params.recipient),
				amount: amountToIntegerString(params.amount),
				collection: params.collection,
				token: params.token,
				soulbound: params.soulbound ? 'true' : 'false'
			})
		]
	}
}

/**
 * Build an `Nft.create_collection` ContractCall.
 *
 * The node takes one VecPak map argument `{ collection, soulbound, nonfungible }`.
 */
export function buildNftCreateCollection(params: NftCreateCollectionParams): ContractCall {
	return {
		contract: 'Nft',
		method: 'create_collection',
		args: [
			encode({
				collection: params.collection,
				soulbound: params.soulbound ? 'true' : 'false',
				nonfungible: params.nonfungible ? 'true' : 'false'
			})
		]
	}
}
