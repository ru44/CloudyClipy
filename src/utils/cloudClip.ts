import { existsSync, readFileSync, writeFileSync } from 'fs'
import { CloudClipConfig } from '../interfaces/interfaces'
import { getGist, createGist, editGist } from './gistApi'
import { createGistApiConfig } from '../helpers/request'
import clipboardy from 'clipboardy'

function readConfig(configFile: string): CloudClipConfig {
    if (!existsSync(configFile)) {
        return {}
    }
    return JSON.parse(readFileSync(configFile, 'utf-8'))
}

function saveConfig(configFile: string, config: CloudClipConfig) {
    writeFileSync(configFile, JSON.stringify(config, null, 2))
}

function setToken(configFile: string, config: CloudClipConfig, token: string) {
    config.token = token
    saveConfig(configFile, config)
}

function setGistId(configFile: string, config: CloudClipConfig, gistId: string) {
    config.gistId = gistId
    saveConfig(configFile, config)
}

export const init = async (configFile: string, token: string, gistId: string | null = null) => {
    const config = readConfig(configFile)
    setToken(configFile, config, token)
    const apiConfig = createGistApiConfig(token)

    if (!gistId) {
        const placeholder = {
            '<clipboard>': { content: 'Your clipboard in the cloud.' }
        }
        const gist = await createGist(apiConfig, '<Clipboard>', placeholder)
        gistId = gist.id
        console.log(`New Gist created with ID: ${gistId}`)
    }
    setGistId(configFile, config, gistId!)
    console.log(`Configuration saved in: ${configFile}`)
}

export const list = async (configFile: string) => {
    const config = readConfig(configFile)
    if (!config.gistId) {
        throw new Error('Gist ID is not configured. Use `--init` first.')
    }
    const apiConfig = createGistApiConfig(config.token!)
    const gist = await getGist(apiConfig, config.gistId)
    console.log(`Gist ID: ${gist.id}`)
    console.log(`Description: ${gist.description}`)
    Object.entries(gist.files).forEach(([name, details]) => {
        const fileDetails = details as { size: number }
        console.log(`- ${name} (${fileDetails.size} bytes)`)
    })
}

export const copy = async (configFile: string, name: string, content: string) => {
    const config = readConfig(configFile)
    if (!config.gistId) {
        throw new Error('Gist ID is not configured. Use `--init` first.')
    }
    const apiConfig = createGistApiConfig(config.token!)
    const files = { [name]: { content } }
    await editGist(apiConfig, config.gistId, '<Clipboard>', files)
    console.log('Content copied to cloud clipboard.')
}

export const paste = async (configFile: string, name: string) => {
    const config = readConfig(configFile)
    if (!config.gistId) {
        throw new Error('Gist ID is not configured. Use `--init` first.')
    }
    const apiConfig = createGistApiConfig(config.token!)
    const gist = await getGist(apiConfig, config.gistId)
    const file = gist.files[name]
    if (!file) {
        throw new Error(`File "${name}" not found in the Gist.`)
    }
    clipboardy.writeSync(file.content)
    console.log('Content pasted to clipboard.')
}

export const clear = async (configFile: string) => {
    const config = readConfig(configFile)
    if (!config.gistId) {
        throw new Error('Gist ID is not configured. Use `--init` first.')
    }
    const apiConfig = createGistApiConfig(config.token!)
    const gist = await getGist(apiConfig, config.gistId)
    const files = Object.keys(gist.files).reduce((acc: { [key: string]: any }, name) => {
        acc[name] = null
        return acc
    }, {})
    await editGist(apiConfig, config.gistId, '<Clipboard>', files)
    console.log('Cloud clipboard cleared.')
}
