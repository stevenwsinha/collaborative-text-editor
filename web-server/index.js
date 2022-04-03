/*
 *  IMPORT THE NECESSARY MODULES AND SET GLOBAL CONSTANTS
 */ 
const express = require('express')
const bodyParser = require('body-parser')
const sharedbClient = require('sharedb/lib/client')
const richText = require('rich-text');
var QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
const WebSocket = require('ws');
const app = express()
const PORT = process.env.PORT || 3000

/*
 *  CREATE LIST OF ACTIVE SESSIONS
 */
sessionIds = []

/*
 *  CREATE CONNECTION TO SHAREDB SERVER
 */
sharedbClient.types.register(richText.type);
let ws = new WebSocket('ws://localhost:8080');
let connection = new sharedbClient.Connection(ws);

/*
 *  GET THE DOC AND ADD A .ON HANDLER
 */
let doc = connection.get('milestone1', 'main')
doc.subscribe(function(err){
    if (err) throw err;
})

doc.on('op', function(op, source) {
    console.log(`ShareDB finished applying op from ${source}. Propogating change to all other clients`)
    num_clients = sessionIds.length

    for (let i = 0; i < num_clients; i ++) {
        if(sessionIds[i].id === source) continue;

        let res = sessionIds[i].stream;
        res.write(`data: ${JSON.stringify(op)}\n\n`)
    }
})

/*
 *  SET UP EXPRESS MIDDLEWARE/STATIC CONTENT SERVING
 */
app.use(express.static("../client"))
app.use(bodyParser.json());

/*
 *  SET UP EXPRESS ROUTING
 */
app.get('/connect/:id', function(req, res) {
    console.log(`Got new connection from id: ${req.params.id}`)

    // set up event stream
    res.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive'
      });
      res.flushHeaders();
  
      // add writable response and id to map
      sessionIds.push({id: req.params.id, stream: res})
  
      // send starting doc
      data = {content: doc.data.ops}
      res.write(`data: ${JSON.stringify(data)}\n\n`)
})

app.post('/op/:id', function(req, res) {
    console.log(`Received operation from: ${req.params.id}. oplist: ${req.body}`)
    connectionId = req.params.id
    oplist = req.body
    doc.submitOp(oplist, {source: connectionId})
    res.end()
})

app.get('/doc/:id', function(req, res) {
    console.log(`Recieved doc as html request from ${req.params.id}`)
    let cfg = {};
    let converter = new QuillDeltaToHtmlConverter(doc.data, cfg);
    let html = converter.convert()
    res.send(html)
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))