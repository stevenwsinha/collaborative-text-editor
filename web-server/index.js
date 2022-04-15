/*
 *  IMPORT MODULES
 */ 
const express = require('express')
const path = require('path');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const nodemailer = require("nodemailer");
const sharedbClient = require('sharedb/lib/client')
const {MongoClient} = require('mongodb')
const richText = require('rich-text');
var QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
const WebSocket = require('ws');
const { promises: Fs } = require('fs')
const mime = require('mime');

// IMPORT SCHEMAS
const {User, DocName} = require('./db.js') 

// EXPRESS PEPEGA
const app = express()
const PORT = process.env.PORT || 3000

/*
 *  CREATE MAP OF OPEN DOCUMENTS TO UIDs, AND UIDs TO STREAMS
 */
docMap = new Map()
userMap = new Map()

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
app.use(cookieParser());

/*
 *  SET UP EXPRESS USER ROUTING
 */

app.post('/users/signup', async function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
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

    res.status(200).json({}).end()
})

app.post('/users/login', async function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
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
        return res.json({name: user.name}).end()
    })
})

app.post('/users/logout', async function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    res.clearCookie('id');
    res.redirect("/").end();
})

app.get('/users/verify', async function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
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

        return res.redirect('/home').end()
    })
})


/*
 *  SET UP EXPRESS COLLECTION ROUTING
 */

app.post('/collection/create', async function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    if(!req.cookies['id']) {
        res.json({error: true, message: "/collection/create call does not have proper authentication"})
    }

    let {name} = req.body;
    console.log(`Received CREATE DOC request with doc name ${name}`)

    let docName = new DocName({name})
    docName.save()

    let doc = connection.get('docs', docName.id);
    doc.create([], 'rich-text');

    return res.json({docid: docName.id}).end()
})

app.post('/collection/delete', async function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    if(!req.cookies['id']) {
        res.json({error: true, message: "/collection/delete call does not have proper authentication"})
    }

    let {docid} = req.body;
    console.log(`Received DELETE DOC request with doc name ${docid}`)

    await DocName.deleteOne({_id: docid});

    let doc = connection.get('docs', docid);
    doc.fetch(()=>{
        if(doc._type !== null) {
            doc.del();
        }
    
        return res.json({}).end()
    })
})

app.get('/collection/list', async function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    if(!req.cookies['id']) {
        res.json({error: true, message: "/collection/list call does not have proper authentication"})
    }

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
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    if(!req.cookies['id']) {
        res.json({error: true, message: "/doc/edit call does not have proper authentication"})
    }

    console.log(`Sending EDIT UI for doc ${req.params.DOCID}`)
    res.sendFile(path.join(__dirname, "../client/public/doc.html"))
})

app.get('/home', function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    if(!req.cookies['id']) {
        res.json({error: true, message: "/home call does not have proper authentication"})
    }

    console.log(`Sending HOME UI`)
    res.sendFile(path.join(__dirname, "../client/public/home.html"))
})

/*
 *  SET UP MEDIA ROUTING
 */

const multer = require('multer');

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
      },    

    filename: function (req, file, cb) {
        const prefix = Date.now() + '-'
        cb(null, prefix + file.originalname)
    }
})

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
  
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(null, false);
    }
  }

const upload = multer({ storage: storage,
                        limits : {fileSize : 10000000},
                        fileFilter: function (req, file, cb) {
                            checkFileType(file, cb)
                        } 
                    })
app.post("/media/upload", upload.single('file'), function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    if(!req.cookies['id']) {
        res.json({error: true, message: "/media/upload call does not have proper authentication"})
    }

    console.log("Received image upload")
    if(!req.file) {
        res.json({error: true, message: "invalid upload file"})
    }
    let mediaid = req.file.path.substring(req.file.path.indexOf("/")+1)
    res.json({mediaid: mediaid})
});

app.get('/media/access/:MEDIAID', async function (req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    if(!req.cookies['id']) {
        res.json({error: true, message: "/media/access call does not have proper authentication"})
    }

    let {MEDIAID} = req.params
    console.log(`Received image upload for image with id: ${MEDIAID}`)
    let extension = MEDIAID.substring(MEDIAID.indexOf("."))
    let pathname = "uploads/" + MEDIAID
    
    try {
        await Fs.access(pathname)
        res.setHeader("Content-Type", mime.getType(extension))
        res.sendFile(path.join(__dirname, pathname))
    }
    catch {
        res.json({error: true, message: "File corresponding to MEDIAID could not be found"}).end()
    }
})

/*
 *  SET UP DOC EDIT ROUTING
 */

app.get('/doc/connect/:DOCID/:UID', async function(req, res) {
    if(!req.cookies['id']) {
        res.json({error: true, message: "/document/connect call does not have proper authentication"})
    }

    let {DOCID, UID} = req.params
    console.log(`Got new CONNECTION on doc: ${DOCID} with connection id: ${UID}`)
    
     // set up event stream
     res.set({
        'X-CSE356': '620bd941dd38a6610218bb1b',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive'
      });
    res.flushHeaders();

    res.on("close", async ()=> {
        console.log(`Connection ${UID} CLOSED`)
        clients = docMap.get(DOCID)

        if(clients.includes(UID)) { 
            let index = clients.indexOf(UID)
            docMap.get(DOCID).splice(index, 1)
            userMap.get(UID).end()
            userMap.delete(UID)
        }   
        userID = req.cookies['id'];

        let user = await User.findById(userID);
    
        let name = user.name
    
        for(let i = 0; i < clients.length; i++) {
            id = clients[i]
            stream = userMap.get(id)
            if (id === UID) {
                continue
            }
            else {
                let data = {id: UID,
                            cursor: null}
                stream.write(`data: ${JSON.stringify(data)}\n\n`)
            }
        }
    })

    if(docMap.has(DOCID)) {
        clients = docMap.get(DOCID)
        if(!clients.includes(UID)) {
            docMap.get(DOCID).push(UID)
        }
    }
    else {
        console.log("opening new doc")
        docMap.set(DOCID,[UID])
    }

    userMap.set(UID, res)

    let doc = connection.get('docs', DOCID)
    doc.fetch(() => {
        if(doc._type === null) {
            res.write(`data: ${JSON.stringify({error: true, msg: "Cannot connect to a doc that has not been created"})}`)
            return  
        }

        // send starting doc 
        data = {content: doc.data.ops, version: doc.version} 
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    }) 
})

app.post('/doc/op/:DOCID/:UID', function(req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    if(!req.cookies['id']) {
        res.json({error: true, message: "/doc/op call does not have proper authentication"})
    }

    let {DOCID, UID} = req.params
    let {version, op} = req.body
    console.log(`got EDIT OP on doc ${DOCID} from connection ${UID}`)
    console.log(`version: ${version}, op: ${JSON.stringify(op)}`)

    let clients = docMap.get(DOCID)
    if (!clients) {
        return res.json({error: true, msg: "Cannot edit a doc with no open connections"})
    }

    let doc = connection.get('docs', DOCID)
    doc.fetch(() => {
        if (doc._type === null) {
            return res.json({error: true, msg: "Cannot edit a doc that has not been created"})
        }

        if(doc.version !== version) {
            console.log("Version mismatch!")
            return res.json({status: 'retry'})
        }

        doc.submitOp(op, {}, ()=>{
            console.log(`applied op: ${JSON.stringify(op)}`)

            for(let i = 0; i < clients.length; i++) {
                id = clients[i]
                stream = userMap.get(id)
                let data
                if (id === UID) {
                    console.log("sending ack")
                    data = {ack:op}
                    stream.write(`data: ${JSON.stringify(data)}\n\n`)
                }
                else {
                    console.log("sending op to other clients")
                    data = op
                    stream.write(`data: ${JSON.stringify(data)}\n\n`)
                }
            }
        })

        return res.json({status: 'ok'}).end()
    })
})

app.post('/doc/presence/:DOCID/:UID', async function(req, res) {
    res.set({'X-CSE356': '620bd941dd38a6610218bb1b'})
    if(!req.cookies['id']) {
        res.json({error: true, message: "/doc/presence call does not have proper authentication"})
    }


    let {DOCID, UID} = req.params
    let {index, length} = req.body

    console.log(`got EDIT PRESENCE on doc ${DOCID} from connection ${UID}`)
    console.log(`index: ${index}, length: ${length}`)

    userID = req.cookies['id'];

    let user = await User.findById(userID);

    if(!user) {
        res.json({error: true, message: "/doc/presence user does not exist"})
    }

    let name = user.name

    let clients = docMap.get(DOCID)
    for(let i = 0; i < clients.length; i++) {
        id = clients[i]
        stream = userMap.get(id)
        if (id === UID) {
            continue
        }
        else {
            let data = {id: UID,
                        cursor: {index: index, length: length, name: name}}
            stream.write(`data: ${JSON.stringify(data)}\n\n`)
        }
    }

    res.json({}).end
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
        res.send(html).end()  
    })
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))