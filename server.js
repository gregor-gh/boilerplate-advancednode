'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require("express-session")
const passport = require("passport")
const ObjectId = require("mongodb").ObjectID;
const LocalStrategy = require("passport-local");

const app = express();

app.set('view engine', 'pug')

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure:false }
}))

app.use(passport.initialize());
app.use(passport.session());



myDB(async client => {
  const myDatabase = await client.db("advnode").collection("users");

  app.route('/').get((req, res) => {
    res.render(process.cwd() + '/views/pug', {
      title: "Connected to Database",
      message: "Please login"
    });
  });

  passport.serializeUser((user,done) => {
    done(null, user._id)
  })
  
  passport.deserializeUser((id,done) => {
    myDB.findOne({
      _id: new ObjectId(id)
    }, (err, doc) => {
      done(null,doc)
    })
  })

  passport.use(new LocalStrategy(
    (username, password, done) => {
      myDB.findOne({ username: username }, (err, user) => {
        console.log("User " + username + "attempted to log in");
        if(err) { return done(err); }
        if(!user) {return done(null, false); }
        if (password != user.password) { return done(null, false); }
        return done(null, user);
      });
    }
  ));
}).catch(e => {
  app.route("/").get((req,res) => {
    res.render(process.cwd() + '/views/pug', {
      title: e,
      message: "Unable to login, login server down"
    });
  })
})



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
