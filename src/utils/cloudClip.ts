import path from 'node:path'
import clipboardy from 'clipboardy'
import shell from 'shelljs'
import {
	padSecret,
	readConfig,
	setGistId,
	setSecretKey,
	setToken
} from '../helpers/config.ts'
import { decrypt, encrypt } from '../helpers/encrypt.ts'
import { createGistApiConfig } from '../helpers/request.ts'
import { createGist, editGist, getGist } from './gistApi.ts'

const error = 'Gist ID is not configured. Use `--init` first.'

export async function init(
	configFile: string,
	token: string,
	secretKey: string | null = null,
	gistId: string | null = null
) {
	const config = readConfig(configFile)
	setToken(configFile, config, token)
	const apiConfig = createGistApiConfig(token)

	if (!gistId) {
		const placeholder = {
			Cclip: { content: 'Your clipboard in the cloud.' }
		}
		const gist = await createGist(apiConfig, 'Cclip', placeholder)
		gistId = gist.id
		console.log(`New Gist created with ID: ${gistId}`)
	}
	if (!gistId) {
		throw new Error('Failed to determine Gist ID.')
	}
	setGistId(configFile, config, gistId)

	let paddedSecretKey = secretKey || gistId
	if (paddedSecretKey.length < 32) {
		paddedSecretKey = padSecret(paddedSecretKey)
		setSecretKey(configFile, config, paddedSecretKey)
	} else {
		setSecretKey(configFile, config, paddedSecretKey)
	}

	console.log(`Configuration saved in: ${configFile}`)
}

export async function list(configFile: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist = await getGist(apiConfig, config.gistId)
	console.log(`Gist ID: ${gist.id}`)
	console.log(`Description: ${gist.description}`)
	console.log('Files:')
	Object.entries(gist.files).forEach(([name, details]) => {
		const fileDetails = details as { size: number }
		console.warn(`- ${name} (${fileDetails.size} bytes)`)
	})
}

export async function listWithContent(configFile: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist = await getGist(apiConfig, config.gistId)
	console.log(`Gist ID: ${gist.id}`)
	console.log(`Description: ${gist.description}`)
	console.log('Files:')
	Object.entries(gist.files).forEach(([name, details]) => {
		const fileDetails = details as { size: number; content: string }
		console.warn(`- ${name} (${fileDetails.size} bytes)`)
		console.log(decrypt(fileDetails.content, config.secretKey || gist.id))
	})
}

export async function copy(configFile: string, name: string, content: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error('error')
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const encryptedContent = encrypt(content, config.secretKey || config.gistId)
	const files = { [name]: { content: encryptedContent } }
	await editGist(apiConfig, config.gistId, 'Cclip', files)
	console.log('Content copied to cloud clipboard.')
}

export async function paste(configFile: string, name: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist = await getGist(apiConfig, config.gistId)
	const file = gist.files[name]
	if (!file) {
		throw new Error(`File "${name}" not found in the Gist.`)
	}
	const decryptedContent = decrypt(
		file.content,
		config.secretKey || config.gistId
	)
	clipboardy.writeSync(decryptedContent)
	console.log('Content pasted to clipboard.')
}

export async function clear(configFile: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error(error)
	}
	const token = config.token
	if (!token) {
		throw new Error('Token is not configured.')
	}
	const apiConfig = createGistApiConfig(token)
	const gist = await getGist(apiConfig, config.gistId)
	const files = Object.keys(gist.files).reduce(
		(acc: { [key: string]: any }, name) => {
			acc[name] = null
			return acc
		},
		{}
	)
	await editGist(apiConfig, config.gistId, 'Cclip', files)
	console.log('Cloud clipboard cleared.')
}

export async function purge(configFile: string) {
	const config = readConfig(configFile)
	if (!config.gistId) {
		throw new Error('Gist ID is missing in the config.')
	}
	const gistId = config.gistId
	const token = config.token

	if (!token) {
		throw new Error('Token is not configured.')
	}

	const gistUrl = `https://${token}@gist.github.com/${gistId}.git`
	const tempDir = path.join(shell.tempdir(), `gist-${gistId}`)

	try {
		// Step 1: Clone the gist repository
		console.log(`Cloning gist ${gistId}...`)
		shell.rm('-rf', tempDir) // Clean up the temp directory if it exists
		if (shell.exec(`git clone ${gistUrl} ${tempDir}`).code !== 0) {
			throw new Error('Failed to clone gist repository.')
		}

		shell.cd(tempDir)

		// Step 2: Find the first commit
		console.log('Finding the first commit...')
		const firstCommit = shell
			.exec('git rev-list --max-parents=0 HEAD', { silent: true })
			.stdout.trim()

		if (!firstCommit) {
			throw new Error('Could not find the first commit.')
		}
		console.log(`First commit: ${firstCommit}`)

		// Step 3: Clean the repository
		console.log('Cleaning the repository...')
		if (shell.exec(`git rm -rf --cached .`, { silent: true }).code !== 0) {
			console.warn(
				'Warning: Failed to remove files/folders using git, proceeding to git clean'
			)
		}

		if (shell.exec('git clean -fdx', { silent: true }).code !== 0) {
			throw new Error('Failed to clean the repository.')
		}

		// Step 4: Attempt to reset, handling merge conflicts automatically
		console.log('Resetting the repository to the first commit...')
		let resetResult = shell.exec(`git reset --hard ${firstCommit}`, {
			silent: false
		})

		if (resetResult.code !== 0) {
			console.warn(
				'Initial reset failed. Attempting automatic conflict resolution...'
			)
			console.warn('stdout:', resetResult.stdout)
			console.warn('stderr:', resetResult.stderr)

			// Resolve conflicts automatically using "ours" strategy
			if (
				shell.exec(`git merge -s recursive -X ours ${firstCommit}`, {
					silent: false
				}).code !== 0
			) {
				const mergeResult = shell.exec(
					`git merge -s recursive -X ours ${firstCommit}`,
					{ silent: false }
				)
				console.error('Automatic conflict resolution failed:')
				console.error('stdout:', mergeResult.stdout)
				console.error('stderr:', mergeResult.stderr)
				throw new Error(
					'Failed to resolve conflicts and reset to the first commit.'
				)
			}

			// Try reset again after resolving conflicts
			resetResult = shell.exec(`git reset --hard ${firstCommit}`, {
				silent: false
			})
			if (resetResult.code !== 0) {
				console.error('Reset failed after conflict resolution:')
				console.error('stdout:', resetResult.stdout)
				console.error('stderr:', resetResult.stderr)
				throw new Error(
					'Failed to reset to the first commit after conflict resolution.'
				)
			}
		}

		// Step 5: Force push the reset state to the remote repository
		console.log('Force-pushing to reset the remote repository...')
		if (shell.exec('git push -f', { silent: true }).code !== 0) {
			throw new Error('Failed to force-push changes to gist.')
		}

		console.log(
			'Gist repository has been successfully reset to the first commit.'
		)
	} catch (err: any) {
		console.error(`Error during purge: ${err.message}`)
		if (err.stderr) {
			console.error(err.stderr)
		}
	} finally {
		// Step 6: Clean up the local temp directory
		shell.cd(path.join(shell.tempdir(), '..'))
		shell.rm('-rf', tempDir)
	}
}
