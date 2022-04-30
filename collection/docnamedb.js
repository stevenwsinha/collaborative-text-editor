const mongoose = require('mongoose');

/*
 *  SET UP MONGOOSE CONNECTION
 */
mongoose
    .connect('mongodb://127.0.0.1:27017/milestone2')
    .catch(e => {
        console.error('Connection error', e.message);
    })

const db = mongoose.connection;

/*
 * DOC SCHEMAS
 */ 


const docNameScheme = new mongoose.Schema({
    docid: String,
    name: String,
})

module.exports = {  DocName: mongoose.model('DocName', docNameScheme)
                    }