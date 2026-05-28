import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'

const ITERATIONS = 250_000
const KEY_BYTES = 32
const DIGEST = 'sha256'

function base64(buffer) {
  return Buffer.from(buffer).toString('base64')
}

function fromBase64(value) {
  return Buffer.from(value, 'base64')
}

function deriveKey(password, salt) {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_BYTES, DIGEST)
}

export function encryptPayloadString(plainText, password, options = {}) {
  if (!password) throw new Error('SIGNAL_DESK_PASSWORD is required to encrypt data')

  const salt = options.salt ?? randomBytes(16)
  const iv = options.iv ?? randomBytes(12)
  const key = deriveKey(password, salt)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])

  return {
    schemaVersion: 1,
    algorithm: 'AES-GCM',
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: ITERATIONS,
      salt: base64(salt),
    },
    cipher: {
      iv: base64(iv),
      tag: base64(cipher.getAuthTag()),
    },
    ciphertext: base64(ciphertext),
  }
}

export function decryptPayloadString(envelope, password) {
  const salt = fromBase64(envelope.kdf.salt)
  const iv = fromBase64(envelope.cipher.iv)
  const key = deriveKey(password, salt)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(fromBase64(envelope.cipher.tag))
  return Buffer.concat([
    decipher.update(fromBase64(envelope.ciphertext)),
    decipher.final(),
  ]).toString('utf8')
}

export async function writePrivateDataBundle({ dist, password, requirePassword = false }) {
  if (!password) {
    if (requirePassword) throw new Error('SIGNAL_DESK_PASSWORD must be configured for protected builds')
    return { protected: false }
  }

  const signalsPath = new URL('data/signals.json', dist)
  const historyPath = new URL('data/history.json', dist)
  const encryptedPath = new URL('data/signals.enc.json', dist)
  const plainText = await readFile(signalsPath, 'utf8')
  const encryptedPayload = encryptPayloadString(plainText, password)

  await writeFile(encryptedPath, `${JSON.stringify(encryptedPayload, null, 2)}\n`)
  await rm(signalsPath, { force: true })
  await rm(historyPath, { force: true })

  return { protected: true }
}
