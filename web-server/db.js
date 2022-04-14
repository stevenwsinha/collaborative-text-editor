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
 * USER AND GAME SCHEMAS
 */ 

const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    email: String,
    verified: Boolean,
    verifyKey: String,
})

const docNameScheme = new mongoose.Schema({
    name: String,
})

module.exports = {  User: mongoose.model('User', userSchema),
                    DocName: mongoose.model('DocName', docNameScheme)
                }