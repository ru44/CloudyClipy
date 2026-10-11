import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	detectImageMime,
	extensionForMime,
	fromDataUri,
	toDataUri
} from '../helpers/image.ts'

const bytes = (...values: number[]) => Buffer.from(values)

describe('detectImageMime', () => {
	it('detects supported formats by signature', () => {
		assert.equal(
			detectImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)),
			'image/png'
		)
		assert.equal(detectImageMime(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg')
		assert.equal(detectImageMime(Buffer.from('GIF89a')), 'image/gif')
		assert.equal(
			detectImageMime(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')),
			'image/webp'
		)
	})

	it('rejects other data', () => {
		assert.equal(detectImageMime(Buffer.from('not an image')), null)
		assert.equal(detectImageMime(Buffer.from('RIFF\0\0\0\0WAVE')), null)
		assert.equal(detectImageMime(Buffer.alloc(0)), null)
	})
})

describe('data URIs', () => {
	it('round-trips binary data', () => {
		const data = bytes(0, 1, 2, 255)
		const parsed = fromDataUri(toDataUri(data, 'image/png'))
		assert.equal(parsed?.mimeType, 'image/png')
		assert.deepEqual(parsed?.data, data)
	})

	it('returns null for non data URIs', () => {
		assert.equal(fromDataUri('hello'), null)
	})

	it('maps MIME types to extensions', () => {
		assert.equal(extensionForMime('image/jpeg'), '.jpg')
		assert.equal(extensionForMime('image/unknown'), '.png')
	})
})
