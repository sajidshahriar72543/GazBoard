'use strict';

const {
  generateVaultKey,
  deriveKey,
  encrypt,
  decrypt
} = require('./crypto');

const vaultKey = generateVaultKey();
const key = deriveKey(vaultKey);

const original = 'Hello GazBoard! This is my secret note.';

console.log('Vault Key:');
console.log(vaultKey);

console.log('\nOriginal:');
console.log(original);

const result = encrypt(original, key);

console.log('\nEncrypted:');
console.log(result.encrypted.toString('hex'));

const recovered = decrypt(
  result.encrypted,
  key,
  result.iv,
  result.authTag
);

console.log('\nDecrypted:');
console.log(recovered);

console.log('\nSuccess:', original === recovered);

console.log('\nTesting wrong Vault Key...');

const wrongVaultKey = generateVaultKey();
const wrongKey = deriveKey(wrongVaultKey);

try {
  decrypt(
    result.encrypted,
    wrongKey,
    result.iv,
    result.authTag
  );

  console.log('ERROR: Wrong key was accepted!');
} catch (error) {
  console.log('Correctly rejected wrong key ✓');
}
