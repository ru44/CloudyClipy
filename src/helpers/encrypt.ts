import crypto from 'node:crypto'

/**
 * v2 format: "v2:" + base64(iv | authTag | ciphertext), AES-256-GCM.
 * The key is derived from the secret with scrypt, salted with the gist ID,
 * so any passphrase works and every machine with the same secret and gist
 * derives the same key. A random IV per entry means copying the same
 * content twice never produces the same ciphertext.
 *
 * v1 format (read-only): hex AES-256-CBC with the raw 32-character secret
 * as key and its first 16 characters as a fixed IV.
 */
const V2_PREFIX = 'v2:'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

const keyCache = new Map<string, Buffer>()

function deriveKey(secret: string, salt: string): Buffer {
	const cacheKey = `${salt}\0${secret}`
	let key = keyCache.get(cacheKey)
	if (!key) {
		key = crypto.scryptSync(secret, `cclip:${salt}`, KEY_LENGTH)
		keyCache.set(cacheKey, key)
	}
	return key
}

/**
 * Generates a random secret key: 32 hex characters (128 bits).
 * Hex avoids a leading "-" that the CLI would parse as a flag.
 */
export function generateSecretKey(): string {
	return crypto.randomBytes(16).toString('hex')
}

export function encrypt(text: string, secret: string, salt: string): string {
	const iv = crypto.randomBytes(IV_LENGTH)
	const cipher = crypto.createCipheriv(
		'aes-256-gcm',
		deriveKey(secret, salt),
		iv,
		{ authTagLength: TAG_LENGTH }
	)
	const ciphertext = Buffer.concat([
		cipher.update(text, 'utf8'),
		cipher.final()
	])
	const payload = Buffer.concat([iv, cipher.getAuthTag(), ciphertext])
	return V2_PREFIX + payload.toString('base64')
}

/**
 * Decrypts v2 entries, and v1 entries written by cclip 4.x and earlier.
 * Throws if the secret is wrong or the data was tampered with.
 */
export function decrypt(
	encrypted: string,
	secret: string,
	salt: string
): string {
	if (!encrypted.startsWith(V2_PREFIX)) {
		return decryptV1(encrypted, secret)
	}
	const data = Buffer.from(encrypted.slice(V2_PREFIX.length), 'base64')
	const iv = data.subarray(0, IV_LENGTH)
	const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
	const decipher = crypto.createDecipheriv(
		'aes-256-gcm',
		deriveKey(secret, salt),
		iv,
		{ authTagLength: TAG_LENGTH }
	)
	decipher.setAuthTag(tag)
	return Buffer.concat([
		decipher.update(data.subarray(IV_LENGTH + TAG_LENGTH)),
		decipher.final()
	]).toString('utf8')
}

function decryptV1(encrypted: string, secret: string): string {
	const decipher = crypto.createDecipheriv(
		'aes-256-cbc',
		secret,
		secret.slice(0, 16)
	)
	let decrypted = decipher.update(encrypted, 'hex', 'utf8')
	decrypted += decipher.final('utf8')
	return decrypted
}
