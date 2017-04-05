'use strict';

const bson = require('bson');
const coders = require('./coders');
const microtime = require('microtime');
const Message = require('./message');
const C = require('./constants');

module.exports = class Outgoing extends Message {
  constructor(payload) {
    super();

    this.raw = null;
    this.payload = payload;
    this.bytes_sent = null;
    this.created_at = microtime.now();
    this.sent = null;

    if (this.typeEquals(C.TYPE_REQUEST) && payload.id === undefined) {
      payload.id = new bson.ObjectId().toString();
    }

    this.validate();
  }

  /**
   *
   * @param options
   * @returns {Promise.<void>}
   */
  async encodeData(options) {
    const { encoding, data } = await coders.encode(this.payload.data, options);

    this.payload.data = data;
    this.payload.encoding = encoding;
    this.raw = JSON.stringify(this.payload);
  }
}
