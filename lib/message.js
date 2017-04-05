'use strict';

const C = require('./constants');

module.exports = class Message {
  /**
   *
   * @param type
   * @returns {boolean}
   */
  typeEquals(type) {
    return this.payload.type === type;
  }

  /**
   *
   */
  validate() {
    if (!C.TYPES.includes(this.payload.type)) {
      throw new Error(`unknown payload type provided: ${this.payload.type}`);
    }
  }
};
