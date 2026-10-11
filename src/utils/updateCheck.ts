import { readFileSync, writeFileSync } from 'node:fs'
import { styleText } from 'node:util'
import axios from 'axios'

const REGISTRY_URL = 'https://registry.npmjs.org/cclip/latest'
const CHECK_INTERVAL = 24 * 60 * 60 * 1000 // once a day
const REQUEST_TIMEOUT = 2000

interface UpdateCache {
	lastCheck: number
	latestVersion?: string
}

interface CheckOptions {
	now?: number
	fetchLatest?: () => Promise<string>
}

async function fetchLatestVersion(): Promise<string> {
	const { data } = await axios.get(REGISTRY_URL, { timeout: REQUEST_TIMEOUT })
	return data.version
}

function readCache(cachePath: string): UpdateCache | null {
	try {
		const cache = JSON.parse(readFileSync(cachePath, 'utf-8'))
		if (typeof cache.lastCheck === 'number') return cache
	} catch {
		// Missing or corrupt cache: check now
	}
	return null
}

function writeCache(cachePath: string, cache: UpdateCache) {
	try {
		writeFileSync(cachePath, JSON.stringify(cache, null, 2))
	} catch {
		// Read-only home directory: check again next run
	}
}

/**
 * Compares x.y.z versions, ignoring any prerelease suffix.
 */
export function isNewerVersion(latest: string, current: string): boolean {
	const parse = (version: string) =>
		(version.replace(/^v/, '').split('-')[0] ?? '')
			.split('.')
			.map((part) => Number.parseInt(part, 10) || 0)
	const a = parse(latest)
	const b = parse(current)
	for (let i = 0; i < 3; i++) {
		const diff = (a[i] ?? 0) - (b[i] ?? 0)
		if (diff !== 0) return diff > 0
	}
	return false
}

/**
 * Only check in an interactive terminal, never in CI, and let users opt
 * out with NO_UPDATE_NOTIFIER (the convention used by npm tools).
 */
export function shouldCheckForUpdates(
	env: NodeJS.ProcessEnv = process.env,
	isTTY: boolean = Boolean(process.stderr.isTTY)
): boolean {
	return isTTY && !env.CI && !env.NO_UPDATE_NOTIFIER
}

/**
 * Returns the latest published version if it is newer than the current one.
 * Queries the npm registry at most once a day and uses the cached answer in
 * between. Never throws: being offline just means no notice.
 */
export async function checkForUpdate(
	currentVersion: string,
	cachePath: string,
	{ now = Date.now(), fetchLatest = fetchLatestVersion }: CheckOptions = {}
): Promise<string | null> {
	const cache = readCache(cachePath)
	let latest = cache?.latestVersion

	if (!cache || now - cache.lastCheck >= CHECK_INTERVAL) {
		try {
			latest = await fetchLatest()
		} catch {
			// Offline or registry down: keep the cached version, retry tomorrow
		}
		writeCache(cachePath, { lastCheck: now, latestVersion: latest })
	}

	return latest && isNewerVersion(latest, currentVersion) ? latest : null
}

export function formatUpdateMessage(current: string, latest: string): string {
	return [
		'',
		`${styleText('yellow', 'Update available')} ${styleText('dim', current)} → ${styleText('green', latest)}`,
		`Run ${styleText('cyan', 'npm i -g cclip@latest')} to update.`,
		`Changelog: ${styleText('dim', 'https://github.com/ru44/CloudyClipy/blob/master/CHANGELOG.md')}`
	].join('\n')
}
