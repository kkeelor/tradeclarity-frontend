// lib/encryption.js
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const ITERATIONS = 100000

function getKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha512')
}

export function encrypt(text) {
  const password = process.env.ENCRYPTION_KEY
  if (!password) {
    throw new Error('ENCRYPTION_KEY not found in environment variables')
  }

  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = getKey(password, salt)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  // Combine salt + iv + tag + encrypted
  return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64')
}

export function decrypt(encryptedData) {
  const password = process.env.ENCRYPTION_KEY
  if (!password) {
    throw new Error('ENCRYPTION_KEY not found in environment variables')
  }

  const buffer = Buffer.from(encryptedData, 'base64')

  const salt = buffer.slice(0, SALT_LENGTH)
  const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  const key = getKey(password, salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, null, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
