'use strict';

const crypto = require('node:crypto');

// Generate a random 256-bit encryption key
function generateKey() {
  return crypto.randomBytes(32);
}

// Encrypt text using AES-256-GCM
function encrypt(text, key) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

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

// Decrypt text using AES-256-GCM
function decrypt(encrypted, key, iv, authTag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  generateKey,
  encrypt,
  decrypt
};