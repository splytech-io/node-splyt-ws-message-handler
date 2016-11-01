'use strict';

const crypto = require('crypto');
const bson = require('bson');

module.exports = {
  encode,
  decode,
};

/**
 *
 * @param input
 * @returns {*}
 */
function *encode(input, algorithmName, secret) {
  const password = crypto.createHash('md5').update(secret).digest();

  if (algorithmName === 'aes-128-ctr') {
    const iv = Buffer.concat([
      new Buffer(new bson.ObjectId().toString(), 'hex'),
      new Buffer(4),
    ]);

    const cipher = crypto.createCipheriv(algorithmName, password, iv);

    return asyncCipher(cipher, input).then((result) => {
      return Buffer.concat([iv, result]);
    });
  }

  if (algorithmName === 'aes-128-gcm') {
    const iv = new Buffer(new bson.ObjectId().toString(), 'hex');
    const cipher = crypto.createCipheriv(algorithmName, password, iv);

    return asyncCipher(cipher, input).then((result) => {
      return Buffer.concat([iv, cipher.getAuthTag(), result]);
    });
  }

}

/**
 *
 * @param input
 * @returns {*}
 */
function decode(input, algorithmName, secret) {
  const password = crypto.createHash('md5').update(secret).digest();

  if (algorithmName === 'aes-128-ctr') {
    const iv = input.slice(0, 16);
    const content = input.slice(16);

    const cipher = crypto.createDecipheriv(algorithmName, password, iv);

    return asyncCipher(cipher, content);
  }

  if (algorithmName === 'aes-128-gcm') {
    const iv = input.slice(0, 12);
    const authTag = input.slice(12, 28);
    const content = input.slice(28);

    const cipher = crypto.createDecipheriv(algorithmName, password, iv);

    cipher.setAuthTag(authTag);

    return asyncCipher(cipher, content);
  }
}

/**
 *
 * @param cipher {WritableStream}
 * @param content {Buffer}
 * @returns {Promise}
 */
function asyncCipher(cipher, content) {
  return new Promise((resolve, reject) => {
    let result = new Buffer([]);

    cipher.on('data', (data) => result = Buffer.concat([result, data]));
    cipher.on('end', () => resolve(result));
    cipher.on('error', reject);

    cipher.write(content);
    cipher.end();
  });
}
