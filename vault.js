'use strict';

// For now we're not actually using crypto directly in vault.js
// const crypto = require('node:crypto');

const { generateVaultKey, deriveKey } = require('./crypto');

class Vault {
  constructor() {
    this.vaultKey = null;
    this.encryptionKey = null;
  }

  create() {
    this.vaultKey = generateVaultKey();
    this.encryptionKey = deriveKey(this.vaultKey);

    return this.vaultKey;
  }

  unlock(vaultKey) {
    if (typeof vaultKey !== 'string' || !vaultKey.trim()) {
      throw new Error('Invalid Vault Key');
    }

    this.vaultKey = vaultKey.trim();
    this.encryptionKey = deriveKey(this.vaultKey);

    return true;
  }

  lock() {
    this.vaultKey = null;

    if (this.encryptionKey) {
      this.encryptionKey.fill(0);
    }

    this.encryptionKey = null;
  }

  isUnlocked() {
    return this.encryptionKey !== null;
  }

  getKey() {
    if (!this.encryptionKey) {
      throw new Error('Vault is locked');
    }

    return this.encryptionKey;
  }

  getVaultKey() {
    if (!this.vaultKey) {
      throw new Error('Vault is locked');
    }

    return this.vaultKey;
  }
}

module.exports = Vault;
