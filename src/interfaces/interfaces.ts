export interface GistError {
	code: number
	message: string
}

export interface GistApiConfig {
	token: string
	baseUrl: string
	headers: {
		Authorization: string
		'Content-Type': string
	}
}

export interface GistFile {
	content: string
}

export interface Gist {
	id: string
	description: string
	files: Record<string, GistFile>
}

export interface CloudClipConfig {
	secretKey?: any
	token?: string
	gistId?: string
	defaultExpiration?: string
}

export interface ClipboardMetadata {
	content: string
	expiresAt?: number
	type?: 'text' | 'image'
	mimeType?: string
	filename?: string
}

export interface ExpirationTimeUnit {
	value: number
	unit: 'm' | 'h' | 'd'
}
