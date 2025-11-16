import { resolve as _resolve } from 'node:path'
import clipboardy from 'clipboardy'
import version from '../../package.json' with { type: 'json' }
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
	const content: any = process.stdin.isTTY
		? clipboardy.readSync()
		: await readStdin()

	const actions: any = {
		i: () => init(configPath, args.token, args.secretKey, args.gistId),
		init: () => init(configPath, args.token, args.secretKey, args.gistId),
		l: () => list(configPath),
		list: () => list(configPath),
		lc: () => listWithContent(configPath),
		listWithContent: () => listWithContent(configPath),
		c: () => copy(configPath, args.name, content, args.expires),
		copy: () => copy(configPath, args.name, content, args.expires),
		ci: () => copyImage(configPath, args.name, args.path, args.expires),
		'copy-image': () =>
			copyImage(configPath, args.name, args.path, args.expires),
		p: () => paste(configPath, args.name),
		paste: () => paste(configPath, args.name),
		r: () => clear(configPath),
		clear: () => clear(configPath),
		pr: () => purge(configPath),
		purge: () => purge(configPath),
		se: () => setExpiration(configPath, args.expiration),
		'set-expiration': () => setExpiration(configPath, args.expiration),
		ce: () => cleanupExpired(configPath),
		'cleanup-expired': () => cleanupExpired(configPath)
	}

	const action: any = actions[command]
	if (action) {
		await action()
	} else {
		console.log('Welcome to CloudyClipy 🌥️✂️')
		console.warn(`You are using version ${version}`)
		console.log('Use --help to see available commands')
		console.log("Developed with ♥ by '@Ru44'")
	}
}
