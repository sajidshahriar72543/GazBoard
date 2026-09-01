'use strict';

const Vault = require('./vault');

console.log('=== Device A ===');

const deviceA = new Vault();
const vaultKey = deviceA.create();

console.log('Vault Key:', vaultKey);
console.log('Device A unlocked:', deviceA.isUnlocked());


console.log('\n=== Device B ===');

const deviceB = new Vault();

deviceB.unlock(vaultKey);

console.log('Device B unlocked:', deviceB.isUnlocked());


console.log('\n=== Comparing encryption keys ===');

const keyA = deviceA.getKey();
const keyB = deviceB.getKey();

console.log('Device A key:', keyA.toString('hex'));
console.log('Device B key:', keyB.toString('hex'));

console.log('\nSame encryption key:', keyA.equals(keyB));


console.log('\n=== Cross-device encryption test ===');

const { encrypt, decrypt } = require('./crypto');

const note = 'This note was created on Device A.';

const encrypted = encrypt(note, keyA);

console.log('Device A encrypted the note.');

const decrypted = decrypt(
  encrypted.encrypted,
  keyB,
  encrypted.iv,
  encrypted.authTag
);

console.log('Device B decrypted the note:');
console.log(decrypted);

console.log('\nSuccess:', note === decrypted);