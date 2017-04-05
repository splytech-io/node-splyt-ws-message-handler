'use strict';

const _ = require('lodash');
const coders = require('./coders');
const microtime = require('microtime');
const Message = require('./message');

module.exports = class Incoming extends Message {
  constructor(buffer) {
    super();

    this.raw = buffer;
    this.payload = JSON.parse(buffer);
    this.bytes_received = buffer.length;
    this.created_at = microtime.now();
    this.sent = null;

    this.validate();
  }

  /**
   *
   * @returns {{}}
   */
  createEncoderOptions() {
    const result = {};

    if (_.isArray(this.payload.accept) === true) {
      this.payload.accept.forEach((item) => {
        if (item.coder === 'zlib') {
          result.zlib = true;
        }
      });
    }

    return result;
  }

  /**
   *
   * @param options
   * @returns {Promise.<void>}
   */
  async decodeData(options) {
    if (this.payload.encoding === undefined) {
      return;
    }

    if (this.payload.data === undefined) {
      return;
    }

    this.payload.data = await coders.decode(this.payload.encoding, this.payload.data, options);
  }
};
