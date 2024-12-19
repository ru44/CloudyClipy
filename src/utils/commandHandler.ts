import { init, list, listWithContent, copy, paste, clear, purge } from './cloudClip'
import { resolve as _resolve } from 'path'
import clipboardy from 'clipboardy'

const configPath = _resolve(process.env.HOME || process.env.USERPROFILE || '', '.cloudclip.json')

async function readStdin() {
    return new Promise((resolve, reject) => {
        let data = ''
        process.stdin
            .on('data', (chunk) => (data += chunk))
            .on('end', () => resolve(data.trim()))
            .on('error', reject)
    })
}

export default async function handleCommand(command: any, args: any) {
    const content: any = process.stdin.isTTY ? clipboardy.readSync() : await readStdin()

    const actions: any = {
        i: () => init(configPath, args.token, args.gistId),
        init: () => init(configPath, args.token, args.gistId),
        l: () => list(configPath),
        list: () => list(configPath),
        lc: () => listWithContent(configPath),
        listWithContent: () => listWithContent(configPath),
        c: () => copy(configPath, args.name, content),
        copy: () => copy(configPath, args.name, content),
        p: () => paste(configPath, args.name),
        paste: () => paste(configPath, args.name),
        r: () => clear(configPath),
        clear: () => clear(configPath),
        pr: () => purge(configPath),
        purge: () => purge(configPath)
    }

    const action: any = actions[command]
    if (action) {
        await action()
    } else {
        console.log('Welcome to CloudyClipy 🌥️✂️')
        console.log('Use --help to see available commands')
        console.log("Developed with ♥ by '@Ru44'")
    }
}
