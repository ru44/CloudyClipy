import { resolve as _resolve } from 'node:path'
import version from '../../package.json' with { type: 'json' }
import { readText } from '../helpers/clipboard.ts'
import {
	cleanupExpired,
	clear,
	copy,
	copyImage,
	init,
	list,
	listWithContent,
	paste,
	purge,
	remove,
	rotateKey,
	setExpiration
} from './cloudClip.ts'

const configPath = _resolve(
	process.env.HOME || process.env.USERPROFILE || '',
	'.cloudclip.json'
)

async function readStdin() {
	return new Promise((resolve, reject) => {
		let data = ''
		process.stdin
			.on('data', (chunk) => {
				data += chunk
			})
			.on('end', () => resolve(data.trim()))
			.on('error', reject)
	})
}

export default async function handleCommand(command: any, args: any) {
	// Only `copy` needs the clipboard, so other commands work on headless
	// machines and don't block waiting for stdin.
	const readContent = async (): Promise<any> =>
		process.stdin.isTTY ? readText() : readStdin()

	const actions: any = {
		i: () => init(configPath, args.token, args.secretKey, args.gistId),
		init: () => init(configPath, args.token, args.secretKey, args.gistId),
		l: () => list(configPath),
		list: () => list(configPath),
		lc: () => listWithContent(configPath),
		listWithContent: () => listWithContent(configPath),
		c: async () =>
			copy(configPath, args.name, await readContent(), args.expires),
		copy: async () =>
			copy(configPath, args.name, await readContent(), args.expires),
		ci: () => copyImage(configPath, args.name, args.path, args.expires),
		'copy-image': () =>
			copyImage(configPath, args.name, args.path, args.expires),
		p: () => paste(configPath, args.name, args),
		paste: () => paste(configPath, args.name, args),
		d: () => remove(configPath, args.name),
		delete: () => remove(configPath, args.name),
		r: () => clear(configPath),
		clear: () => clear(configPath),
		pr: () => purge(configPath),
		purge: () => purge(configPath),
		se: () => setExpiration(configPath, args.expiration),
		'set-expiration': () => setExpiration(configPath, args.expiration),
		ce: () => cleanupExpired(configPath),
		'cleanup-expired': () => cleanupExpired(configPath),
		rk: () => rotateKey(configPath, args.secretKey),
		'rotate-key': () => rotateKey(configPath, args.secretKey)
	}

	const action: any = actions[command]
	if (action) {
		await action()
	} else {
		console.log('Welcome to CloudyClipy 🌥️✂️')
		console.warn(`You are using version ${version.version}`)
		console.log('Use cclip help to see available commands')
		console.log("Developed with ♥ by '@Ru44'")
	}
}
