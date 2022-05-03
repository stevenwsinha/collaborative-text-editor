const bodyParser = require('body-parser')
var cron = require('node-cron');
const axios = require('axios')
const axios_es = axios.create({
    baseURL: 'http://localhost:9000',
    timeout: 5000,
})

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

    index++
    index%=doc_servers.length

    axios_es.post('/index/docs', {
        docids: ids
    })
}