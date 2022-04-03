const http = require('http');
const express = require('express');
const ShareDB = require('sharedb');
const richText = require('rich-text');
const WebSocket = require('ws');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');

ShareDB.types.register(richText.type)
var backend = new ShareDB();
createDoc(startServer)

function createDoc(callback) {
    // connect to sharedb
    let connection = backend.connect()

    // fetch the doc with id 'main' from collection 'milestone1'
    var doc = connection.get('milestone1', 'main')
    doc.fetch(function(err) {
        if (err) throw err;
        if (doc.type === null) {
          doc.create([], 'rich-text', callback);
          return;
        }
        callback();
      });
}

function startServer() {
    // create a server to listen for web socket connections
    let app = express()
    let server = http.createServer(app)

    // connect web scoket to sharedb
    let wss = new WebSocket.Server({server: server})
    wss.on('connection', function connection(ws){
        console.log("connection received")
        let stream = new WebSocketJSONStream(ws);
        backend.listen(stream)    
    })

    server.listen(8080)
    console.log("Listening for web socket connections on http://localhost:8080")
}