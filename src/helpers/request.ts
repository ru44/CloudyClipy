import axios from 'axios'

import type { GistApiConfig, GistError } from '../interfaces/interfaces.ts'

export async function request(
	config: GistApiConfig,
	method: string,
	endpoint: string,
	params = {},
	data: any = null
): Promise<any> {
	try {
		const url = `${config.baseUrl}${endpoint}`
		const options = { method, headers: config.headers, params, data }
		const response = await axios(url, options)
		return response.data
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			throw {
				code: error.response.status,
				message: error.response.data.message
			} as GistError
		}
		throw { code: -1, message: (error as Error).message } as GistError
	}
}

export const createGistApiConfig = (token: string): GistApiConfig => ({
	token,
	baseUrl: 'https://api.github.com',
	headers: {
		Authorization: `token ${token}`,
		'Content-Type': 'application/json'
	}
})
