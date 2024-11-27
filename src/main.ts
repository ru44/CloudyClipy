#!/usr/bin/env node

import { init, list, copy, paste, clear } from './utils/cloudClip'
import { hideBin } from 'yargs/helpers'
import { resolve as _resolve } from 'path'
import clipboardy from 'clipboardy'
import yargs from 'yargs'

const argvPromise = yargs(hideBin(process.argv))
    .scriptName('cclip')
    .command('init <token> [gistId]', 'Initialize with a token and optional Gist ID', (yargs) => {
        yargs.positional('token', { type: 'string', describe: 'GitHub token' })
        yargs.positional('gistId', { type: 'string', describe: 'Gist ID (optional)' })
    })
    .command('list', 'List files in the cloud clipboard')
    .command('copy <name>', 'Copy content to the cloud clipboard', (yargs) => {
        yargs.positional('name', { type: 'string', describe: 'File name' })
    })
    .command('paste <name>', 'Paste content from the cloud clipboard', (yargs) => {
        yargs.positional('name', { type: 'string', describe: 'File name' })
    })
    .command('clear', 'Clear the cloud clipboard')
    .help().argv

const configPath = _resolve(process.env.HOME || process.env.USERPROFILE || '', '.cloudclip.json')

const handleError = (error: unknown) => {
    if (error instanceof Error) {
        console.error(`Error: ${error.message}`)
    } else {
        console.error(`Error: ${error}`)
    }
}

const readStdin = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
        let data = ''
        process.stdin
            .on('data', (chunk) => (data += chunk))
            .on('end', () => resolve(data.trim()))
            .on('error', reject)
    })
}

const main = async () => {
    try {
        const argv = await argvPromise;
        switch (argv._[0]) {
            case 'init': {
                await init(configPath, argv.token as string, argv.gistId as string)
                break
            }
            case 'list': {
                await list(configPath)
                break
            }
            case 'copy': {
                const content = process.stdin.isTTY ? clipboardy.readSync() : await readStdin()
                await copy(configPath, argv.name as string, content)
                break
            }
            case 'paste': {
                await paste(configPath, argv.name as string)
                break
            }
            case 'clear': {
                await clear(configPath)
                break
            }
            default:
                console.log('Welcome to CloudyClipy 🌥️✂️')
                console.log('Use --help to see available commands')
                console.log("Developed with ♥ by '@Ru44'")
        }
    } catch (error) {
        handleError(error)
    }
}

main()
