'use strict';

const Vault = require('./vault');
const {
  encryptBoard,
  decryptBoard
} = require('./board-crypto');

const vault = new Vault();

console.log('Creating vault...');
const vaultKey = vault.create();

console.log('Vault unlocked:', vault.isUnlocked());

const key = vault.getKey();

console.log('Key type:', typeof key);
console.log('Is Buffer:', Buffer.isBuffer(key));
console.log('Key length:', key?.length);

const original = JSON.stringify({
  id: 'test-board',
  name: 'Encryption Test',
  objects: [
    { type: 'stroke', x: 100, y: 200 }
  ]
});

console.log('\nOriginal:');
console.log(original);

console.log('\nEncrypting...');

const encrypted = encryptBoard(original, key);

console.log('Encrypted:');
console.log(encrypted);

console.log('\nDecrypting...');

const decrypted = decryptBoard(encrypted, key);

console.log('Decrypted:');
console.log(decrypted);

console.log('\nMatch:', decrypted === original);

console.log('\nTesting wrong key...');

const wrongVault = new Vault();
wrongVault.create();

try {
  decryptBoard(encrypted, wrongVault.getKey());
  console.log('ERROR: Wrong key decrypted the board!');
} catch (error) {
  console.log('Wrong key rejected ✓');
}
