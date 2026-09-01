'use strict';

const crypto = require('node:crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const VERSION = 1;

function encryptBoard(json, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new Error('Invalid encryption key');
  }

  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH
  });

  const encrypted = Buffer.concat([
    cipher.update(json, 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return JSON.stringify({
    version: VERSION,
    algorithm: ALGORITHM,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  });
}

function decryptBoard(payload, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new Error('Invalid encryption key');
  }

  const parsed = typeof payload === 'string'
    ? JSON.parse(payload)
    : payload;

  if (parsed.version !== VERSION) {
    throw new Error('Unsupported board encryption version');
  }

  const iv = Buffer.from(parsed.iv, 'base64');
  const tag = Buffer.from(parsed.tag, 'base64');
  const encrypted = Buffer.from(parsed.data, 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid board IV');
  }

  if (tag.length !== TAG_LENGTH) {
    throw new Error('Invalid board authentication tag');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    iv,
    { authTagLength: TAG_LENGTH }
  );

  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('utf8');
}

module.exports = {
  encryptBoard,
  decryptBoard
};