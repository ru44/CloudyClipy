#!/usr/bin/env node

import handleCommand from './utils/commandHandler.ts'
import handleError from './utils/errorHandler.ts'
import { getArgv } from './utils/listOfCommandHandler.ts'

async function main() {
	try {
		const argv = await getArgv()
		await handleCommand(argv._[0], argv)
	} catch (error) {
		handleError(error)
	}
}

main()
