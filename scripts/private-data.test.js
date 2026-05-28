import assert from 'node:assert/strict'
import test from 'node:test'
import { decryptPayloadString, encryptPayloadString } from './private-data.js'

test('encrypts signal data without leaving cleartext in the envelope', () => {
  const plainText = JSON.stringify({ title: 'Secret usage billing pain' })
  const envelope = encryptPayloadString(plainText, 'correct horse battery staple', {
    salt: Buffer.alloc(16, 1),
    iv: Buffer.alloc(12, 2),
  })

  assert.equal(envelope.schemaVersion, 1)
  assert.equal(JSON.stringify(envelope).includes('Secret usage billing pain'), false)
  assert.equal(decryptPayloadString(envelope, 'correct horse battery staple'), plainText)
  assert.throws(() => decryptPayloadString(envelope, 'wrong password'))
})
