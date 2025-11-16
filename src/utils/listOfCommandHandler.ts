import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export async function getArgv() {
	return await yargs(hideBin(process.argv))
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
				yargs.positional('name', { type: 'string', describe: 'File name' })
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
		.help().argv
}
