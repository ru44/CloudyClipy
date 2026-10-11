import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	parseExpirationTime,
	unwrapMetadata,
	validateExpirationFormat,
	wrapWithMetadata
} from '../utils/expiration.ts'

describe('expiration', () => {
	it('parses minutes, hours and days', () => {
		assert.equal(parseExpirationTime('30m'), 30 * 60 * 1000)
		assert.equal(parseExpirationTime('2h'), 2 * 60 * 60 * 1000)
		assert.equal(parseExpirationTime('7d'), 7 * 24 * 60 * 60 * 1000)
	})

	it('rejects invalid formats', () => {
		for (const value of ['', '0m', '5', 'h', '1w', '-1d']) {
			assert.equal(parseExpirationTime(value), null, value)
		}
		assert.equal(validateExpirationFormat('10x'), false)
	})

	it('wraps and unwraps content with metadata', () => {
		const metadata = unwrapMetadata(wrapWithMetadata('hello', '1h'))
		assert.equal(metadata?.content, 'hello')
		assert.ok((metadata?.expiresAt ?? 0) > Date.now())
	})

	it('treats expired content as null', () => {
		const expired = JSON.stringify({
			content: 'old',
			expiresAt: Date.now() - 1
		})
		assert.equal(unwrapMetadata(expired), null)
	})

	it('treats plain text as legacy content', () => {
		assert.deepEqual(unwrapMetadata('plain text'), { content: 'plain text' })
	})
})
