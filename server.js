'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require("express-session");
const passport = require("passport");
const routes = require("./routes.js");
const auth = require("./auth.js");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passportSocketIo = require("passport.socketio")
const MongoStore = require("connect-mongo")(session);
const store = new MongoStore({url: process.env.MONGO_URI})

app.use(cors())
app.set('view engine', 'pug')

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure:false },
  key: "express.sid",
  store: store
}))

app.use(passport.initialize());
app.use(passport.session());

  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: "express.sid",
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  )

myDB(async client => {
  const myDatabase = await client.db("advnode").collection("users");
  routes(app, myDatabase);
  auth(app, myDatabase);

  let currentUsers = 0;
  io.on('connection', (socket) => {
    ++currentUsers;
    io.emit('user', {
      name: socket.request.user.username,
      currentUsers,
      connected: true});
    console.log('user ' + socket.request.user.username + ' connected');

    socket.on("chat message", message => {
      io.emit("chat message", {
        name: socket.request.user.username,
        message
      })
    })

    socket.on("disconnect",() => {
      --currentUsers;
      io.emit("user", {
        name: socket.request.user.username,
        currentUsers,
        connected: false})
    })
  });

}).catch(e => {
  app.route("/").get((_req,res) => {
    res.render(process.cwd() + '/views/pug', {
      title: e,
      message: "Unable to login, login server down"
    });
  })
})

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
