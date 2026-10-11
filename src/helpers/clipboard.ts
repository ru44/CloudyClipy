import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import clipboardy from 'clipboardy'
import { extensionForMime } from './image.ts'

/**
 * Single entry point for every system clipboard operation.
 *
 * Text goes through clipboardy (maintained, handles all platforms).
 * clipboardy only supports images on macOS, so images use the native
 * tools of each platform instead:
 * - macOS:   clipboardy (JXA / NSPasteboard)
 * - Linux:   wl-clipboard on Wayland, xclip on X11
 * - Windows: PowerShell + System.Windows.Forms
 */

export interface ClipboardImage {
	data: Buffer
	mimeType: string
}

interface ToolError extends Error {
	missing?: boolean
}

interface RunResult {
	code: number | null
	stdout: Buffer
	stderr: string
}

const LINUX_HINT =
	'Install wl-clipboard (Wayland) or xclip (X11) to use image clipboard support.'

export function readText(): Promise<string> {
	return clipboardy.read()
}

export function writeText(text: string): Promise<void> {
	return clipboardy.write(text)
}

export async function readImage(): Promise<ClipboardImage | null> {
	switch (process.platform) {
		case 'darwin':
			return readImageMac()
		case 'win32':
			return readImageWindows()
		case 'linux':
			return onLinux(readImageWayland, readImageX11)
		default:
			throw unsupportedPlatform()
	}
}

export async function writeImage(image: ClipboardImage): Promise<void> {
	switch (process.platform) {
		case 'darwin':
			return writeImageMac(image)
		case 'win32':
			return writeImageWindows(image)
		case 'linux':
			return onLinux(
				() => writeImageWayland(image),
				() => writeImageX11(image)
			)
		default:
			throw unsupportedPlatform()
	}
}

/**
 * Uses wl-clipboard on Wayland, falling back to xclip (through XWayland)
 * when wl-clipboard is not installed, like clipboardy does for text.
 */
async function onLinux<T>(
	wayland: () => Promise<T>,
	x11: () => Promise<T>
): Promise<T> {
	if (!process.env.WAYLAND_DISPLAY) return x11()
	try {
		return await wayland()
	} catch (err) {
		if ((err as ToolError).missing && process.env.DISPLAY) return x11()
		throw err
	}
}

function unsupportedPlatform() {
	return new Error(
		`Image clipboard is not supported on ${process.platform}. Use --out <file> instead.`
	)
}

/**
 * Runs a command, optionally piping `input` to stdin.
 * Clipboard owners like wl-copy and xclip fork a background process that
 * keeps serving the clipboard, so when not capturing output we resolve on
 * `exit` instead of waiting for the forked child to close the streams.
 */
function run(
	command: string,
	args: string[],
	{ input, capture = true }: { input?: Buffer; capture?: boolean } = {}
): Promise<RunResult> {
	return new Promise((resolve, reject) => {
		const output = capture ? 'pipe' : 'ignore'
		const child = spawn(command, args, {
			stdio: ['pipe', output, output],
			windowsHide: true
		})
		const stdout: Buffer[] = []
		let stderr = ''

		child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk))
		child.stderr?.on('data', (chunk: Buffer) => {
			stderr += chunk
		})
		child.on('error', (err: NodeJS.ErrnoException) => {
			if (err.code !== 'ENOENT') return reject(err)
			const missing: ToolError = new Error(
				`"${command}" was not found.${process.platform === 'linux' ? ` ${LINUX_HINT}` : ''}`
			)
			missing.missing = true
			reject(missing)
		})
		child.on(capture ? 'close' : 'exit', (code) => {
			resolve({ code, stdout: Buffer.concat(stdout), stderr: stderr.trim() })
		})
		// The child may exit before reading stdin; the exit code reports that.
		child.stdin?.on('error', () => {})
		child.stdin?.end(input)
	})
}

function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
	const dir = mkdtempSync(path.join(tmpdir(), 'cclip-'))
	return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }))
}

function pickImageType(types: string[]): string | undefined {
	const images = types
		.map((type) => type.trim())
		.filter((type) => type.startsWith('image/'))
	return images.includes('image/png') ? 'image/png' : images[0]
}

// macOS

async function readImageMac(): Promise<ClipboardImage | null> {
	const files = await clipboardy.readImages()
	try {
		const [first] = files
		return first ? { data: readFileSync(first), mimeType: 'image/png' } : null
	} finally {
		for (const file of files) rmSync(file, { force: true })
	}
}

function writeImageMac(image: ClipboardImage): Promise<void> {
	return withTempDir(async (dir) => {
		const file = path.join(dir, `image${extensionForMime(image.mimeType)}`)
		writeFileSync(file, image.data)
		await clipboardy.writeImages([file])
	})
}

// Linux (Wayland)

async function readImageWayland(): Promise<ClipboardImage | null> {
	const list = await run('wl-paste', ['--list-types'])
	if (list.code !== 0) return null

	const mimeType = pickImageType(list.stdout.toString().split('\n'))
	if (!mimeType) return null

	const result = await run('wl-paste', ['--no-newline', '--type', mimeType])
	if (result.code !== 0) {
		throw new Error(`wl-paste failed: ${result.stderr}`)
	}
	return { data: result.stdout, mimeType }
}

async function writeImageWayland(image: ClipboardImage): Promise<void> {
	const result = await run('wl-copy', ['--type', image.mimeType], {
		input: image.data,
		capture: false
	})
	if (result.code !== 0) {
		throw new Error('wl-copy failed to write the image to the clipboard.')
	}
}

// Linux (X11)

async function readImageX11(): Promise<ClipboardImage | null> {
	const targets = await run('xclip', [
		'-selection',
		'clipboard',
		'-t',
		'TARGETS',
		'-o'
	])
	if (targets.code !== 0) return null

	const mimeType = pickImageType(targets.stdout.toString().split('\n'))
	if (!mimeType) return null

	const result = await run('xclip', [
		'-selection',
		'clipboard',
		'-t',
		mimeType,
		'-o'
	])
	if (result.code !== 0) {
		throw new Error(`xclip failed: ${result.stderr}`)
	}
	return { data: result.stdout, mimeType }
}

async function writeImageX11(image: ClipboardImage): Promise<void> {
	const result = await run(
		'xclip',
		['-selection', 'clipboard', '-t', image.mimeType, '-i'],
		{ input: image.data, capture: false }
	)
	if (result.code !== 0) {
		throw new Error('xclip failed to write the image to the clipboard.')
	}
}

// Windows

function powershell(script: string) {
	return run('powershell.exe', [
		'-NoProfile',
		'-NonInteractive',
		'-STA',
		'-Command',
		script
	])
}

function psString(value: string) {
	return `'${value.replace(/'/g, "''")}'`
}

const PS_PRELUDE = 'Add-Type -AssemblyName System.Windows.Forms, System.Drawing'
const PS_NO_IMAGE = 3

function readImageWindows(): Promise<ClipboardImage | null> {
	return withTempDir(async (dir) => {
		const file = path.join(dir, 'clipboard.png')
		const result = await powershell(
			[
				PS_PRELUDE,
				'$image = [System.Windows.Forms.Clipboard]::GetImage()',
				`if ($image -eq $null) { exit ${PS_NO_IMAGE} }`,
				`$image.Save(${psString(file)}, [System.Drawing.Imaging.ImageFormat]::Png)`
			].join('; ')
		)
		if (result.code === PS_NO_IMAGE) return null
		if (result.code !== 0) {
			throw new Error(
				`PowerShell failed to read the clipboard: ${result.stderr}`
			)
		}
		return { data: readFileSync(file), mimeType: 'image/png' }
	})
}

function writeImageWindows(image: ClipboardImage): Promise<void> {
	return withTempDir(async (dir) => {
		const file = path.join(dir, `image${extensionForMime(image.mimeType)}`)
		writeFileSync(file, image.data)
		const result = await powershell(
			[
				PS_PRELUDE,
				`$image = [System.Drawing.Image]::FromFile(${psString(file)})`,
				'[System.Windows.Forms.Clipboard]::SetImage($image)',
				'$image.Dispose()'
			].join('; ')
		)
		if (result.code !== 0) {
			throw new Error(`PowerShell failed to write the image: ${result.stderr}`)
		}
	})
}
