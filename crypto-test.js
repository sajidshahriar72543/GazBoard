'use strict';

const {
  generateKey,
  encrypt,
  decrypt
} = require('./crypto');

const key = generateKey();

const original = 'Hello GazBoard! This is my secret note.';

console.log('Original:');
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