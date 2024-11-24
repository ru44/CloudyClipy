#!/usr/bin/env node

import { resolve as _resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import clipboardy from 'clipboardy'
import { CloudClip } from './utils/cloudClip'

// Cast argv to `any` to disable type checking on the object
const argv: any = yargs(hideBin(process.argv))
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

;(async () => {
    const configPath = _resolve(process.env.HOME || process.env.USERPROFILE || '', '.cloudclip.json')
    const cloudClip = new CloudClip(configPath)

    try {
        switch (argv._[0]) {
            case 'init': {
                await cloudClip.init(argv.token, argv.gistId)
                break
            }
            case 'list': {
                await cloudClip.list()
                break
            }
            case 'copy': {
                const content = process.stdin.isTTY
                    ? clipboardy.readSync() // Read from clipboard if no input is piped
                    : await new Promise((resolve, reject) => {
                          let data = ''
                          process.stdin
                              .on('data', (chunk) => (data += chunk))
                              .on('end', () => resolve(data.trim()))
                              .on('error', reject)
                      })
                await cloudClip.copy(argv.name, content)
                break
            }
            case 'paste': {
                await cloudClip.paste(argv.name)
                break
            }
            case 'clear': {
                await cloudClip.clear()
                break
            }
            default: {
                console.log('Welcome to CloudyClipy 🌥️✂️')
                console.log('Use --help to see available commands')
                console.log("Developed with ♥ by '@Ru44'");
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`)
        } else {
            console.error(`Error: ${error}`)
        }
    }
})()
