'use strict';

const chai = require('chai');
const sinon = require('sinon');
const chaiAsPromised = require('chai-as-promised');
const WSMessageHandler = require('./..');

chai.use(chaiAsPromised);
chai.should();

describe('all-tests', function () {
  it('should handle push from the client', async function () {
    const handler = new WSMessageHandler();
    const spy = sinon.spy();

    handler.on('push', async (ctx) => {
      spy();
    });

    await handler.incoming({
      socket: null,
      incoming: new WSMessageHandler.Incoming(JSON.stringify({
        type: 'push'
      }))
    });

    spy.calledOnce.should.equals(true);
  });

  it('should handle request from the client', async function () {
    const handler = new WSMessageHandler();
    const socket = { send: (payload, cb) => cb() };
    const spy = sinon.spy();

    sinon.spy(socket, 'send');

    handler.on('request', async (ctx) => {
      spy();

      return 100;
    });

    await handler.incoming({
      socket,
      incoming: new WSMessageHandler.Incoming(JSON.stringify({
        type: 'request'
      })),
    });

    spy.calledOnce.should.equals(true);
    socket.send.calledOnce.should.equals(true);
    socket.send.args[0][0].should.equals(JSON.stringify({ "type": "response", "success": true, "data": 100 }));
  });

  it('should handle not sent response msg', async function () {
    const spy2 = sinon.spy();
    const handler = new class extends WSMessageHandler {
      outgoing(ctx) {
        const promise = super.outgoing(ctx);

        promise.catch(() => null).then(() => {
          spy2();
          ctx.outgoing.sent.should.equals(false);
        });

        return promise;
      }
    };
    const socket = { send: (payload, cb) => cb(true) };
    const spy = sinon.spy();

    sinon.spy(socket, 'send');

    handler.on('request', async (ctx) => {
      spy();

      return 100;
    });

    await handler.incoming({
      socket,
      incoming: new WSMessageHandler.Incoming(JSON.stringify({
        type: 'request'
      })),
    }).catch((err) => err.should.equals(true));

    spy.calledOnce.should.equals(true);
    spy2.calledOnce.should.equals(true);
    socket.send.calledOnce.should.equals(true);
    socket.send.args[0][0].should.equals(JSON.stringify({ "type": "response", "success": true, "data": 100 }));
  });

  it('should send request-push', async function () {
    const spy = sinon.spy();
    const handler = new class extends WSMessageHandler {
      outgoing(ctx) {
        const promise = super.outgoing(ctx);

        promise.then(() => {
          spy();
          ctx.should.have.keys(['socket', 'incoming', 'outgoing']);
        });

        return promise;
      }
    };

    const socket = {
      send: (payload, cb) => {
        cb();
        process.nextTick(() => handler.incoming({
          socket,
          incoming: new WSMessageHandler.Incoming(JSON.stringify({
            id: JSON.parse(payload).id,
            type: 'response',
            success: true,
            data: { g: 9 }
          })),
        }));
      }
    };

    const ctx = {
      socket,
      outgoing: new WSMessageHandler.Outgoing({
        type: 'request',
        data: { a: 5 },
      })
    };

    const r = await handler.outgoing(ctx);

    r.g.should.equals(9);
    spy.calledOnce.should.equals(true);
  });

  it('should send push-push', async function () {
    const spy = sinon.spy();
    const handler = new class extends WSMessageHandler {
      outgoing(ctx) {
        const promise = super.outgoing(ctx);

        promise.then(() => {
          spy();
          ctx.should.have.keys(['socket', 'outgoing']);
        });

        return promise;
      }
    };

    const socket = {
      send: (payload, cb) => {
        cb();
      }
    };

    const ctx = {
      socket,
      outgoing: new WSMessageHandler.Outgoing({
        type: 'push',
        data: { a: 5 },
      })
    };

    await handler.outgoing(ctx);

    spy.calledOnce.should.equals(true);
  });

  it('should compress payload', async function () {
    const handler = new class extends WSMessageHandler {
      constructor() {
        super({ compress: true });
      }
    };

    const ctx = {
      socket: {
        send: (payload, cb) => {
          const json = JSON.parse(payload);

          json.data.should.equals('q1ZKVLJSMhgFIxoo1QIA');
          json.encoding.length.should.equals(2);
          cb();
        }
      },
      outgoing: new WSMessageHandler.Outgoing({
        type: 'push',
        data: { a: new Array(512).fill(0).join('') },
      }),
    };

    await handler.outgoing(ctx);
  });

  it('should decompress payload', async function () {
    const handler = new WSMessageHandler();

    handler.on('push', (ctx) => {
      ctx.should.have.keys(['socket', 'incoming']);
      ctx.incoming.payload.data.should.have.keys(['a']);
      ctx.incoming.payload.data.a.length.should.equals(512);
    });

    await handler.incoming({
      socket: null,
      incoming: new WSMessageHandler.Incoming(JSON.stringify({
        type: 'push',
        data: 'q1ZKVLJSMhgFIxoo1QIA',
        encoding: [{ coder: 'zlib' }, { coder: 'base64' }],
      })),
    });
  });
});
