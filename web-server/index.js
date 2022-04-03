/*
 *  IMPORT THE NECESSARY MODULES AND SET GLOBAL CONSTANTS
 */ 
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const PORT = process.env.PORT || 3000

// creat global doc
let doc = []

/*
 *  SET UP EXPRESS MIDDLEWARE/STATIC CONTENT SERVING
 */
app.use(express.static("../client"))
app.use(bodyParser.json());

/*
 *  SET UP EXPRESS ROUTING
 */
app.get('/connect/:id', function(req, res) {
    connectionId = req.params.id
    res.json({
        payload: doc
    }).send()
})

app.post('/op/:id', function(req, res) {
    connectionId = req.params.id
    oplist = req.body.payload.ops
    doc.push(oplist)
    res.end()
})

app.get('/doc/:id', function(req, res) {
    connectionId = req.params.id
    doc = generateDoc();
    res.write(doc).end()
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))

function generateDoc() {
    html = "<html> <body> <p>"

    length = doc.length
    console.log(doc.length)
    for (let i = 0; i < length; i++) {
        oplist = doc[i]
        if(oplist.length > 1){
            html += oplist[1].insert
        }
        else{
            html += oplist[0].insert
        }
    }

    html += "</p> </body> </html>"
    return html
}