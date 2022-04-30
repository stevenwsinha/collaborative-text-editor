const express = require('express')
const path = require('path');
const bodyParser = require('body-parser')
const { promises: Fs } = require('fs')
const mime = require('mime');
const multer = require('multer');

const app = express()
const PORT = process.env.PORT || 3000
app.use(bodyParser.json());

/*
 *  MULTER STORAGE CONFIG
 */
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
      },    

    filename: function (req, file, cb) {
        const prefix = Date.now() + '-'
        cb(null, prefix + file.originalname)
    }
})

/*
 *  MULTER "MIDDLEWARE" TO CHECK FILETYPE
 */

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
  
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(null, false);
    }
}

/*
 *  ADD CONFIG TO MULTER OBJECT
 */

const upload = multer({ storage: storage,
                        limits : {fileSize : 10000000},
                        fileFilter: function (req, file, cb) {
                            checkFileType(file, cb)
                        } 
                    })

/*
 *  ROUTE TO UPLOAD NEW FILE
 */
app.post("/media/upload", upload.single('file'), function (req, res) {
    console.log("Received image upload")
    if(!req.file) {
        return res.json({error: true, message: "invalid upload file"})
    }
    let mediaid = req.file.path.substring(req.file.path.indexOf("/")+1)
    res.json({mediaid: mediaid})
});

/*
 *  ROUTE TO ACCESS FILE 
 */
app.get('/media/access/:MEDIAID', async function (req, res) {
    let {MEDIAID} = req.params
    console.log(`Received image access for image with id: ${MEDIAID}`)
    let extension = MEDIAID.substring(MEDIAID.indexOf("."))
    let pathname = "uploads/" + MEDIAID
    
    try {
        await Fs.access(pathname)
        res.setHeader("Content-Type", mime.getType(extension))
        res.sendFile(path.join(__dirname, pathname))
    }
    catch {
        res.json({error: true, message: "File corresponding to MEDIAID could not be found"})
    }
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))