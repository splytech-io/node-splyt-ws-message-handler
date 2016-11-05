'use strict';

const co = require('co');
const bson = require('bson');
const Callbacks = require('@rainder/callbacks');
const CoEventEmitter = require('@rainder/co-event-emitter');
const coders = require('./coders');

module.exports = class WSMessageHandler extends CoEventEmitter {
  constructor(options = {}) {
    super();

    this.options = options;
    this.callbacks = new Callbacks('@splytech-io/splyt-ws-message-handler');
  }

  /**
   *
   * @param socket
   * @param buffer
   * @param options
   */
  incoming(socket, buffer, options) {
    const json = JSON.parse(buffer);

    return coders.decode(json.encoding, json.data, options).then((data) => {
      if (json.type === 'response') {
        return this._incomingResponse(json.id, json.success, data);
      }

      if (json.type === 'request') {
        return this._incomingRequest(socket, json.id, json.method, data);
      }

      if (json.type === 'push') {
        return this._incomingPush(socket, json.method, data);
      }

      throw new Error(`unknown payload type provided: ${json.type}`);
    });
  }

  /**
   *
   * @param socket
   * @param id
   * @param type
   * @param success
   * @param method
   * @param data
   * @param options
   * @returns {Promise.<TResult>}
   */
  outgoing(socket, { id, type, success, method, data }, options = {}) {
    if (this.options.compress && options.zlib === undefined) {
      options.zlib = this.options.compress;
    }

    return coders.encode(data, options).then(({ encoding, data }) => {
      const payload = { id, type, method, success, data, encoding };

      if (type === 'request' && payload.id === undefined) {
        payload.id = new bson.ObjectId().toString();
      }

      const send = new Promise((resolve, reject) => {
        socket.send(JSON.stringify(payload), (err) => {
          err ? reject(err) : resolve();
        });
      });

      return send.then(() => {
        if (payload.type === 'request' && payload.id !== undefined) {
          return this.callbacks.create(payload.id);
        }
      });
    });
  }

  /**
   *
   * @param id {String}
   * @param success {Boolean}
   * @param data {Object}
   * @private
   */
  _incomingResponse(id, success, data) {
    const callback = this.callbacks.getCallback(id);

    if (callback) {
      if (success) {
        callback.resolve(data);
      } else {
        callback.reject(data);
      }
    }
  }

  /**
   *
   * @param socket
   * @param id
   * @param method
   * @param data
   * @returns {Promise.<T>}
   * @private
   */
  _incomingRequest(socket, id, method, data) {
    return this.call('request', method, data, socket)
      .then((result) => this.outgoing(socket, {
        id: id,
        type: 'response',
        success: true,
        data: result,
      }))
      .catch((err) => this.outgoing(socket, {
        id: id,
        type: 'response',
        success: false,
        data: err,
      }));
  }


  /**
   *
   * @returns {*}
   */
  _incomingPush(socket, method, data) {
    return this.call('push', method, data, socket)
      .catch((err) => this.outgoing(socket, {
        type: 'push',
        method: 'system.error',
        data: {
          errno: err.errno,
          errgr: err.errgr,
          message: err.message,
          description: err.description,
          info: {
            method,
            data,
          },
        },
      }));
  }

  /**
   *
   */
  onRequest() {
    throw new Error('request is not implemented')
  }

  /**
   *
   */
  onPush() {
    throw new Error('push is not implemented');
  }
};
