'use strict';

const zlib = require('zlib');

module.exports = {
  encode,
  decode,
};

/**
 *
 * @param input
 * @returns {Promise.<Buffer>}
 */
function encode(input) {
  return new Promise((resolve, reject) => {
    zlib.deflateRaw(input, {}, (err, result) => {
      err ? reject(err) : resolve(result);
    })
  });
}

/**
 *
 * @param input
 * @returns {Promise.<Buffer>}
 */
function decode(input) {
  return new Promise((resolve, reject) => {
    zlib.inflateRaw(input, {}, (err, result) => {
      err ? reject(err) : resolve(result);
    })
  });
}
