const express = require('express')
const bodyParser = require('body-parser')
const sharedbClient = require('sharedb/lib/client')
const richText = require('rich-text');
var QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
const WebSocket = require('ws');

const app = express()
const PORT = process.env.PORT || 7000
app.use(bodyParser.json());

/*
 *  CREATE CONNECTION TO SHAREDB SERVER
 */
sharedbClient.types.register(richText.type);
let ws = new WebSocket('ws://localhost:8080');
let connection = new sharedbClient.Connection(ws);
console.log("Connected to sharedb server")

/*
 *  GLOBAL MAPS
 *  OPEN DOC -> CONNECTED USERS
 *  USER -> EVENT STREAM
 *  OPEN DOC -> DOC VERSION
 */
const docIDToUserMap = new Map()
const userToStreamMap = new Map()
const docIDToVersion = new Map()

/*
 *  SET UP DOC EDIT ROUTING
 */

app.get('/doc/connect/:DOCID/:UID', function(req, res) {
    let {DOCID, UID} = req.params
    console.log(`Got new CONNECTION on doc: ${DOCID} with connection id: ${UID}`)
    
     // set up event stream
     res.set({
        'X-CSE356': '620bd941dd38a6610218bb1b',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
    res.flushHeaders();

    if(docIDToUserMap.has(DOCID)) {
        docIDToUserMap.get(DOCID).push(UID)
    }
    else {
        console.log("opening new doc")
        docIDToUserMap.set(DOCID,[UID])
    }
    doc = connection.get('docs', DOCID)
    doc.fetch(() => {
        if(doc._type === null) {
            return res.write(`data: ${JSON.stringify({error: true, msg: "Cannot connect to a doc that has not been created"})}`)
        }

        if(!docIDToVersion.has(DOCID)) {
            docIDToVersion.set(DOCID, doc.version)
        }
            
        // send starting doc 
        data = {content: doc.data.ops, version: doc.version} 
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    })    

    userToStreamMap.set(UID, res)

    res.on("close", async ()=> {
        console.log(`Connection ${UID} CLOSED`)
        clients = docIDToUserMap.get(DOCID)
 
        let index = clients.indexOf(UID)
        docIDToUserMap.get(DOCID).splice(index, 1)
        
        if(docIDToUserMap.get(DOCID).length == 0) {
            docIDToVersion.delete(DOCID)
            docIDToUserMap.delete(DOCID)
        }

        userToStreamMap.get(UID).end()
        userToStreamMap.delete(UID)
    })
})

app.post('/doc/op/:DOCID/:UID', function(req, res) {
    let {DOCID, UID} = req.params
    let {version, op} = req.body
   
    let doc = connection.get('docs', DOCID);
    doc.fetch()

    docVersion = docIDToVersion.get(DOCID)
    if(version !== docVersion) {
        console.log("Version mismatch!")
        return res.json({status: 'retry'})
    }
   
    // console.log(`got EDIT OP on doc ${DOCID} from connection ${UID}`)
    // console.log(`version: ${version}, op: ${JSON.stringify(op)}`)

    // if (!clients) {
    //     return res.json({error: true, msg: "Cannot edit a doc with no open connections"})
    // }

    // if (doc === undefined) {
    //     return res.json({error: true, msg: "Cannot edit a doc that isn't open"})
    // }

    doc.submitOp(op)
    docIDToVersion.set(DOCID, ++docVersion)

    let clients = docIDToUserMap.get(DOCID)
    console.log(`applied op: ${JSON.stringify(op)}`)
    for(let i = 0; i < clients.length; i++) {
        id = clients[i]
        stream = userToStreamMap.get(id)
        let data
        if (id === UID) {
            console.log(`sending ack to ${id}`)
            data = {ack:op}
            stream.write(`data: ${JSON.stringify(data)}\n\n`)
        }
        else {
            console.log(`sending op to ${id}`)
            data = op
            stream.write(`data: ${JSON.stringify(data)}\n\n`)
        }
    }
    return res.json({status: 'ok'})

})

app.post('/doc/presence/:DOCID/:UID', async function(req, res) {
    let {DOCID, UID} = req.params
    let {index, length} = req.body

    console.log(`got EDIT PRESENCE on doc ${DOCID} from connection ${UID}`)
    console.log(`index: ${index}, length: ${length}`)

    userID = req.cookies['id'];

    let user = await User.findById(userID);

    if(!user) {
        return res.json({error: true, message: "/doc/presence user does not exist"})
    }

    let name = user.name

    let clients = docIDToUserMap.get(DOCID)
    for(let i = 0; i < clients.length; i++) {
        id = clients[i]
        stream = userToStreamMap.get(id)
        if (id === UID) {
            continue
        }
        else {
            console.log(`Sending presence info to ${id}`)
            console.log(`presence: {}`)
            let data = {presence: {id: UID,
                                    cursor: {index: index, length: length, name: name}}}
            stream.write(`data: ${JSON.stringify(data)}\n\n`)
        }
    }

    res.json({})
})  

app.get('/doc/get/:DOCID/:UID', function(req, res) {
    let {DOCID, UID} = req.params
    console.log(`Recieved doc as html request for ${DOCID}`)
    
    var cfg = {};
    let doc = connection.get('docs', DOCID)
    doc.fetch(() => {
        var deltaOps = doc.data.ops
        var converter = new QuillDeltaToHtmlConverter(deltaOps, cfg);
        
        var html = converter.convert(); 
        console.log(`Responding with html: ${html}`)

        res.set({
            'X-CSE356': '620bd941dd38a6610218bb1b',
            'Content-Type': 'text/html',
        });
        res.send(html)
    })
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))
