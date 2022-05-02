const express = require('express')
const bodyParser = require('body-parser')
const { Client } = require('@elastic/elasticsearch')
const client = new Client({
    node: 'http://localhost:9200'
  })
  

const app = express()
const PORT = process.env.PORT || 9000
app.use(bodyParser.json());

/*
 *  ELASTIC SEARCH ROUTES
 */

app.get('/index/search', async function (req, res) {
    console.log("index search received")
    res.end()
})

app.get('/index/suggest', async function (req, res) {
    console.log("index suggest received")
    res.end()
})

app.post('/index/docs', async function (req, res) {
    console.log("index docs received")
    changed = req.body.docids
    res.end()
})

app.listen(PORT, '209.94.57.32', () => console.log(`Server listening on http://209.94.57.32:${PORT}`))