import crypto from 'crypto'

export function encrypt(text: string, secret: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', secret, secret.slice(0, 16))
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
}

export function decrypt(encrypted: string, secret: string): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', secret, secret.slice(0, 16))
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}
