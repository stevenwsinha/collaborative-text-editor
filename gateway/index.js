const express = require('express')
const httpProxy = require('express-http-proxy')
const path = require('path');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

const app = express()
app.use(express.static("./"))

app.use(bodyParser.json());
app.use(cookieParser())
const PORT = process.env.PORT || 3000

/*
 *  EVERYTHING NEEDS THE CSE356 HEADER
 */
function setHeader(req, res, next) {
    res.set('X-CSE356', '620bd941dd38a6610218bb1b')
    next()
}
app.use(setHeader)


/*
 *  AUTH FUNCTION
 */
function auth(req, res, next) {
    if(!req.cookies['id']) {
        return res.json({error: true, message: "received api call without authorization"})
    }
    next()
}

/*
 *  DEFINE ALL OUR PROXIES
 */
const collectionsProxy = httpProxy('localhost:4000')
const usersProxy = httpProxy('localhost:5000')
const mediaProxy = httpProxy('localhost:6000')
const docProxy = httpProxy('localhost:7000')

app.all("/users/*", async function (req, res) {
    usersProxy(req, res)
})

app.all("/collection/*", auth, async function (req, res) {
    collectionsProxy(req, res)
})

app.all("/media/*", auth, async function (req, res) {
    mediaProxy(req, res)
})

app.get("/doc/edit/:DOCID", auth, async function (req, res) {
    res.sendFile(path.join(__dirname, "/docfiles/doc.html"))
})

app.all("/doc/*", auth, async function (req, res) {
    docProxy(req, res)
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))