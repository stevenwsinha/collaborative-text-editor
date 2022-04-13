/*
 *  IMPORT MODULES
 */ 
const express = require('express')
const bodyParser = require('body-parser')
const sharedbClient = require('sharedb/lib/client')
const richText = require('rich-text');
var QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
const WebSocket = require('ws');

// IMPORT SCHEMAS
const {User} = require('./db.js') 

// EXPRESS PEPEGA
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
console.log("Connected to sharedb server")

/*
 *  GET THE DOC AND ADD A .ON HANDLER
 */
let doc = connection.get('milestone1', 'main')
doc.subscribe(function(err){
    if (err) throw err;
})
doc.submitSource = true;

doc.on('op', function(op, source) {
    console.log(`ShareDB finished applying op from ${source}. Propogating change to all other clients`)
    num_clients = sessionIds.length
    oplist = []
    oplist.push(op)
    console.log(`Sending: data: ${JSON.stringify(oplist)}\n`)

    for (let i = 0; i < num_clients; i ++) {
        if(sessionIds[i].id === source) continue;

        let res = sessionIds[i].stream;
        res.write(`data: ${oplist}\n\n`)
    }
})

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

    await User.findOne({id: id}).then((user) => {
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

        user.verified = true;
        user.save()

        console.log("SUCCESS")
        return res.redirect('/');
    })
})

app.get('/connect/:id', function(req, res) {
    console.log(`Got new connection from id: ${req.params.id}`)

    // set up event stream
    res.set({
        'X-CSE356': '620bd941dd38a6610218bb1b',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive'
      });
      res.flushHeaders();
  
      // add writable response and id to map
      sessionIds.push({id: req.params.id, stream: res})
  
      // send starting doc
      data = {content: doc.data.ops}
      console.log(`Writing starting contents to new connection: ${JSON.stringify(doc.data)}`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
})

app.post('/op/:id', function(req, res) {
    console.log(`Received operation from: ${req.params.id}. oplist: ${JSON.stringify(req.body)}`)
    connectionId = req.params.id
    oplist = req.body
    for(let i = 0; i < oplist.length; i++) {
        console.log(`Submitting oplist to sharedb ${JSON.stringify(oplist[i])}`)
        doc.submitOp(oplist[i], {source: connectionId})
    }
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    res.end()
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