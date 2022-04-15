/*
 *  IMPORT MODULES
 */ 
const express = require('express')
const path = require('path');
const bodyParser = require('body-parser')
const sharedbClient = require('sharedb/lib/client')
const {MongoClient} = require('mongodb')
const richText = require('rich-text');
var QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
const WebSocket = require('ws');

// IMPORT SCHEMAS
const {User, DocName} = require('./db.js') 

// EXPRESS PEPEGA
const app = express()
const PORT = process.env.PORT || 3000

/*
 *  CREATE MAP OF OPEN DOCUMENTS
 */
docMap = new Map()

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

/*
 *  CREATE CONNECTION TO SHAREDB SERVER
 */
sharedbClient.types.register(richText.type);
let ws = new WebSocket('ws://localhost:8080');
let connection = new sharedbClient.Connection(ws);
console.log("Connected to sharedb server")

/*
 *  SET UP EXPRESS MIDDLEWARE/STATIC CONTENT SERVING
 */
app.use(express.static("../client"))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended: true}))

/*
 *  SET UP EXPRESS USER ROUTING
 */

app.post('/users/signup', async function (req, res) {
    let {name, password, email} = req.body;
    console.log(`Received USER ACCOUNT CREATION request for user: ${name} with email: ${email} and password: ${password}`);

    existingUser = await User.findOne({email: email});
    if(existingUser){
        return res.json({
            error: true,
            message: "A user with that email already exists"
        });
    }

    let newUser = new User({
        name, password, email
    });

    newUser.verified = false;

    let key = '';
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for ( let i = 0; i < 12; i++ ) {
        key += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    newUser.verifyKey = key;

    let savedUser = newUser.save()
    if(!savedUser){
        return res.json({
            error: true,
            message: "Server error, user account could not be saved"
        });
    }

    // CALL EMAIL FUNCTION HERE

    res.status(200).json({});
})

app.post('/users/login', async function (req, res) {
    let {email, password} = req.body;
    console.log(`Received LOGIN request for user: ${email}`);

    await User.findOne({email: email}).then((user) => {
        if (!user) {
            return res.json({
                error: true,
                message: "No user associated with that password"
            });
        }

        if(password !== user.password){
            return res.json({
                error: true,
                message: "Incorrect password"
            });
        }

        if (!user.verified) {
            return res.json({
                error: true,
                message: "Cannot log into unverified account"
            })
        }

        res.cookie('id', user._id);
        return res.json({name: user.name})
    })
})

app.get('/users/verify', async function (req, res) {
    let {id, key} = req.query;
    console.log(`Received VERIFY request for user: ${id}`)

    await User.findById(id).then((user) => {
        if(!user) {
            return res.json({
                error: true,
                message: "No user associated with that id"
            });
        }

        if(key !== user.verifyKey) {
            return res.json({
                error: true,
                message: "Incorrect verification key"
            });
        }

        user.verified = true
        user.save()

        return res.redirect('/home')
    })
})


/*
 *  SET UP EXPRESS COLLECTION ROUTING
 */

app.post('/collection/create', async function (req, res) {
    let {name} = req.body;
    console.log(`Received CREATE DOC request with doc name ${name}`)

    let docName = new DocName({name})
    docName.save()

    let doc = connection.get('docs', docName.id);
    doc.create([], 'rich-text');

    return res.json({docid: docName.id})
})

app.post('/collection/delete', async function (req, res) {
    let {docid} = req.body;
    console.log(`Received DELETE DOC request with doc name ${docid}`)

    await DocName.deleteOne({_id: docid});

    let doc = connection.get('docs', docid);
    
    if(doc._type !== null) {
        doc.del();
    }

    return res.json({})
})

app.get('/collection/list', async function (req, res) {
    console.log("Received LIST request")
    let pairs = []

    let recent = await documentDB.find({_type: "http://sharejs.org/types/rich-text/v1"}).sort({"_m.mtime": -1}).limit(10)
    let data = await recent.toArray();

    for(let i = 0; i < data.length; i++){
        id = data[i]._id
        let namePair = await DocName.findById(id);
        let name = namePair.name;
        pairs.push({id: id, name: name})
    }

    res.send(pairs).end();
})


/*
 *  SET UP EXPRESS UI ROUTING
 */

app.get('/doc/edit/:DOCID', function (req, res) {
    console.log(`Sending EDIT UI for doc ${req.params.DOCID}`)
    res.sendFile(path.join(__dirname, "../client/public/doc.html"))
})

app.get('/home', function (req, res) {
    console.log(`Sending HOME UI`)
    res.sendFile(path.join(__dirname, "../client/public/home.html"))
})


/*
 *  SET UP DOC EDIT ROUTING
 */

app.get('/doc/connect/:DOCID/:UID', function(req, res) {
    let {DOCID, UID} = req.params
    console.log(`Got new CONNECTION on doc: ${DOCID} with connection id: ${UID}`)
    
    let doc
    if (!docMap.has(DOCID)) {
        doc = connection.get('docs', DOCID)
        if(doc.type == null) {
            return res.json({error: true, msg: "Cannot connect to a doc that has not been created"})
        }        
        docMap.set(DOCID, {doc: doc, connections: [{uid: UID, stream: res}]})
        
        doc.subscribe(function(err){
            if (err) throw err;
        })
    }
    else{
        doc = docMap.get(DOCID).doc
        docMap.get(DOCID).connections.push({uid: UID, stream: res})
    }

    // set up event stream
    res.set({
        'X-CSE356': '620bd941dd38a6610218bb1b',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive'
      });
    res.flushHeaders();

    // send starting doc    
    data = {content: doc.data.ops, version: doc.version} 
    res.write(`data: ${JSON.stringify(data)}\n\n`)
})

app.post('/doc/op/:DOCID/:UID', function(req, res) {
    let {DOCID, UID} = req.params
    let {version, op} = req.body
    
    let docObject = docMap.get(DOCID)
    if (docObject === undefined) {
        return res.json({error: true, msg: "Cannot edit a doc that has not been created"})
    }

    let doc = docObject.doc
    if(doc.version !== version) {
        return res.json({status: 'retry'})
    }
    
    doc.submitOp(op,{},()=>{
        for(let i = 0; i < docObject.connections.length; i++) {
            id = docObject.connections[i].uid
            res = docObject.connections[i].stream
            if (connection.uid == UID) {
                res.write(`data: ${JSON.stringify({ack:op})}\n\n`)
            }
            else {
                res.write(`data: ${JSON.stringify(op)}\n\n`)
            }
        }
    })
    
    return res.json({status: 'ok'})
})

app.get('/doc/:id', function(req, res) {
    console.log(`Recieved doc as html request from ${req.params.id}`)
    
    var cfg = {};
    var deltaOps = doc.data.ops
    console.log(`doc delta ops are: ${JSON.stringify(doc.data)}`)
    var converter = new QuillDeltaToHtmlConverter(deltaOps, cfg);
    
    var html = converter.convert(); 
    
    console.log(`Responding with html: ${html}`)

    res.set({
        'X-CSE356': '620bd941dd38a6610218bb1b',
        'Content-Type': 'text/html',
      });
    res.send(html)
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))