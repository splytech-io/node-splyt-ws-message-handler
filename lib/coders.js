'use strict';

const co = require('co');
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

function decode(encoding, data) {
  if (!encoding) {
    return Promise.resolve(data);
  }

  return co(function *() {
    for (let i = encoding.length - 1; i >= 0; i--) {
      const encodingParams = encoding[i];

      data = yield coders[encodingParams.coder].decode(data);
    }

    return JSON.parse(data);
  });
}

/**
 *
 * @param data
 * @param options
 * @returns {*}
 */
function encode(data, options) {
  options = _.extend({}, options, this.options);

  return co(function *() {
    const encoding = [];

    let str = JSON.stringify(data);

    if (options.pkcrypt) {
      str = yield coders.pkcrypt.encode(str, options.pkcrypt.algorithm, options.pkcrypt.secret);

      encoding.push({ coder: 'pkcrypt', options: { algorithm: options.pkcrypt.algorithm } });
    }

    if (options.zlib && str.length > 128) {
      str = yield coders.zlib.encode(str);

      encoding.push({ coder: 'zlib' });
    }

    if (encoding.length) {
      str = yield coders.base64.encode(str);
      encoding.push({ coder: 'base64' });

      data = str;

      return { data, encoding };
    }

    return { data };
  });
}