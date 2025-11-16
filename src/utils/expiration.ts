import type { ClipboardMetadata } from '../interfaces/interfaces.js'

// Time conversion constants
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24

const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const MILLISECONDS_PER_HOUR = MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE
const MILLISECONDS_PER_DAY = HOURS_PER_DAY * MILLISECONDS_PER_HOUR

/**
 * Parses expiration time string (e.g., "30m", "2h", "7d") and returns milliseconds
 * @param expirationStr - String in format: number + unit (m=minutes, h=hours, d=days)
 * @returns Milliseconds or null if invalid
 */
export function parseExpirationTime(expirationStr: string): number | null {
	if (!expirationStr) return null

	const match = expirationStr.match(/^(\d+)([mhd])$/)
	if (!match || !match[1]) return null

	const value = Number.parseInt(match[1], 10)
	const unit = match[2]

	if (value <= 0) return null

	const milliseconds = {
		m: value * MILLISECONDS_PER_MINUTE,
		h: value * MILLISECONDS_PER_HOUR,
		d: value * MILLISECONDS_PER_DAY
	}

	return milliseconds[unit as 'm' | 'h' | 'd'] || null
}

/**
 * Validates expiration time format
 * @param expirationStr - String to validate (e.g., "30m", "2h", "7d")
 * @returns True if valid format
 */
export function validateExpirationFormat(expirationStr: string): boolean {
	if (!expirationStr) return false
	return /^\d+[mhd]$/.test(expirationStr)
}

/**
 * Calculates expiration timestamp from current time
 * @param expirationStr - String in format: number + unit
 * @returns Unix timestamp (ms) when content expires, or undefined
 */
export function calculateExpirationTimestamp(
	expirationStr: string | null | undefined
): number | undefined {
	if (!expirationStr) return undefined

	const duration = parseExpirationTime(expirationStr)
	if (!duration) return undefined

	return Date.now() + duration
}

/**
 * Checks if content has expired
 * @param expiresAt - Unix timestamp in milliseconds
 * @returns True if expired
 */
export function isExpired(expiresAt: number | undefined): boolean {
	if (!expiresAt) return false
	return Date.now() > expiresAt
}

/**
 * Wraps content with metadata (including expiration)
 * @param content - The actual clipboard content
 * @param expirationStr - Expiration time string (e.g., "30m")
 * @returns JSON string with metadata
 */
export function wrapWithMetadata(
	content: string,
	expirationStr?: string
): string {
	const metadata: ClipboardMetadata = {
		content,
		expiresAt: calculateExpirationTimestamp(expirationStr)
	}
	return JSON.stringify(metadata)
}

/**
 * Unwraps metadata from stored content
 * @param wrappedContent - JSON string with metadata
 * @returns Metadata object or null if invalid/expired
 */
export function unwrapMetadata(
	wrappedContent: string
): ClipboardMetadata | null {
	try {
		const metadata: ClipboardMetadata = JSON.parse(wrappedContent)

		// Check if it's legacy format (plain string)
		if (typeof metadata !== 'object' || !metadata.content) {
			// Treat as legacy format - plain content without metadata
			return { content: wrappedContent }
		}

		// Check if expired
		if (metadata.expiresAt && isExpired(metadata.expiresAt)) {
			return null
		}

		return metadata
	} catch {
		// If not JSON, treat as legacy plain content
		return { content: wrappedContent }
	}
}

/**
 * Formats remaining time until expiration
 * @param expiresAt - Unix timestamp in milliseconds
 * @returns Human-readable string (e.g., "2h 30m", "expired")
 */
export function formatRemainingTime(expiresAt: number | undefined): string {
	if (!expiresAt) return 'never'

	const remaining = expiresAt - Date.now()
	if (remaining <= 0) return 'expired'

	const days = Math.floor(remaining / MILLISECONDS_PER_DAY)
	const hours = Math.floor(
		(remaining % MILLISECONDS_PER_DAY) / MILLISECONDS_PER_HOUR
	)
	const minutes = Math.floor(
		(remaining % MILLISECONDS_PER_HOUR) / MILLISECONDS_PER_MINUTE
	)

	const parts = []
	if (days > 0) parts.push(`${days}d`)
	if (hours > 0) parts.push(`${hours}h`)
	if (minutes > 0) parts.push(`${minutes}m`)

	return parts.length > 0 ? parts.join(' ') : '< 1m'
}
