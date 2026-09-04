import { describe, it, expect } from 'vitest'
import {
	encryptWithPassword,
	decryptWithPassword,
	generateSalt,
	generateIV,
	deriveKey,
	DEFAULT_PBKDF2_ITERATIONS
} from '../encryption'
import {
	uint8ArrayToBase64,
	base64ToUint8Array,
	arrayBufferToBase64,
	base64ToArrayBuffer
} from '../encoding'

describe('Encryption', () => {
	describe('generateSalt', () => {
		it('generates a 16-byte salt', () => {
			const salt = generateSalt()
			expect(salt).toBeInstanceOf(Uint8Array)
			expect(salt.length).toBe(16)
		})

		it('generates unique salts', () => {
			const salt1 = generateSalt()
			const salt2 = generateSalt()
			expect(salt1).not.toEqual(salt2)
		})
	})

	describe('generateIV', () => {
		it('generates a 12-byte IV', () => {
			const iv = generateIV()
			expect(iv).toBeInstanceOf(Uint8Array)
			expect(iv.length).toBe(12)
		})

		it('generates unique IVs', () => {
			const iv1 = generateIV()
			const iv2 = generateIV()
			expect(iv1).not.toEqual(iv2)
		})
	})

	describe('deriveKey', () => {
		it('derives a key from password and salt', async () => {
			const password = 'test-password'
			const salt = generateSalt()
			const key = await deriveKey(password, salt)

			expect(key).toBeInstanceOf(CryptoKey)
			expect(key.algorithm.name).toBe('AES-GCM')
		})

		it('derives different keys for different salts', async () => {
			const password = 'test-password'
			const plaintext = 'test data'
			const salt1 = generateSalt()
			const salt2 = generateSalt()
			const key1 = await deriveKey(password, salt1)
			const key2 = await deriveKey(password, salt2)

			const iv = generateIV()
			const ivBuffer = new Uint8Array(iv).buffer

			const enc1 = await crypto.subtle.encrypt(
				{ name: 'AES-GCM', iv: ivBuffer },
				key1,
				new TextEncoder().encode(plaintext)
			)
			const enc2 = await crypto.subtle.encrypt(
				{ name: 'AES-GCM', iv: ivBuffer },
				key2,
				new TextEncoder().encode(plaintext)
			)

			expect(new Uint8Array(enc1)).not.toEqual(new Uint8Array(enc2))
		})
	})

	describe('encryptWithPassword and decryptWithPassword', () => {
		it('encrypts and decrypts plaintext', async () => {
			const plaintext = 'sensitive wallet data'
			const password = 'my-secure-password'

			const encrypted = await encryptWithPassword(plaintext, password)
			const decrypted = await decryptWithPassword(encrypted, password)

			expect(decrypted).toBe(plaintext)
		})

		it('produces different encryptedData for same plaintext', async () => {
			const plaintext = 'test data'
			const password = 'password'

			const encrypted1 = await encryptWithPassword(plaintext, password)
			const encrypted2 = await encryptWithPassword(plaintext, password)

			expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData)
			expect(encrypted1.iv).not.toBe(encrypted2.iv)
			expect(encrypted1.salt).not.toBe(encrypted2.salt)
		})

		it('fails to decrypt with wrong password', async () => {
			const plaintext = 'sensitive data'
			const password = 'correct-password'
			const wrongPassword = 'wrong-password'

			const encrypted = await encryptWithPassword(plaintext, password)

			await expect(decryptWithPassword(encrypted, wrongPassword)).rejects.toThrow(
				'Decryption failed'
			)
		})

		it('handles empty string', async () => {
			const plaintext = ''
			const password = 'password'

			const encrypted = await encryptWithPassword(plaintext, password)
			const decrypted = await decryptWithPassword(encrypted, password)

			expect(decrypted).toBe(plaintext)
		})

		it('handles special characters', async () => {
			const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?'
			const password = 'p@ssw0rd!'

			const encrypted = await encryptWithPassword(plaintext, password)
			const decrypted = await decryptWithPassword(encrypted, password)

			expect(decrypted).toBe(plaintext)
		})

		it('handles unicode characters', async () => {
			const plaintext = 'Hello 世界 🌍'
			const password = 'password'

			const encrypted = await encryptWithPassword(plaintext, password)
			const decrypted = await decryptWithPassword(encrypted, password)

			expect(decrypted).toBe(plaintext)
		})
	})

	// The payload used to record no KDF parameters, so deriveKey's `iterations`
	// argument could never be honoured on the way back in: decryption always used
	// the default count and any other choice surfaced as "Incorrect password".
	describe('KDF parameters recorded in the payload', () => {
		it('records the KDF and iteration count it used', async () => {
			const encrypted = await encryptWithPassword('secret', 'pw')
			expect(encrypted.kdf).toBe('PBKDF2-SHA256')
			expect(encrypted.iterations).toBe(DEFAULT_PBKDF2_ITERATIONS)
		})

		it('round-trips a payload written with a non-default iteration count', async () => {
			const encrypted = await encryptWithPassword('secret', 'pw', 1000)
			expect(encrypted.iterations).toBe(1000)
			expect(await decryptWithPassword(encrypted, 'pw')).toBe('secret')
		})

		it('reads a legacy payload that records no iteration count', async () => {
			const encrypted = await encryptWithPassword('legacy secret', 'pw', 100_000)
			const legacy = {
				encryptedData: encrypted.encryptedData,
				iv: encrypted.iv,
				salt: encrypted.salt
			}
			expect(await decryptWithPassword(legacy, 'pw')).toBe('legacy secret')
		})

		it('does not decrypt a non-default payload with the legacy assumption', async () => {
			const encrypted = await encryptWithPassword('secret', 'pw', 1000)
			const stripped = {
				encryptedData: encrypted.encryptedData,
				iv: encrypted.iv,
				salt: encrypted.salt
			}
			await expect(decryptWithPassword(stripped, 'pw')).rejects.toThrow(/Decryption failed/)
		})

		it('refuses an unknown KDF instead of reporting a wrong password', async () => {
			const encrypted = await encryptWithPassword('secret', 'pw')
			await expect(
				decryptWithPassword({ ...encrypted, kdf: 'scrypt' }, 'pw')
			).rejects.toThrow(/Unsupported key derivation function: scrypt/)
		})

		it('rejects a non-positive iteration count', async () => {
			await expect(deriveKey('pw', generateSalt(), 0)).rejects.toThrow(/positive integer/)
		})
	})

	describe('Base64 utilities', () => {
		it('converts Uint8Array to Base64 and back', () => {
			const original = new Uint8Array([1, 2, 3, 255, 128, 64])
			const base64 = uint8ArrayToBase64(original)
			const decoded = base64ToUint8Array(base64)

			expect(decoded).toEqual(original)
		})

		it('converts ArrayBuffer to Base64 and back', () => {
			const original = new Uint8Array([1, 2, 3, 255]).buffer
			const base64 = arrayBufferToBase64(original)
			const decoded = base64ToArrayBuffer(base64)

			expect(new Uint8Array(decoded)).toEqual(new Uint8Array(original))
		})
	})
})
