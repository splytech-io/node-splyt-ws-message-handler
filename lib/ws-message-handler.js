'use strict';

const microtime = require('microtime');
const bson = require('bson');
const Callbacks = require('@rainder/callbacks');
const CoEventEmitter = require('@rainder/co-event-emitter');
const Incoming = require('./incoming');
const Outgoing = require('./outgoing');
const coders = require('./coders');
const C = require('./constants');

class WSMessageHandler extends CoEventEmitter {
  constructor(options = {}) {
    super();

    this.options = options;
    this.callbacks = new Callbacks('@splytech-io/splyt-ws-message-handler');
  }

  /**
   *
   * @param ctx
   * @param options
   * @returns {Promise.<*>}
   */
  async incoming(ctx, options = {}) {
    await ctx.incoming.decodeData(options);

    if (ctx.incoming.typeEquals(C.TYPE_RESPONSE)) {
      return await this._incomingResponse(ctx);
    }

    if (ctx.incoming.typeEquals(C.TYPE_REQUEST)) {
      return await this._incomingRequest(ctx);
    }

    if (ctx.incoming.typeEquals(C.TYPE_PUSH)) {
      return await this._incomingPush(ctx);
    }
  }

  /**
   *
   * @param ctx
   * @param options
   * @returns {Promise.<TResult>}
   */
  async outgoing(ctx, options = {}) {
    if (this.options.compress === true && options.zlib === undefined) {
      options.zlib = true;
    }

    await ctx.outgoing.encodeData(options);

    const send = new Promise((resolve, reject) => {
      ctx.socket.send(ctx.outgoing.raw, (err) => {
        ctx.outgoing.sent = err === undefined;
        ctx.outgoing.bytes_sent = ctx.outgoing.raw.length;

        err ? reject(err) : resolve();
      });
    });

    if (ctx.outgoing.typeEquals(C.TYPE_REQUEST)) {
      const callback = this.callbacks.create(ctx.outgoing.payload.id);

      return send.then(() => callback.then((incoming) => {
        ctx.incoming = incoming;

        if (incoming.payload.success === true) {
          return incoming.payload.data;
        } else {
          throw incoming.payload.data;
        }
      }));
    }

    return send;
  }

  /**
   *
   * @param ctx
   * @private
   */
  _incomingResponse(ctx) {
    const callback = this.callbacks.getCallback(ctx.incoming.payload.id);

    if (callback === void 0 || !ctx.incoming.typeEquals(C.TYPE_RESPONSE)) {
      return;
    }

    callback.resolve(ctx.incoming);
  }

  /**
   *
   * @param ctx {socket, incoming}
   * @returns {Promise.<TResult>}
   * @private
   */
  _incomingRequest(ctx) {
    const options = ctx.incoming.createEncoderOptions();

    const success = (result) => {
      ctx.outgoing = new Outgoing({
        id: ctx.incoming.payload.id,
        type: C.TYPE_RESPONSE,
        success: true,
        data: result,
      });

      return this.outgoing(ctx, options);
    }

    const fail = (err) => {
      ctx.outgoing = new Outgoing({
        id: ctx.incoming.payload.id,
        type: C.TYPE_RESPONSE,
        success: false,
        data: err,
      });

      return this.outgoing(ctx, options);
    };

    return this.call(C.TYPE_REQUEST, ctx).then(success, fail);
  }

  /**
   *
   * @param socket
   * @param payload
   * @returns {Promise.<TResult>}
   * @private
   */
  _incomingPush(ctx) {
    const fail = (err) => {
      ctx.outgoing = new Outgoing({
        type: C.TYPE_PUSH,
        method: 'system.error',
        data: {
          errno: err.errno,
          errgr: err.errgr,
          message: err.message,
          description: err.description,
          info: { payload: ctx.incoming },
        },
      });

      return this.outgoing(ctx)
    };

    return this.call(C.TYPE_PUSH, ctx).catch(fail);
  }
}

module.exports = WSMessageHandler;
WSMessageHandler.Incoming = Incoming;
WSMessageHandler.Outgoing = Outgoing;
WSMessageHandler.C = C;
