/*
 *  IMPORT THE NECESSARY MODULES AND SET GLOBAL CONSTANTS
 */ 
const express = require('express')
const bodyParser = require('body-parser')
const sharedbClient = require('sharedb/lib/client')
const richText = require('rich-text');
const WebSocket = require('ws');
const app = express()
const PORT = process.env.PORT || 3000

/*
 *  CREATE CONNECTION TO SHAREDB SERVER
 */
sharedbClient.types.register(richText.type);
let ws = new WebSocket('ws://localhost:8080');
let connection = new sharedbClient.Connection(ws);

/*
 *  GET THE DOC
 */
let doc = connection.get('milestone1', 'main')
doc.subscribe(function(err){
    if (err) throw err;
})

/*
 *  CREATE LIST OF ACTIVE SESSIONS
 */
sessionIds = []

/*
 *  SET UP EXPRESS MIDDLEWARE/STATIC CONTENT SERVING
 */
app.use(express.static("../client"))
app.use(bodyParser.json());

/*
 *  SET UP EXPRESS ROUTING
 */
app.get('/connect/:id', function(req, res) {
    connectionId = req.params.id
    sessionIds.push(connectionId)
    res.json({
        payload: doc.data
    }).send()
})

app.post('/op/:id', function(req, res) {
    connectionId = req.params.id
    oplist = req.body.payload.ops
    doc.submitOp(req.body.payload.ops)
    res.end()
})

app.get('/doc/:id', function(req, res) {
    connectionId = req.params.id
    res.write().end()
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))

function generateDoc() {
    html = "<html> <body> <p>"

    length = doc.length
    console.log(doc.length)
    for (let i = 0; i < length; i++) {
        oplist = doc[i]
        if(oplist.length > 1){
            html += oplist[1].insert
        }
        else{
            html += oplist[0].insert
        }
    }

    html += "</p> </body> </html>"
    return html
}