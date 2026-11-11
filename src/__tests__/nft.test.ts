import { describe, it, expect } from 'vitest'
import { NFT_ABI, buildNftCreateCollection, buildNftMint, buildNftTransfer } from '../contracts/nft'
import { createContract } from '../contracts/contract'
import { TransactionBuilder } from '../transaction-builder'
import { generateKeypair } from '../crypto'
import { fromBase58 } from '../encoding'
import { decode } from '../serialization'

const textBytes = (text: string): number[] => [...new TextEncoder().encode(text)]
// VecPak binary term: type 0x05, one-byte varint length, then the bytes
const binaryTerm = (bytes: number[]): number[] => [0x05, 0x01, bytes.length, ...bytes]
const pair = (key: string, value: number[]): number[] => [
	...binaryTerm(textBytes(key)),
	...binaryTerm(value)
]
const mapTerm = (pairs: number[][]): Uint8Array =>
	new Uint8Array([0x07, 0x01, pairs.length, ...pairs.flat()])

function field(map: unknown, name: string): unknown {
	const entry = [...(map as Map<Uint8Array, unknown>)].find(
		([key]) => new TextDecoder().decode(key) === name
	)
	return entry?.[1]
}

describe('Nft builders', () => {
	const recipient = generateKeypair().publicKey

	it('create_collection sends one VecPak map { collection, soulbound, nonfungible }', () => {
		const call = buildNftCreateCollection({ collection: 'CARDS', soulbound: true })

		expect(call.contract).toBe('Nft')
		expect(call.method).toBe('create_collection')
		expect(call.args).toHaveLength(1)
		expect(call.args[0]).toEqual(
			mapTerm([
				pair('soulbound', textBytes('true')),
				pair('collection', textBytes('CARDS')),
				pair('nonfungible', textBytes('false'))
			])
		)
	})

	it('create_collection encodes nonfungible when set', () => {
		const call = buildNftCreateCollection({ collection: 'UNIQUE', nonfungible: true })

		expect(call.args[0]).toEqual(
			mapTerm([
				pair('soulbound', textBytes('false')),
				pair('collection', textBytes('UNIQUE')),
				pair('nonfungible', textBytes('true'))
			])
		)
	})

	it('mint sends one VecPak map { receiver, amount, collection, token, soulbound }', () => {
		const call = buildNftMint({ recipient, amount: 3, collection: 'CARDS', token: 'ace' })

		expect(call.method).toBe('mint')
		expect(call.args).toHaveLength(1)
		expect(call.args[0]).toEqual(
			mapTerm([
				pair('token', textBytes('ace')),
				pair('amount', textBytes('3')),
				pair('receiver', [...fromBase58(recipient)]),
				pair('soulbound', textBytes('false')),
				pair('collection', textBytes('CARDS'))
			])
		)
	})

	it('mint encodes a soulbound token', () => {
		const call = buildNftMint({
			recipient,
			amount: 1n,
			collection: 'BOUND',
			token: 't1',
			soulbound: true
		})

		expect(
			new TextDecoder().decode(
				field(decode(call.args[0] as Uint8Array), 'soulbound') as Uint8Array
			)
		).toBe('true')
	})

	it('transfer keeps its four positional args', () => {
		const call = buildNftTransfer({ recipient, amount: 2, collection: 'CARDS', token: 'ace' })

		expect(call.args).toEqual([fromBase58(recipient), '2', 'CARDS', 'ace'])
	})

	it('signed mint and create_collection carry the map as their only action arg', () => {
		const { privateKey } = generateKeypair()
		const minted = TransactionBuilder.buildSignedNftMint({
			senderPrivkey: privateKey,
			recipient,
			amount: 1,
			collection: 'CARDS',
			token: 'ace'
		})
		const created = new TransactionBuilder(privateKey).nftCreateCollection({
			collection: 'CARDS'
		})

		for (const [packed, expected] of [
			[
				minted.txPacked,
				buildNftMint({ recipient, amount: 1, collection: 'CARDS', token: 'ace' })
			],
			[created.txPacked, buildNftCreateCollection({ collection: 'CARDS' })]
		] as const) {
			const action = field(field(decode(packed), 'tx'), 'action')
			expect(field(action, 'args')).toEqual(expected.args)
		}
	})

	it('keeps the NFT_ABI inputs unchanged for existing createContract callers', () => {
		const nft = createContract(NFT_ABI)

		expect(() =>
			nft.mint({ receiver: recipient, amount: '1', collection: 'CARDS', token: 'ace' })
		).not.toThrow()
		expect(() =>
			nft.create_collection({ collection: 'CARDS', soulbound: 'false' })
		).not.toThrow()
	})
})
