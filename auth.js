const bcrypt = require("bcrypt");
const passport = require("passport");
const ObjectId = require("mongodb").ObjectID;
const LocalStrategy = require("passport-local");


module.exports = (app, myDatabase) => {

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
        if (!bcrypt.compareSync(password,user.password)) { return done(null, false); }
        return done(null, user);
      });
    }
  ));


}