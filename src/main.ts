#!/usr/bin/env node

import handleCommand from './utils/commandHandler'
import handleError from './utils/errorHandler'
import { getArgv } from './utils/listOfCommandHandler'

async function main() {
    try {
        const argv = await getArgv()
        await handleCommand(argv._[0], argv)
    } catch (error) {
        handleError(error)
    }
}

main()