const express = require('express');
const randomstring = require('randomstring');
const session = require('express-session'); 
const cookieParser = require('cookie-parser');
const fs = require('fs');
const axios= require('axios');


// const mongoose=require('mongoose');
// const Laty= require('./latymodel.js');
// const User= require('./usermodel.js');

// mongoose.connect('mongodb://localhost:27017/too_late_comer');
// const bcrypt = require('bcrypt');

var nodemailer = require('nodemailer');
var mailSender = require('./mailSender.js')

const app = express();
app.use('/',express.static(__dirname+'/public'));
var mainUser = "";

app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret:'mySecretKey',
    resave:true,
    saveUninitialized:true
}));

app.post('/login',(req,res)=>{
    console.log('checking login');
    if(!req.body.username || !req.body.password){
        return   res.send('username and password required');
    }
    let username = req.body.username;
    let password = req.body.password;
    console.log(username, password);

    fs.readFile(__dirname + '/users.json', 'utf-8',
        (err,data)=>{
            if(err) return res.send({err:err})
            let users = JSON.parse(data);
            console.log("users",users);
            for (let i = 0; i < users.length; i++) {
                if(users[i].username == username && users[i].password ==password){
                    
                    return res.send({error:0,result:users[i]});

                }                
            }
            return res.send({error:2,result:"user not found"});
        });
});



app.post('/reset-pass',(req,res)=>{
    console.log('reset password...');
    if(!req.body.email || !req.body.password){
        return   res.send('email and password required');
    }

    User.findOne({username:req.body.email},function(err,dbres){
        if(err) return res.send({err:err});
        if(!dbres) return res.send({error:1,data:"this email doesn't exist"}); 

        if(dbres.resetPassword){

            bcrypt.hash(req.body.password, 10, function(err, hashedPassResult){
                if(err) return res.send({err:err});
                console.log('hashed password', hashedPassResult);
                
                dbres.password = hashedPassResult;
                dbres.resetPassword = false;
                dbres.save(function(err){
                    res.send({error:0,data:"password succssfully reset"});
                });
            });  
        }else{
            return res.send({error:250,data:"you should confirm the email you got to reset your password"}); 
        }

    });    
});


app.post('/register',(req,res)=>{
    console.log('registeration...');
    if(!req.body.username || !req.body.password){
        return   res.send('username and password required');
    }
    User.findOne({username:req.body.username},function(err,dbres){
        if(err) return res.send({err:err});
        if(dbres) return res.send({error:101,data:'this user exist'}); 

        let activeKey = randomstring.generate(20);
 
        bcrypt.hash(req.body.password, 10, function(err, hashedPassResult){
            if(err) return res.send({err:err});
            console.log('password hashed');
        
            let query ={
                username: req.body.username,
                password: hashedPassResult ,
                previousVisit:new Date(),
                acitivateKey: activeKey,
                acitivate: false,
                resetPassword:false
            }
            
            let newUser= new User(query);
            newUser.save(function(err){
                if(err) return res.send(err);
                // return res.send({error:0, data:"Registered completed"});
                let mailBody = `<h3>Thanks for registration</h3>
                <p>Please confirm your registration by click on the link below:</p>
                <a href="http://localhost:3000/activate/?activateLink=${activeKey}">http://localhost:3000/activate/?activateLink=${activeKey}</a>
                <p>yours sincerely</p>
                <p>DCI Fbw8 Team</p>`
                mailSender.sendMail(req.body.username, "Confirm Acitivation",mailBody);
                res.send({error:0,data:"email has been sent"});
            });
        });    
    });    
});

app.post('/reset',(req,res)=>{
    console.log('reset password...');
    if(!req.body.email){
        return   res.send('email required');
    }
    User.findOne({username:req.body.email},function(err,dbres){
        if(err) return res.send({err:err});
        
        if(!dbres) return res.send({error:1,data:"this email doesn't exist"}); 
            let mailBody = `<h3>You got this email to reset your password</h3>
            <p>Please confirm to reset the password by click on the link below:</p>
            <a href="http://localhost:3000/reset/?activateLink=${dbres.acitivateKey}">Reset password</a>
            <p>yours sincerely</p>
            <p>DCI Fbw8 Team</p>`
            mailSender.sendMail(req.body.email, "Reset Password",mailBody);
            res.send({error:0,data:"email to reset password has been sent"}); 

    });    
});

app.get('/reset',(req,res)=>{
    if(req.query.activateLink){
        let query = {acitivateKey:req.query.activateLink};
        User.findOne(query, function (err, doc) {
            console.log("doc",doc);
            if (err) return res.send({error:err});
            console.log("doc",doc);            
            doc.resetPassword = true;
            doc.save(function(err,savedData){
                if(err) res.send({error:err});
                console.log('reset email activated');
                res.send({error:0,data:'Thanks, now your password ready to reset'});
            });
        });
    }
});

app.get('/activate',(req,res)=>{
    if(req.query.activateLink){
        let query = {acitivateKey:req.query.activateLink};
        User.findOne(query, function (err, doc) {
            console.log("doc",doc);
            if (err) return res.send({error:err});
            console.log("doc",doc);            
            doc.acitivate = true;
            doc.save(function(err,savedData){
                if(err) res.send({error:err});
                console.log('this email activated');
                res.send({error:0,data:'Thanks, now your email activated'});
            });
        });
    }
});

app.get('/getData',(req,res)=>{
    // fs.readFile(__dirname + '/esp32.json', 'utf-8',
    //     (err,data)=>{
    //         if(err) return res.send({err:err})
    //         return res.send(JSON.parse(data));
    //     });
    axios.get("http://nodeapps.vulkanclub.tech/getdata").then(response=>{
        // console.log("data",response.data);
        res.json(response.data);
    });
});

app.post('/laty',auth,(req,res)=>{
    let newLaty= new Laty(req.body);
    newLaty.save(function(err,dbres){
        if(err) return res.send(err);
        return res.send(dbres);
    });
});

// DELETE request to remove product
app.delete('/laty/:id',auth,(req,res)=>{
    Laty.deleteOne( {_id:req.params.id}, function (err,docs) {
        if(err) return res.send({error:err});
        res.send({data:'Record has been removed'});
    });
});

app.get('/logout',(req,res)=>{
    req.session.destroy();
    res.send({error:0, result:'logded out succssfully!'});
});
 
 // create authentication / autherrize function
function auth(req,res,next){
     if(req.session && req.session.user == mainUser && req.session.admin){
         return next();
     }else{
         return res.sendStatus(401);
     }
}
 

app.listen(8080);
console.log('app running at port 8080');