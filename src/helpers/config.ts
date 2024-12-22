import { existsSync, readFileSync, writeFileSync } from 'fs'
import { CloudClipConfig } from '../interfaces/interfaces'
import crypto from 'crypto'

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

export function setSecretKey(configFile: string, config: CloudClipConfig, secretKey: string) {
    config.secretKey = secretKey
    saveConfig(configFile, config)
}


export function padSecret(secret: string): string {
    if (secret.length < 32) {
        const padding = crypto
            .randomBytes(32 - secret.length)
            .toString('hex')
            .slice(0, 32 - secret.length)
        return secret + padding
    }
    return secret
}