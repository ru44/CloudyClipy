export default function handleError(error: unknown) {
	if (error instanceof Error) {
		console.error(`Error: ${error.message}`)
		return
	}

	if (error && typeof error === 'object') {
		const err: any = error
		const code = err.code
		const message = err.message || err.error || JSON.stringify(err)
		if (code !== undefined) {
			console.error(`Error (${code}): ${message}`)
		} else {
			console.error(`Error: ${message}`)
		}
		return
	}

	console.error(`Error: ${String(error)}`)
}
