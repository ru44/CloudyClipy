import { GistError, GistApiConfig, GistFile } from '../interfaces/interfaces'
import axios from 'axios'

export const createGistApiConfig = (token: string): GistApiConfig => ({
    token,
    baseUrl: 'https://api.github.com',
    headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
    }
})

const request = async (
    config: GistApiConfig,
    method: string,
    endpoint: string,
    params = {},
    data: any = null
): Promise<any> => {
    try {
        const url = `${config.baseUrl}${endpoint}`
        const options = { method, headers: config.headers, params, data }
        const response = await axios(url, options)
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            throw { code: error.response.status, message: error.response.data.message } as GistError
        }
        throw { code: -1, message: (error as Error).message } as GistError
    }
}

export const listGists = (config: GistApiConfig) => request(config, 'GET', '/gists')

export const getGist = (config: GistApiConfig, id: string) => request(config, 'GET', `/gists/${id}`)

export const createGist = (
    config: GistApiConfig,
    description: string,
    files: Record<string, GistFile>,
    isPublic = false
) => {
    const data = { description, public: isPublic, files }
    return request(config, 'POST', '/gists', {}, data)
}

export const editGist = (config: GistApiConfig, id: string, description: string, files: Record<string, GistFile>) => {
    const data = { description, files }
    return request(config, 'PATCH', `/gists/${id}`, {}, data)
}

export const deleteGist = (config: GistApiConfig, id: string) => request(config, 'DELETE', `/gists/${id}`)
