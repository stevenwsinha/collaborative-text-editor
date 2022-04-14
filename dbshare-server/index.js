const http = require('http');
const express = require('express');
const ShareDB = require('sharedb');
const db = require('sharedb-mongo')('mongodb://127.0.0.1:27017/milestone2')
const richText = require('rich-text');
const WebSocket = require('ws');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');

ShareDB.types.register(richText.type)
var backend = new ShareDB(db);
startServer()

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