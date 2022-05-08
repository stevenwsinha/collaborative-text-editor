const express = require('express')
const bodyParser = require('body-parser')
const sharedbClient = require('sharedb/lib/client')
const richText = require('rich-text');
const WebSocket = require('ws');
const { Client } = require('@elastic/elasticsearch')
const client = new Client({
    node: 'http://localhost:9200'
})  

const app = express()
const PORT = process.env.PORT || 9000
app.use(bodyParser.json());

/*
 *  CREATE CONNECTION TO SHAREDB SERVER
 */
sharedbClient.types.register(richText.type);
let ws = new WebSocket('ws://localhost:8080');
let connection = new sharedbClient.Connection(ws);
console.log("Connected to sharedb server")


/*
 *  ELASTIC SEARCH ROUTES
 */

app.get('/index/search', async function (req, res) {
    console.log("index search received")
    let response = await client.search({
        query: {
           multi_match: {
               query: "temt",
               fields: ["title^2", "body"],
               fuzziness: 1,
           }
        },
        highlight: {
            fields: {
                body: {}
            }
        }
    })

    results = []
    for (let i = 0; i < response.hits.hits.length; i++) {
        result = {
            docid: response.hits.hits[i]._id, 
            name: response.hits.hits[i]._source.title,
            snippet: response.hits.hits[i].highlight.body[0]
        }

        results.push(result)
    }

    res.json(results)
})

app.get('/index/suggest', async function (req, res) {
    console.log("index suggest received")
    res.end()
})

app.post('/index/docs', async function (req, res) {
    console.log("index docs received")
    changed = req.body.docids
    res.end()

    // for (let i = 0; i < changed.length; i++) {
    //     docid = changed[i]
    //     doc = connection.get('docs', docid)
    //     doc.fetch(() => {
    //         if(doc._type === null) {
    //             return
    //         }
    
    //         // index the doc
    //         content = doc.data.ops 
    //     })    
    // }


    // test doc indexing
    
    await client.index({
        index: 'docs',
        id: '1',
        document: {
            title: "title",
            body: "full document text"
        }
    })
})

app.listen(PORT, '209.94.57.32', () => console.log(`Server listening on http://209.94.57.32:${PORT}`))