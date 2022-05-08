const express = require('express')
const bodyParser = require('body-parser')
const sharedbClient = require('sharedb/lib/client')
const {MongoClient} = require('mongodb')
const richText = require('rich-text');
const WebSocket = require('ws');

const app = express()
const PORT = process.env.PORT || 4000
app.use(bodyParser.json());

/*
 *  CREATE CONNECTION TO SHAREDB SERVER
 */
sharedbClient.types.register(richText.type);
let ws = new WebSocket('ws://localhost:8080');
let connection = new sharedbClient.Connection(ws);
console.log("Connected to sharedb server")

/*
 *  CREATE CONNECTION TO MONGODB
 */
const client = new MongoClient('mongodb://localhost:27017', {
    useUnifiedTopology: true,
    useNewUrlParser: true
});
client.connect()
const db = client.db('milestone2')
const documentDB = db.collection('docs')
const {DocName} = require('./docnamedb.js') 

/*
 *  SET UP EXPRESS COLLECTION ROUTING
 */

app.post('/collection/create', async function (req, res) {
    let {name} = req.body;
    console.log(`Received CREATE DOC request with doc name ${name}`)

    let docid = Math.floor(Math.random() * 10000000).toString();
    let docName = new DocName({docid, name})
    docName.save()

    let doc = connection.get('docs', docid);
    doc.create([], 'rich-text');

    return res.json({docid: docid})
})

app.post('/collection/delete', async function (req, res) {
    let {docid} = req.body;
    console.log(`Received DELETE DOC request with doc id ${docid}`)

    await DocName.deleteOne({docid: docid});

    let doc = connection.get('docs', docid);
    doc.fetch(()=>{
        if(doc._type !== null) {
            doc.del();
        }
    
        return res.json({})
    })
})

app.get('/collection/list', async function (req, res) {
    console.log("Received LIST request")
    let pairs = []

    let recent = await documentDB.find({_type: "http://sharejs.org/types/rich-text/v1"}).sort({"_m.mtime": -1}).limit(10)
    let data = await recent.toArray();

    for(let i = 0; i < data.length; i++){
        id = data[i]._id
        let namePair = await DocName.findOne({docid: id});
        let name = namePair.name;
        pairs.push({id: id, name: name})
    }

    res.send(pairs)
})

app.post('/collection/names', async function (req, res) {
    let pairs = []

    let {docids} = req.body
    for(let i = 0; i < docids.length; i++){
        id = docids[i]
        let namePair = await DocName.findOne({docid: id});
        let name = namePair.name;
        pairs.push({id: id, name: name})
    }

    res.send(pairs)
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))