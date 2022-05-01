const express = require('express')
const bodyParser = require('body-parser')
const nodemailer = require("nodemailer");
const {User} = require('./userdb.js') 

const app = express()
const PORT = process.env.PORT || 5000
app.use(bodyParser.json());

/*
 *  CREATE NODEMAILER TRANSPORTER
 */
let transporter = nodemailer.createTransport({
    host: '127.0.0.1',
    port: 25,
    secure: false,
    tls:{
        rejectUnauthorized: false
    }
})

/*
 *  SET UP EXPRESS USER ROUTING
 */

app.post('/users/signup', async function (req, res) {
    let {name, password, email} = req.body;
    console.log(`Received USER ACCOUNT CREATION request for user: ${name} with email: ${email} and password: ${password}`);

    existingUser = await User.findOne({email: email});
    if(existingUser){
        return res.json({
            error: true,
            message: "A user with that email already exists"
        });
    }

    let newUser = new User({
        name, password, email
    });

    newUser.verified = false;

    let key = '';
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for ( let i = 0; i < 12; i++ ) {
        key += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    newUser.verifyKey = key;

    let savedUser = newUser.save()
    if(!savedUser){
        return res.json({
            error: true,
            message: "Server error, user account could not be saved"
        });
    }

    // CALL EMAIL FUNCTION HERE
    send_email(newUser.email, newUser._id, key)

    res.status(200).json({})
})

app.post('/users/login', async function (req, res) {
    let {email, password} = req.body;
    console.log(`Received LOGIN request for user: ${email}`);

    await User.findOne({email: email}).then((user) => {
        if (!user) {
            return res.json({
                error: true,
                message: "No user associated with that password"
            });
        }

        if(password !== user.password){
            return res.json({
                error: true,
                message: "Incorrect password"
            });
        }

        if (!user.verified) {
            return res.json({
                error: true,
                message: "Cannot log into unverified account"
            })
        }

        res.cookie('id', user._id);
        return res.json({name: user.name})
    })
})

app.post('/users/logout', async function (req, res) {
    res.clearCookie('id');
    res.redirect("/")
})

app.get('/users/verify', async function (req, res) {
    let {id, key} = req.query;
    console.log(`Received VERIFY request for user: ${id}`)

    await User.findById(id).then((user) => {
        if(!user) {
            return res.json({
                error: true,
                message: "No user associated with that id"
            });
        }

        if(key !== user.verifyKey) {
            return res.json({
                error: true,
                message: "Incorrect verification key"
            });
        }

        user.verified = true
        user.save()

        res.cookie('id', user._id);
        return res.redirect('/home')
    })
})

app.post('/users/retrieve', async function(req, res) {
    let {id} = req.body;
    console.log(`got retrieve request for user with id: ${id}`)
    
    await User.findById(id).then((user) => {
        return res.json({user: user})
    })
})

/*
 *  FUNCTION TO SEND A VERIFICATION EMAIL
 */
function send_email(email, id, key) {
    //let encoded_email = encodeURIComponent(email)
    let verification_link = "http://curve-blesser.cse356.compas.cs.stonybrook.edu/users/verify?id=" + id + "&key=" + key

    let mailOptions = {
        from: '"curve-blesser" <curve-blesser@curve-blesser.cse356.compas.cs.stonybrook.edu>',
        to: email,
        subject: "verification link",
        text: verification_link
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if(error) {
            console.log(error) 
        }
        else{
            console.log("mail sent!")
            console.log("info")
        }
    })
}

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))
