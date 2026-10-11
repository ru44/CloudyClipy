import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { CloudClipConfig } from '../interfaces/interfaces.ts'

const homeDir = process.env.HOME || process.env.USERPROFILE || ''

export const CONFIG_PATH = resolve(homeDir, '.cloudclip.json')
export const UPDATE_CACHE_PATH = resolve(homeDir, '.cloudclip-update.json')

function saveConfig(configFile: string, config: CloudClipConfig) {
	writeFileSync(configFile, JSON.stringify(config, null, 2))
}

export function readConfig(configFile: string): CloudClipConfig {
	if (!existsSync(configFile)) {
		return {}
	}
	return JSON.parse(readFileSync(configFile, 'utf-8'))
}

export function setToken(
	configFile: string,
	config: CloudClipConfig,
	token: string
) {
	config.token = token
	saveConfig(configFile, config)
}

export function setGistId(
	configFile: string,
	config: CloudClipConfig,
	gistId: string
) {
	config.gistId = gistId
	saveConfig(configFile, config)
}

export function setSecretKey(
	configFile: string,
	config: CloudClipConfig,
	secretKey: string
) {
	config.secretKey = secretKey
	saveConfig(configFile, config)
}

export function setDefaultExpiration(
	configFile: string,
	config: CloudClipConfig,
	expiration: string
) {
	config.defaultExpiration = expiration
	saveConfig(configFile, config)
}

export function getDefaultExpiration(
	config: CloudClipConfig
): string | undefined {
	return config.defaultExpiration
}
