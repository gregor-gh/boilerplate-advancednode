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

  const ensureAuthenticated = (req, res, next) => {
    if(req.isAuthenticated()) {
      return next();
    }
    res.redirect("/")
  }


    passport.serializeUser((user,done) => {
    done(null, user._id)
  })
  
  passport.deserializeUser((id,done) => {
    myDatabase.findOne({
      _id: new ObjectId(id)
    }, (err, doc) => {
      done(null,doc)
    })
  })

  passport.use(new LocalStrategy(
    (username, password, done) => {
      myDatabase.findOne({ username: username }, (err, user) => {
        console.log("User " + username + " attempted to log in");
        if(err) { return done(err); }
        if(!user) {return done(null, false); }
        if (password != user.password) { return done(null, false); }
        return done(null, user);
      });
    }
  ));

  app.route('/').get((_req, res) => {
    res.render(process.cwd() + '/views/pug', {
      title: "Connected to Database",
      message: "Please login",
      showLogin: true,
      showRegistration: true
    });
  });

  app.route("/login").post(passport.authenticate("local", { failureRedirect: "/" }), (_req, res) => {
    res.render(process.cwd() + "/views/pug/profile.pug")
  })

  app.route("/register")
    .post((req, res,next) => {
     
      const registerUser = async (username, password) => {
        try {
          const userExists = await myDatabase.findOne({username: username})
          if(userExists) {
            res.redirect("/");
          }
          else {
            myDatabase.insertOne({
              username: username,
              password: password
            });
            next();
          }
        }
        catch(e) { 
          console.log(e);
          res.redirect("/");
        }
      } 

      registerUser(req.body.username, req.body.password)

    },
      passport.authenticate("local", { failureRedirect: "/" }), (req, res, next) => {
        res.redirect("/profile")
      });

  app.route("/profile")
    .get(ensureAuthenticated, (req, res) => {
      res.render(process.cwd() + "/views/pug/profile", {
        username: req.user.username
      });
    });
  
  app.route("/logout")
    .get((req,res)=> {
      req.logout();
      res.redirect("/")
    })

  app.use((_req, res, _next) => {
    res.status(404)
      .type("text")
      .send("Not Found")
  })

}).catch(e => {
  app.route("/").get((_req,res) => {
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
