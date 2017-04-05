'use strict';

const _ = require('lodash');

const coders = {
  zlib: require('./coders/zlib'),
  base64: require('./coders/base64'),
  pkcrypt: require('./coders/pkcrypt'),
};

module.exports = {
  decode,
  encode,
};

/**
 *
 * @param encoding
 * @param data
 * @param options
 * @returns {Promise.<*>}
 */
async function decode(encoding, data, options = {}) {
  if (_.isArray(encoding) === false) {
    return data;
  }

  for (let i = encoding.length - 1; i >= 0; i--) {
    const encodingParams = encoding[i];

    data = await coders[encodingParams.coder].decode(data, _.extend({}, encodingParams.options, options));
  }

  return JSON.parse(data);
}

/**
 *
 * @param data
 * @param options
 * @returns {*}
 */
async function encode(data, options = {}) {
  const encoding = [];
  const temp = { str: undefined };

  if (options.pkcrypt !== undefined) {
    if (temp.str === undefined) {
      temp.str = JSON.stringify(data);
    }

    temp.str = await coders.pkcrypt.encode(temp.str, options.pkcrypt);

    encoding.push({ coder: 'pkcrypt', options: { algorithm: options.pkcrypt.algorithm } });
  }

  if (options.zlib === true) {
    if (temp.str === undefined) {
      temp.str = JSON.stringify(data);
    }

    if (temp.str.length > 128) {
      temp.str = await coders.zlib.encode(temp.str);

      encoding.push({ coder: 'zlib' });
    }
  }

  if (encoding.length > 0) {
    temp.str = await coders.base64.encode(temp.str);
    encoding.push({ coder: 'base64' });

    data = temp.str;

    return { data, encoding };
  }

  return { data };
}
