# Splyt WebSocket Message Handler

## Implementation example

```js
'use strict';

const WebSocket = require('ws');
const SplytWSMessageHandler = require('@splytech-io/splyt-ws-message-handler');

//create websocket connection
const ws = new WebSocket(...);
const handler = new SplytWSMessageHandler();

ws.on('connect', (socket) => {

  socket.on('message', (message) => {
    //handle incoming push/request/response messages from the server
    handler.incoming({
      socket: socket,
      incoming: new SplytWSMessageHandler.Incoming(message),
    }).catch((err) => console.error(err));
  });

  //send push/request/response to the client
  handler.outgoing({
    socket,
    outgoing: new SplytWSMessageHandler.Outgoing({
      type: 'request',
      method: 'passenger.config',
    }),
  }).then((result) => console.log(result));

});
```
