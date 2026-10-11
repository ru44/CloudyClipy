#!/usr/bin/env node

import version from '../package.json' with { type: 'json' }
import { UPDATE_CACHE_PATH } from './helpers/config.ts'
import handleCommand from './utils/commandHandler.ts'
import handleError from './utils/errorHandler.ts'
import { getArgv } from './utils/listOfCommandHandler.ts'
import {
	checkForUpdate,
	formatUpdateMessage,
	shouldCheckForUpdates
} from './utils/updateCheck.ts'

async function main() {
	// Runs alongside the command, so it's usually done by the time we need it
	const update = shouldCheckForUpdates()
		? checkForUpdate(version.version, UPDATE_CACHE_PATH)
		: Promise.resolve(null)

	try {
		const argv = await getArgv()
		await handleCommand(argv._[0], argv)
	} catch (error) {
		handleError(error)
	}

	const latest = await update
	if (latest) {
		console.error(formatUpdateMessage(version.version, latest))
	}
}

main()
