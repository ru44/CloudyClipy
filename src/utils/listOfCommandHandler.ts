import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export async function getArgv() {
	const cli = yargs(hideBin(process.argv))
		.scriptName('cclip')
		.command(
			['i <token> [secretKey] [gistId]', 'init'],
			'Initialize with a token and optional Secret key Gist ID',
			(yargs) => {
				yargs
					.positional('token', { type: 'string', describe: 'GitHub token' })
					.positional('secretKey', {
						type: 'string',
						describe: 'Secret key (optional Length should be 32 bit)'
					})
					.positional('gistId', {
						type: 'string',
						describe: 'Gist ID (optional)'
					})
			}
		)
		.command(['l', 'list'], 'List files in the cloud clipboard')
		.command(
			['lc', 'listWithContent'],
			'List files with content in the cloud clipboard'
		)
		.command(
			['c <name>', 'copy'],
			'Copy content to the cloud clipboard',
			(yargs) => {
				yargs
					.positional('name', { type: 'string', describe: 'File name' })
					.option('expires', {
						type: 'string',
						describe: 'Expiration time (e.g., 30m, 2h, 7d)',
						alias: 'e'
					})
			}
		)
		.command(
			['ci <name> <path>', 'copy-image'],
			'Copy an image file to the cloud clipboard',
			(yargs) => {
				yargs
					.positional('name', {
						type: 'string',
						describe: 'Image name (file label)'
					})
					.positional('path', {
						type: 'string',
						describe: 'Path to image file'
					})
					.option('expires', {
						type: 'string',
						describe: 'Expiration time (e.g., 30m, 2h, 7d)',
						alias: 'e'
					})
			}
		)
		.command(
			['p <name>', 'paste'],
			'Paste content from the cloud clipboard',
			(yargs) => {
				yargs.positional('name', { type: 'string', describe: 'File name' })
			}
		)
		.command(['r', 'clear'], 'Clear the cloud clipboard')
		.command(['pr', 'purge'], 'Purge (Remove Revisions) the cloud clipboard')
		.command(
			['se <expiration>', 'set-expiration'],
			'Set default expiration time for clipboard data',
			(yargs) => {
				yargs.positional('expiration', {
					type: 'string',
					describe: 'Default expiration time (e.g., 30m, 2h, 7d)'
				})
			}
		)
		.command(['ce', 'cleanup-expired'], 'Remove all expired clipboard entries')
		.command(
			['h', 'help'],
			'Show help and available commands',
			() => {},
			() => {
				cli.showHelp()
				process.exit(0)
			}
		)
		.help()
	return await (cli as any).argv
}
