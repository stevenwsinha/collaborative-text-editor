const { response } = require("express")

let connectionID
let docID
let eventSource
let docVersion
let changeQueue = []


var quill = new Quill('#doc-container', {
    theme: 'snow'
});

quill.on('text-change', async function(delta, oldDelta, source) {
    if(source !== 'user') return
    
    changeQueue.push({op: delta, status: "unsent"})
    if(changeQueue.length === 1) {
        sendQueue()
    }
})

/*
 * establish the connection
 */

window.onload = async function() {
    connectionID = Math.floor(Math.random() * 10000000).toString();
    let path = window.location.pathname
    docID = path.substring("/doc/edit/".length)
    let connectionURL = "/doc/connect/" + docID + "/" + connectionID
    await fetch(connectionURL)

    eventSource = new EventSource(connectionURL)

    eventSource.onmessage = function(msg) {
        console.log(`received: ${msg.data}`)
        response = JSON.parse(msg.data) 

        if (response.content) {
            quill.updateContents(response.content, 'api')
            docVersion = response.version
            return
        }

        if (response.ack) {
            docVersion++
            sendQueue()
        }

        if (response.presence) {
            return
        }

        else {
            processOp(response)
            sendQueue()
        }
    }
}

function sendQueue() {
    
}

function processOp(stream_op) {
    // go thru and transform everything 
    changeQueue = changeQueue.map((op) => {
        let newOp = stream_op.transform(op)
        stream_op = op.transform(stream_op)
        return newOp
    })

    quill.updateContents(stream_op)
}