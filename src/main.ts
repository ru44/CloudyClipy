#!/usr/bin/env node

import { getArgv } from './utils/listOfCommandHandler'
import handleCommand from './utils/commandHandler'
import handleError from './utils/errorHandler'

async function main() {
    try {
        const argv = await getArgv()
        await handleCommand(argv._[0], argv)
    } catch (error) {
        handleError(error)
    }
}

main()