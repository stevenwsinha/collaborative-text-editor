var connectionID
var docID
var eventtSource

var quill = new Quill('#doc-container', {
    theme: 'snow'
});

quill.on('text-change', async function(delta, oldDelta, source) {
    if(source !== 'user') return
    let opsURL = "/op/" + connectionId
    let oplist = [delta]

    fetch(opsURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(oplist)                                            
    })
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
        ops = JSON.parse(msg.data)
    }
}