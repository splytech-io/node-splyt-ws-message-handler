# Splyt WebSocket Message Handler

## Implementation example

```js
'use strict';

const WebSocket = require('ws');
const SplytWSMessageHandler = require('@splytech-io/splyt-ws-message-handler');

//create websocket connection
const ws = new WebSocket(...);

const handler = new class extends SplytWSMessageHandler {
  async onPush(method, data) {
    //process push message
  }
  
  async onRequest(method, data) { 
    //process request message
    
    return /*response*/;
  }
};

ws.on('message', (message) => {

  //handle push/request/response messages from the server
  handler.incoming(ws, message);
  
});

ws.on('connect', () => {

  //send request to the server and output the response
  handlet.outgoing(ws, {
    type: 'request',
    method: 'passenger.config'
  }).then((result) => console.log(result));
  
});