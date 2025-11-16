export default function handleError(error: any) {
	if (error instanceof Error) {
		console.error(`Error: ${error.message}`)
	} else {
		console.error(`Error: ${error}`)
	}
}
