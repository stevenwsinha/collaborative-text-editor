const ShareDB = require('sharedb');
const richText = require('rich-text');
const WebSocket = require('ws');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');

ShareDB.types.register(richText.type)
var backend = new ShareDB();
createDoc(connectToSessions)

function createDoc(callback) {
    let connection = backend.connect

    // fetch the doc with id 'main' from collection 'milestone1'
    var doc = connection.get('milestone1', 'main')

    callback()
}

function connectToSessions() {
    let wss = new WebSocket.Server({port: 8080})

    wss.on('connection', function connection(ws){
        let stream = new WebSocketJSONStream(ws);
        backend.listen(stream)    
    })
}