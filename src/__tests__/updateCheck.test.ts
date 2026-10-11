import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import {
	checkForUpdate,
	isNewerVersion,
	shouldCheckForUpdates
} from '../utils/updateCheck.ts'

const DAY = 24 * 60 * 60 * 1000
const cachePath = () =>
	path.join(mkdtempSync(path.join(tmpdir(), 'cclip-test-')), 'update.json')

// Fake registry that records how often it was called
function registry(version: string | Error) {
	const fake = async () => {
		fake.calls++
		if (version instanceof Error) throw version
		return version
	}
	fake.calls = 0
	return fake
}

describe('isNewerVersion', () => {
	it('compares major, minor and patch numerically', () => {
		assert.equal(isNewerVersion('5.0.0', '4.0.1'), true)
		assert.equal(isNewerVersion('4.1.0', '4.0.9'), true)
		assert.equal(isNewerVersion('4.0.10', '4.0.9'), true)
		assert.equal(isNewerVersion('4.0.1', '4.0.1'), false)
		assert.equal(isNewerVersion('4.0.0', '4.0.1'), false)
		assert.equal(isNewerVersion('v5.0.0', '4.0.1'), true)
		assert.equal(isNewerVersion('5.0.0-beta.1', '5.0.0'), false)
	})
})

describe('checkForUpdate', () => {
	it('returns the newer version and caches it', async () => {
		const file = cachePath()
		const fetchLatest = registry('5.0.0')
		assert.equal(
			await checkForUpdate('4.0.1', file, { now: 1000, fetchLatest }),
			'5.0.0'
		)
		assert.deepEqual(JSON.parse(readFileSync(file, 'utf-8')), {
			lastCheck: 1000,
			latestVersion: '5.0.0'
		})
	})

	it('returns null when already on the latest version', async () => {
		const fetchLatest = registry('4.0.1')
		assert.equal(
			await checkForUpdate('4.0.1', cachePath(), { fetchLatest }),
			null
		)
	})

	it('uses the cache for a day before checking again', async () => {
		const file = cachePath()
		const fetchLatest = registry('5.0.0')
		await checkForUpdate('4.0.1', file, { now: 0, fetchLatest })
		await checkForUpdate('4.0.1', file, { now: DAY - 1, fetchLatest })
		assert.equal(fetchLatest.calls, 1)
		await checkForUpdate('4.0.1', file, { now: DAY, fetchLatest })
		assert.equal(fetchLatest.calls, 2)
	})

	it('stops nagging once the user has upgraded', async () => {
		const file = cachePath()
		await checkForUpdate('4.0.1', file, {
			now: 0,
			fetchLatest: registry('5.0.0')
		})
		assert.equal(await checkForUpdate('5.0.0', file, { now: 1 }), null)
	})

	it('falls back to the cached version when offline, and backs off', async () => {
		const file = cachePath()
		writeFileSync(
			file,
			JSON.stringify({ lastCheck: 0, latestVersion: '5.0.0' })
		)
		const offline = registry(new Error('ENOTFOUND'))
		assert.equal(
			await checkForUpdate('4.0.1', file, { now: DAY, fetchLatest: offline }),
			'5.0.0'
		)
		await checkForUpdate('4.0.1', file, { now: DAY + 1, fetchLatest: offline })
		assert.equal(offline.calls, 1)
	})

	it('treats a corrupt cache as missing', async () => {
		const file = cachePath()
		writeFileSync(file, '{not json')
		const fetchLatest = registry('5.0.0')
		assert.equal(await checkForUpdate('4.0.1', file, { fetchLatest }), '5.0.0')
		assert.equal(fetchLatest.calls, 1)
	})
})

describe('shouldCheckForUpdates', () => {
	it('only runs in an interactive terminal outside CI', () => {
		assert.equal(shouldCheckForUpdates({}, true), true)
		assert.equal(shouldCheckForUpdates({}, false), false)
		assert.equal(shouldCheckForUpdates({ CI: 'true' }, true), false)
		assert.equal(
			shouldCheckForUpdates({ NO_UPDATE_NOTIFIER: '1' }, true),
			false
		)
	})
})
