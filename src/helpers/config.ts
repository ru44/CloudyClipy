import { existsSync, readFileSync, writeFileSync } from 'fs'
import { CloudClipConfig } from '../interfaces/interfaces'

function saveConfig(configFile: string, config: CloudClipConfig) {
    writeFileSync(configFile, JSON.stringify(config, null, 2))
}

export function readConfig(configFile: string): CloudClipConfig {
    if (!existsSync(configFile)) {
        return {}
    }
    return JSON.parse(readFileSync(configFile, 'utf-8'))
}

export function setToken(configFile: string, config: CloudClipConfig, token: string) {
    config.token = token
    saveConfig(configFile, config)
}

export function setGistId(configFile: string, config: CloudClipConfig, gistId: string) {
    config.gistId = gistId
    saveConfig(configFile, config)
}
