var connectionId

var quill = new Quill('#doc-container', {
    theme: 'snow'
});

quill.on('text-change', async function(delta, oldDelta, source) {
    if(source !== 'user') return
    let opsURL = "/op/" + connectionId
    let payload = {payload: delta}
    console.log(payload)
    let response = await fetch(opsURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)                                            
    })
})


// setInterval(sendQueue, 3000)

// async function sendQueue() {
//     /* this func is async to ensure it doesn't block
//      * user input from being added to the queue
//      * we want to avoid async madness where delta_queue is growing as we
//      * consolidate it, so we only iterate through its current length
//      * this works because the queue is monotomically non-decreasing */
//     let length = delta_queue.length   

//     for(let i = 0; i < length; i++) {
//         let oplist = delta_queue[i]
//     }
// }

/*
 * establish the connection
 */

window.onload = async function() {
    connectionId = Math.floor(Math.random() * 10000000).toString();
    let connectionURL = "/connect/" + connectionId
    let response = await fetch(connectionURL)
    let responseJson = await response.json()
    console.log(responseJson)
    updateDoc(responseJson.payload.ops)
}

function updateDoc(doc) {
    quill.updateContents(doc, 'api')
}