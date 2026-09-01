'use strict';

const crypto = require('node:crypto');

// Characters that are easy to distinguish when writing/reading the key.
// We deliberately exclude 0, O, 1, and I.
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a cryptographically random Vault Key.
 *
 * Example:
 * GZB-7K4P-29XM-Q8FD-3R7N
 */
function generateVaultKey() {
  const groups = [];

  for (let group = 0; group < 5; group++) {
    let value = '';

    for (let i = 0; i < 4; i++) {
      const index = crypto.randomInt(0, KEY_ALPHABET.length);
      value += KEY_ALPHABET[index];
    }

    groups.push(value);
  }

  return 'GZB-' + groups.join('-');
}

/**
 * Convert a Vault Key into a cryptographic key.
 *
 * We don't use the Vault Key directly as the AES key.
 * Instead, we derive a 256-bit key from it.
 */
function deriveKey(vaultKey) {
  return crypto
    .createHash('sha256')
    .update(vaultKey, 'utf8')
    .digest();
}

/**
 * Encrypt text using AES-256-GCM.
 */
function encrypt(text, key) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return {
    iv,
    encrypted,
    authTag
  };
}

/**
 * Decrypt text using AES-256-GCM.
 */
function decrypt(encrypted, key, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  generateVaultKey,
  deriveKey,
  encrypt,
  decrypt
};