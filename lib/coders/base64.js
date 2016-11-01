'use strict';

module.exports = {
  encode,
  decode,
};

/**
 *
 * @param input
 * @returns {Promise.<String>}
 */
function encode(input) {
  return Promise.resolve(new Buffer(input).toString('base64'));
}

/**
 *
 * @param input
 * @returns {Promise.<Buffer>}
 */
function decode(input) {
  return Promise.resolve(new Buffer(input, 'base64'));
}
