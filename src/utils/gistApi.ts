import { GistApiConfig, GistFile } from '../interfaces/interfaces'
import { request } from '../helpers/request'

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
