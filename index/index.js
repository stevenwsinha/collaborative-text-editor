const bodyParser = require('body-parser')
var cron = require('node-cron');
const sharedbClient = require('sharedb/lib/client')
const richText = require('rich-text');
const WebSocket = require('ws');
const axios = require('axios')
const axios_es = axios.create({
    baseURL: 'http://localhost:9000',
    timeout: 5000,
})

const axios_collection = axios.create({
    baseURL: 'http://localhost:4000',
    timeout: 5000,
})

/*
 *  CREATE CONNECTION TO SHAREDB SERVER
 */
sharedbClient.types.register(richText.type);
let ws = new WebSocket('ws://localhost:8080');
let connection = new sharedbClient.Connection(ws);
console.log("Connected to sharedb server")

/*
 *  SETUP CONNECTIONS TO DOC SERVERS
 */
doc_servers = ['localhost:7000', 'localhost:7001']
axios_instances = []
index = 0

for (let i = 0; i < doc_servers.length; i++) {
    axios_instances[i] = axios.create({
        baseURL: 'http://' + doc_servers[i],
        timeout: 1000,
    })
}

cron.schedule('*/4 * * * * *', requestChangedDocs); // every 4 seconds

async function requestChangedDocs() {
    console.log(`requesting docs from ${doc_servers[index]}`)
    
    
    let response = await axios_instances[index].get("/doc/changed")    
    ids = response.data.docids

    let namePairs = await axios_collection.post("/collection/changed", {
                                                                            docids: ids
                                                                        })    


    for (let i = 0; i < changed.length; i++) {
        docid = ids[i]
        doc = connection.get('docs', docid)
        doc.fetch(async () => {
            if(doc._type === null) {
                return
            }
    
            // index the doc
            content = doc.data.ops
            console.log(content)

            await client.index({
                index: 'docs',
                id: docid,
                document: {
                    title: namePairs[i],
                    body: "full document text"
                }
            })
        })    
    }

    index++
    index%=doc_servers.length

    axios_es.post('/index/docs', {
        docids: ids
    })
}