const MIME_EXTENSIONS: Record<string, string> = {
	'image/png': '.png',
	'image/jpeg': '.jpg',
	'image/gif': '.gif',
	'image/webp': '.webp'
}

export const SUPPORTED_IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'gif', 'webp']

/**
 * Detects the image type from the file's magic bytes so a renamed or
 * corrupted file is rejected regardless of its extension.
 * @returns The MIME type, or null if the data is not a supported image
 */
export function detectImageMime(data: Buffer): string | null {
	const startsWith = (bytes: number[], offset = 0) =>
		bytes.every((byte, i) => data[offset + i] === byte)

	if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
		return 'image/png'
	}
	if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
	if (startsWith([0x47, 0x49, 0x46, 0x38])) return 'image/gif'
	if (
		startsWith([0x52, 0x49, 0x46, 0x46]) &&
		startsWith([0x57, 0x45, 0x42, 0x50], 8)
	) {
		return 'image/webp'
	}
	return null
}

export function extensionForMime(mimeType: string): string {
	return MIME_EXTENSIONS[mimeType] || '.png'
}

export function toDataUri(data: Buffer, mimeType: string): string {
	return `data:${mimeType};base64,${data.toString('base64')}`
}

export function fromDataUri(
	dataUri: string
): { data: Buffer; mimeType: string } | null {
	const match = dataUri.match(/^data:([^;,]+);base64,(.*)$/s)
	if (!match || !match[1] || match[2] === undefined) return null
	return { mimeType: match[1], data: Buffer.from(match[2], 'base64') }
}
