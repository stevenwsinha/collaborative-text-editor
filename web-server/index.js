const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static("../client"))
app.use(bodyParser.json());

app.get('/connect:id', function(req, res){
    connectionId = req.params.id.substring(1, req.params.id.length)
    console.log(connectionId)

    res.send("OK")
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))