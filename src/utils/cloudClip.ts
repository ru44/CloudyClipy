import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import shell from 'shelljs'
import { readImage, writeImage, writeText } from '../helpers/clipboard.ts'
import {
	getDefaultExpiration,
	readConfig,
	setDefaultExpiration,
	setGistId,
	setSecretKey,
	setToken
} from '../helpers/config.ts'
import { decrypt, encrypt, generateSecretKey } from '../helpers/encrypt.ts'
import {
	detectImageMime,
	extensionForMime,
	fromDataUri,
	SUPPORTED_IMAGE_FORMATS,
	toDataUri
} from '../helpers/image.ts'
import { createGistApiConfig } from '../helpers/request.ts'
import type {
	ClipboardMetadata,
	CloudClipConfig,
	Gist,
	GistApiConfig,
	GistFile
} from '../interfaces/interfaces.ts'
import {
	formatRemainingTime,
	unwrapMetadata,
	validateExpirationFormat,
	wrapWithMetadata
} from './expiration.ts'
import { createGist, editGist, getGist, getGistFileContent } from './gistApi.ts'

const error = 'Gist ID is not configured. Use `--init` first.'

// File created by `init` so the gist is never empty (GitHub rejects empty
// gists). It is not encrypted.
const PLACEHOLDER_FILE = 'Cclip'
const PLACEHOLDER = { content: 'Your clipboard in the cloud.' }

interface CipherKey {
	secret: string
	salt: string
}

// Configs from before cclip 3.1 have no secretKey and used the gist ID.
function keyFor(config: CloudClipConfig, gistId: string): CipherKey {
	return { secret: config.secretKey || gistId, salt: gistId }
}

function warnIfWeakKey(config: CloudClipConfig) {
	if (!config.secretKey || config.secretKey === config.gistId) {
		console.warn(
			'Warning: your secret key is your gist ID, which is part of the gist URL. Run `cclip rotate-key` to switch to a random key.'
		)
	}
}

type Entry =
	| { status: 'ok'; metadata: ClipboardMetadata }
	| { status: 'expired' }
	| { status: 'unreadable' }

/**
 * Downloads, decrypts and unwraps a single gist file.
 * Files that cannot be decrypted (the placeholder, or entries encrypted
 * with a different secret key) are reported as unreadable instead of throwing.
 */
async function readEntry(
	apiConfig: GistApiConfig,
	file: GistFile,
	key: CipherKey
): Promise<Entry> {
	const content = await getGistFileContent(apiConfig, file)
	let decrypted: string
	try {
		decrypted = decrypt(content, key.secret, key.salt)
	} catch {
		return { status: 'unreadable' }
	}
	const metadata = unwrapMetadata(decrypted)
	return metadata ? { status: 'ok', metadata } : { status: 'expired' }
}

/**
 * Finds a file by exact name, or by name without extension
 * (so `paste shot` finds the `shot.png` stored by `copy-image shot`).
 */
function findFile(gist: Gist, name: string): [string, GistFile] | undefined {
	const exact = gist.files[name]
	if (exact) return [name, exact]
	const matches = Object.entries(gist.files).filter(
		([fileName]) => path.parse(fileName).name === name
	)
	return matches.length === 1 ? matches[0] : undefined
}

function describeEntry(metadata: ClipboardMetadata) {
	return metadata.type === 'image' ? ` <${metadata.mimeType ?? 'image'}>` : ''
}

export async function init(
	configFile: string,
	token: string,
	secretKey: string | null = null,
	gistId: string | null = null
) {
	const config = readConfig(configFile)
	setToken(configFile, config, token)
	const apiConfig = createGistApiConfig(token)

	if (!gistId) {
		const placeholder = { [PLACEHOLDER_FILE]: PLACEHOLDER }
		const gist = await createGist(apiConfig, 'Cclip', placeholder)
		gistId = gist.id
		console.log(`New Gist created with ID: ${gistId}`)
	}
	if (!gistId) {
		throw new Error('Failed to determine Gist ID.')
	}
	setGistId(configFile, config, gistId)

	// The key is derived with scrypt, so any passphrase length works
	const key = secretKey || generateSecretKey()
	setSecretKey(configFile, config, key)

	console.log(`Configuration saved in: ${configFile}`)
	printSetupHint(key, gistId)
}

function printSetupHint(secretKey: string, gistId: string) {
	console.log('To use this clipboard on another machine, run:')
	console.log(`  cclip init <token> ${secretKey} ${gistId}`)
}

export async function setExpiration(configFile: string, expiration: string) {
	if (!validateExpirationFormat(expiration)) {
		throw new Error(
			`Invalid expiration format: "${expiration}". Use format: <number><unit> (e.g., 30m, 2h, 7d)`
		)
	}

	const config = readConfig(configFile)
	setDefaultExpiration(configFile, config, expiration)
	console.log(`Default expiration time set to: ${expiration}`)
}

export async function cleanupExpired(configFile: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist: Gist = await getGist(apiConfig, config.gistId)

	const filesToDelete: { [key: string]: any } = {}
	let expiredCount = 0

	for (const [name, file] of Object.entries(gist.files)) {
		const entry = await readEntry(apiConfig, file, keyFor(config, gist.id))
		if (entry.status === 'expired') {
			filesToDelete[name] = null
			expiredCount++
		}
	}

	if (expiredCount > 0) {
		await editGist(apiConfig, config.gistId, 'Cclip', filesToDelete)
		console.log(`Cleaned up ${expiredCount} expired file(s).`)
	} else {
		console.log('No expired files found.')
	}
}

async function printEntries(configFile: string, withContent: boolean) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist: Gist = await getGist(apiConfig, config.gistId)
	console.log(`Gist ID: ${gist.id}`)
	console.log(`Description: ${gist.description}`)
	console.log('Files:')
	for (const [name, file] of Object.entries(gist.files)) {
		const entry = await readEntry(apiConfig, file, keyFor(config, gist.id))

		if (entry.status === 'unreadable') {
			if (name !== PLACEHOLDER_FILE) {
				console.warn(`- ${name} (cannot decrypt: different secret key?)`)
			}
			continue
		}
		if (entry.status === 'expired') {
			console.warn(`- ${name} (expired)`)
			continue
		}

		const { metadata } = entry
		const expirationInfo = metadata.expiresAt
			? ` [expires in: ${formatRemainingTime(metadata.expiresAt)}]`
			: ''
		console.warn(
			`- ${name} (${file.size} bytes)${describeEntry(metadata)}${expirationInfo}`
		)
		if (withContent && metadata.type !== 'image') {
			console.log(metadata.content)
		}
	}
}

export function list(configFile: string) {
	return printEntries(configFile, false)
}

export function listWithContent(configFile: string) {
	return printEntries(configFile, true)
}

export async function copy(
	configFile: string,
	name: string,
	content: string,
	expiration?: string
) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	if (!content) {
		throw new Error('Nothing to copy: the clipboard (or stdin) is empty.')
	}
	warnIfWeakKey(config)

	// Use provided expiration or default from config
	const expirationTime = expiration || getDefaultExpiration(config)

	// Validate expiration format if provided
	if (expirationTime && !validateExpirationFormat(expirationTime)) {
		throw new Error(
			`Invalid expiration format: "${expirationTime}". Use format: <number><unit> (e.g., 30m, 2h, 7d)`
		)
	}

	const apiConfig = createGistApiConfig(token)
	const wrappedContent = wrapWithMetadata(content, expirationTime)
	const { secret, salt } = keyFor(config, config.gistId)
	const encryptedContent = encrypt(wrappedContent, secret, salt)
	const files = { [name]: { content: encryptedContent } }
	await editGist(apiConfig, config.gistId, 'Cclip', files)

	if (expirationTime) {
		console.log(
			`Content copied to cloud clipboard (expires in ${expirationTime}).`
		)
	} else {
		console.log('Content copied to cloud clipboard.')
	}
}

// Images are stored as base64(AES(base64)), roughly 1.8x their size. The Gist
// raw endpoint only serves files up to 10MB, so cap images at 5MB (~9.3MB stored).
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

function readImageFile(imagePath: string): Buffer {
	if (!existsSync(imagePath)) {
		throw new Error(`Image not found at path: ${imagePath}`)
	}
	const { size } = statSync(imagePath)
	if (size > MAX_IMAGE_SIZE) {
		throw imageTooLarge(size)
	}
	return readFileSync(imagePath)
}

function imageTooLarge(size: number) {
	return new Error(
		`Image is too large (${(size / (1024 * 1024)).toFixed(1)}MB). Max allowed is ${
			MAX_IMAGE_SIZE / (1024 * 1024)
		}MB.`
	)
}

export async function copyImage(
	configFile: string,
	name: string,
	imagePath?: string,
	expiration?: string
) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}

	warnIfWeakKey(config)

	// Without a path, take the image currently in the system clipboard
	let data: Buffer
	if (imagePath) {
		data = readImageFile(imagePath)
	} else {
		const image = await readImage()
		if (!image) {
			throw new Error(
				'No image found in the clipboard. Copy an image first or pass a file path.'
			)
		}
		if (image.data.length > MAX_IMAGE_SIZE) {
			throw imageTooLarge(image.data.length)
		}
		data = image.data
	}

	const mime = detectImageMime(data)
	if (!mime) {
		throw new Error(
			`Unsupported image format. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`
		)
	}

	// Use provided expiration or default from config
	const expirationTime = expiration || getDefaultExpiration(config)
	if (expirationTime && !validateExpirationFormat(expirationTime)) {
		throw new Error(
			`Invalid expiration format: "${expirationTime}". Use format: <number><unit> (e.g., 30m, 2h, 7d)`
		)
	}

	const apiConfig = createGistApiConfig(token)

	// If name has no extension, append the detected one
	const finalName = path.extname(name)
		? name
		: `${name}${extensionForMime(mime)}`

	const wrappedContent = wrapWithMetadata(
		toDataUri(data, mime),
		expirationTime,
		{
			type: 'image',
			mimeType: mime,
			filename: path.basename(finalName)
		}
	)
	const { secret, salt } = keyFor(config, config.gistId)
	const encryptedContent = encrypt(wrappedContent, secret, salt)
	const files = { [finalName]: { content: encryptedContent } }
	await editGist(apiConfig, config.gistId, 'Cclip', files)

	if (expirationTime) {
		console.log(
			`Image "${finalName}" copied to cloud clipboard (expires in ${expirationTime}).`
		)
	} else {
		console.log(`Image "${finalName}" copied to cloud clipboard.`)
	}
}

/**
 * Resolves the --out target. A directory gets the entry's own file name.
 */
function resolveOutPath(out: string, fileName: string) {
	return existsSync(out) && statSync(out).isDirectory()
		? path.join(out, path.basename(fileName))
		: out
}

export interface PasteOptions {
	// Save to this file or directory instead of the clipboard
	out?: string
	// Write the raw content to stdout instead of the clipboard
	stdout?: boolean
}

export async function paste(
	configFile: string,
	name: string,
	{ out, stdout }: PasteOptions = {}
) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist: Gist = await getGist(apiConfig, config.gistId)
	const found = findFile(gist, name)
	if (!found) {
		throw new Error(`File "${name}" not found in the Gist.`)
	}
	const [fileName, file] = found

	const entry = await readEntry(apiConfig, file, keyFor(config, config.gistId))
	if (entry.status === 'unreadable') {
		throw new Error(
			`Could not decrypt "${fileName}". Was it copied with a different secret key?`
		)
	}
	if (entry.status === 'expired') {
		throw new Error(`File "${fileName}" has expired.`)
	}
	const { metadata } = entry

	if (metadata.type === 'image') {
		const image = fromDataUri(metadata.content)
		if (!image) {
			throw new Error(`Image "${fileName}" is corrupted.`)
		}
		if (stdout) {
			if (process.stdout.isTTY) {
				throw new Error(
					'Refusing to print binary image data to the terminal. Redirect it (> image.png) or use --out.'
				)
			}
			process.stdout.write(image.data)
			return
		}
		if (out) {
			const target = resolveOutPath(out, metadata.filename || fileName)
			writeFileSync(target, image.data)
			console.log(`Image saved to ${target}.`)
			return
		}
		try {
			await writeImage(image)
		} catch (err) {
			throw new Error(
				`${(err as Error).message} Use --out <file> to save the image to disk instead.`
			)
		}
		console.log('Image pasted to clipboard.')
		return
	}

	if (stdout) {
		process.stdout.write(metadata.content)
		return
	}
	if (out) {
		const target = resolveOutPath(out, fileName)
		writeFileSync(target, metadata.content)
		console.log(`Content saved to ${target}.`)
		return
	}
	await writeText(metadata.content)
	console.log('Content pasted to clipboard.')
}

export async function clear(configFile: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist = await getGist(apiConfig, config.gistId)
	const files = Object.keys(gist.files).reduce(
		(acc: { [key: string]: any }, name) => {
			acc[name] = null
			return acc
		},
		{}
	)
	// Keep the placeholder: deleting every file fails with 422
	files[PLACEHOLDER_FILE] = PLACEHOLDER
	await editGist(apiConfig, config.gistId, 'Cclip', files)
	console.log('Cloud clipboard cleared.')
}

export async function remove(configFile: string, name: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist: Gist = await getGist(apiConfig, config.gistId)
	const found = findFile(gist, name)
	if (!found) {
		throw new Error(`File "${name}" not found in the Gist.`)
	}
	const [fileName] = found

	const files: { [key: string]: any } = { [fileName]: null }
	// A gist can't be empty, so restore the placeholder when removing the last file
	if (fileName === PLACEHOLDER_FILE || Object.keys(gist.files).length === 1) {
		files[PLACEHOLDER_FILE] = PLACEHOLDER
	}
	await editGist(apiConfig, config.gistId, 'Cclip', files)
	console.log(`Deleted "${fileName}" from the cloud clipboard.`)
}

/**
 * Re-encrypts every entry with a new secret key (and upgrades v1 entries
 * to the v2 format). Entries the current key can't decrypt are left as is.
 */
export async function rotateKey(configFile: string, newKey?: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist: Gist = await getGist(apiConfig, config.gistId)
	const oldKey = keyFor(config, gist.id)
	const secretKey = newKey || generateSecretKey()

	const files: { [key: string]: GistFile } = {}
	let skipped = 0
	for (const [name, file] of Object.entries(gist.files)) {
		const content = await getGistFileContent(apiConfig, file)
		let decrypted: string
		try {
			decrypted = decrypt(content, oldKey.secret, oldKey.salt)
		} catch {
			if (name !== PLACEHOLDER_FILE) skipped++
			continue
		}
		files[name] = { content: encrypt(decrypted, secretKey, gist.id) }
	}

	const rotated = Object.keys(files).length
	if (rotated > 0) {
		await editGist(apiConfig, config.gistId, 'Cclip', files)
	}
	setSecretKey(configFile, config, secretKey)

	console.log(
		`Re-encrypted ${rotated} entr${rotated === 1 ? 'y' : 'ies'} with the new key.`
	)
	if (skipped > 0) {
		console.warn(
			`Skipped ${skipped} entr${skipped === 1 ? 'y' : 'ies'} that the old key could not decrypt.`
		)
	}
	console.log('Other machines need the new key.')
	printSetupHint(secretKey, gist.id)
}

export async function purge(configFile: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error('Gist ID is missing in the config.')
	}
	const gistId = config.gistId
	const token = config.token

	if (!token) {
		throw new Error('Token is not configured.')
	}

	const gistUrl = `https://${token}@gist.github.com/${gistId}.git`
	const tempDir = path.join(shell.tempdir(), `gist-${gistId}`)

	try {
		// Step 1: Clone the gist repository
		console.log(`Cloning gist ${gistId}...`)
		shell.rm('-rf', tempDir) // Clean up the temp directory if it exists
		if (shell.exec(`git clone ${gistUrl} ${tempDir}`).code !== 0) {
			throw new Error('Failed to clone gist repository.')
		}

		shell.cd(tempDir)

		// Step 2: Find the first commit
		console.log('Finding the first commit...')
		const firstCommit = shell
			.exec('git rev-list --max-parents=0 HEAD', { silent: true })
			.stdout.trim()

		if (!firstCommit) {
			throw new Error('Could not find the first commit.')
		}
		console.log(`First commit: ${firstCommit}`)

		// Step 3: Clean the repository
		console.log('Cleaning the repository...')
		if (shell.exec(`git rm -rf --cached .`, { silent: true }).code !== 0) {
			console.warn(
				'Warning: Failed to remove files/folders using git, proceeding to git clean'
			)
		}

		if (shell.exec('git clean -fdx', { silent: true }).code !== 0) {
			throw new Error('Failed to clean the repository.')
		}

		// Step 4: Attempt to reset, handling merge conflicts automatically
		console.log('Resetting the repository to the first commit...')
		let resetResult = shell.exec(`git reset --hard ${firstCommit}`, {
			silent: false
		})

		if (resetResult.code !== 0) {
			console.warn(
				'Initial reset failed. Attempting automatic conflict resolution...'
			)
			console.warn('stdout:', resetResult.stdout)
			console.warn('stderr:', resetResult.stderr)

			// Resolve conflicts automatically using "ours" strategy
			if (
				shell.exec(`git merge -s recursive -X ours ${firstCommit}`, {
					silent: false
				}).code !== 0
			) {
				const mergeResult = shell.exec(
					`git merge -s recursive -X ours ${firstCommit}`,
					{ silent: false }
				)
				console.error('Automatic conflict resolution failed:')
				console.error('stdout:', mergeResult.stdout)
				console.error('stderr:', mergeResult.stderr)
				throw new Error(
					'Failed to resolve conflicts and reset to the first commit.'
				)
			}

			// Try reset again after resolving conflicts
			resetResult = shell.exec(`git reset --hard ${firstCommit}`, {
				silent: false
			})
			if (resetResult.code !== 0) {
				console.error('Reset failed after conflict resolution:')
				console.error('stdout:', resetResult.stdout)
				console.error('stderr:', resetResult.stderr)
				throw new Error(
					'Failed to reset to the first commit after conflict resolution.'
				)
			}
		}

		// Step 5: Force push the reset state to the remote repository
		console.log('Force-pushing to reset the remote repository...')
		if (shell.exec('git push -f', { silent: true }).code !== 0) {
			throw new Error('Failed to force-push changes to gist.')
		}

		console.log(
			'Gist repository has been successfully reset to the first commit.'
		)
	} catch (err: any) {
		console.error(`Error during purge: ${err.message}`)
		if (err.stderr) {
			console.error(err.stderr)
		}
	} finally {
		// Step 6: Clean up the local temp directory
		shell.cd(path.join(shell.tempdir(), '..'))
		shell.rm('-rf', tempDir)
	}
}
