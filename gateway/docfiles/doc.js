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
    
    changeQueue.push({op: delta.ops, status: "unsent"})
    if(changeQueue.length === 1) {
        sendQueue()
    }
})

quill.on('selection-change', async function(range, oldRange, source) {
    if(range) {
        let presenceURL = "/doc/presence/" + docID + "/" + connectionID
        console.log(presenceURL)
        let response = await fetch(presenceURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({index: range.index, length: range.length})
        })
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

    connectionSource = new EventSource(connectionURL)

    connectionSource.onmessage = function(msg) {
        console.log(`received: ${msg.data}`)
        response = JSON.parse(msg.data) 

        if (response.content) {
            quill.updateContents(response.content, 'api')
            docVersion = response.version
            return
        }

        if (response.ack) {
            console.log("ack received")
            ++docVersion
            if(changeQueue.length > 0) {
                if(changeQueue[0].status == "sent") {
                    console.log("remove event from queue")
                    changeQueue.shift()
                    if(changeQueue.length > 0) {
                        sendQueue() 
                    }
                }
                else if(changeQueue[0].status === "retry") {
                    sendQueue() 
                }  
            }
            return
        }

        if (response.presence) {
            return
        }

        if (response.error) {
            console.log("ERROR")
            return
        }

        else {
            console.log("other users op received")
            ++docVersion
            processOp(response)
            if(changeQueue.length > 0 && changeQueue[0].status === "retry") {
                sendQueue()
            }
        }
    }
}

async function sendQueue() {
    console.log(`sending op with version ${docVersion}`)
    let response = await fetch("/doc/op/" + docID + "/" + connectionID, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({version: docVersion, op: changeQueue[0].op})
    })
    let data = await response.json()
    console.log(`submission status: ${JSON.stringify(data)}`)
    if(data.status === "ok") {
        changeQueue[0].status == "sent"
    }
    else {
        changeQueue[0].status = "retry"
    }
}

function processOp(stream_op) {
    // go thru and transform everything 
    console.log(stream_op)
    for(let i = 0; i < stream_op.length; i++){
        cmd = stream_op[i]
        changeQueue = changeQueue.map((entry) => {
            let newOp = cmd.transform(entry.op)
            cmd = entry.op.transform(cmd)
            return newOp
        })
        stream_op[i] = cmd
    }
    quill.updateContents(stream_op, 'api')
}