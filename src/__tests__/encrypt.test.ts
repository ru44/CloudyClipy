import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { describe, it } from 'node:test'
import { decrypt, encrypt, generateSecretKey } from '../helpers/encrypt.ts'

const GIST_ID = '06462ce4ff05c36aa3264735c96296a2'

// How cclip 4.x and earlier encrypted entries
function encryptV1(text: string, secret: string) {
	const cipher = crypto.createCipheriv(
		'aes-256-cbc',
		secret,
		secret.slice(0, 16)
	)
	return cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}

describe('encrypt / decrypt', () => {
	it('round-trips text, including unicode', () => {
		const text = 'hello ☁️ world\nline two'
		const encrypted = encrypt(text, 'my passphrase', GIST_ID)
		assert.ok(encrypted.startsWith('v2:'))
		assert.equal(decrypt(encrypted, 'my passphrase', GIST_ID), text)
	})

	it('uses a random IV so equal input gives different ciphertext', () => {
		assert.notEqual(
			encrypt('same', 'key', GIST_ID),
			encrypt('same', 'key', GIST_ID)
		)
	})

	it('accepts secrets of any length', () => {
		for (const secret of ['a', 'x'.repeat(32), 'y'.repeat(100)]) {
			assert.equal(
				decrypt(encrypt('ok', secret, GIST_ID), secret, GIST_ID),
				'ok'
			)
		}
	})

	it('rejects the wrong secret or salt', () => {
		const encrypted = encrypt('secret', 'right', GIST_ID)
		assert.throws(() => decrypt(encrypted, 'wrong', GIST_ID))
		assert.throws(() => decrypt(encrypted, 'right', 'other-gist'))
	})

	it('rejects tampered or truncated data', () => {
		const encrypted = encrypt('important', 'key', GIST_ID)
		const bytes = Buffer.from(encrypted.slice(3), 'base64')
		bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 1
		assert.throws(() =>
			decrypt(`v2:${bytes.toString('base64')}`, 'key', GIST_ID)
		)
		assert.throws(() => decrypt(encrypted.slice(0, 20), 'key', GIST_ID))
	})

	it('is smaller than the v1 hex format', () => {
		const text = 'x'.repeat(10_000)
		const secret = generateSecretKey()
		assert.ok(
			encrypt(text, secret, GIST_ID).length <
				encryptV1(text, secret).length * 0.7
		)
	})

	it('still decrypts v1 entries', () => {
		const secret = GIST_ID // the old default key
		assert.equal(
			decrypt(encryptV1('legacy', secret), secret, GIST_ID),
			'legacy'
		)
	})

	it('fails on the unencrypted placeholder file', () => {
		assert.throws(() =>
			decrypt('Your clipboard in the cloud.', GIST_ID, GIST_ID)
		)
	})
})

describe('generateSecretKey', () => {
	it('returns 32 random hex characters', () => {
		const key = generateSecretKey()
		assert.match(key, /^[0-9a-f]{32}$/)
		assert.notEqual(key, generateSecretKey())
	})
})
