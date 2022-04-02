var delta_queue = []
var connectionId

var quill = new Quill('#doc-container', {
    theme: 'snow'
});

quill.on('text-change', function(delta, oldDelta, source) {
    console.log(delta)
    console.log(delta.ops)
    delta_queue.push(delta)
})


// setInterval(sendQueue, 3000)

async function sendQueue() {
    /* this func is async to ensure it doesn't block
     * user input from being added to the queue
     * we want to avoid async madness where delta_queue is growing as we
     * consolidate it, so we only iterate through its current length
     * this works because the queue is monotomically non-decreasing */
    let length = delta_queue.length   

    for(let i = 0; i < length; i++) {
        let oplist = delta_queue[i]
    }
}

/*
 * establish the connection
 */

window.onload = function() {
    connectionId = Math.floor(Math.random() * 10000000);
    console.log(connectionId)
    let connectionURL = "/connect:" + connectionId.toString()

    let response = fetch(connectionURL)
    console.log(response)
}