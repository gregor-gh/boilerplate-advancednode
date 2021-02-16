const passport = require("passport")
const bcrypt = require("bcrypt")

module.exports = (app, myDatabase) => {

  const ensureAuthenticated = (req, res, next) => {
    if(req.isAuthenticated()) {
      return next();
    }
    res.redirect("/")
  }

  app.route('/').get((_req, res) => {
    res.render(process.cwd() + '/views/pug', {
      title: "Connected to Database",
      message: "Please login",
      showLogin: true,
      showRegistration: true
    });
  });

  app.route("/login").post(passport.authenticate("local", { failureRedirect: "/" }), (req, res) => {
    res.render(process.cwd() + "/views/pug/profile", {
      username: req.user.username
    })
  })
 
  app.route('/register')
  .post((req, res, next) => {
    myDatabase.findOne({ username: req.body.username }, function(err, user) {
      if (err) {
        next(err);
      } else if (user) {
        res.redirect('/');
      } else {
        const hash = bcrypt.hashSync(req.body.password,12)

        myDatabase.insertOne({
          username: req.body.username,
          password: hash
        },
          (err, doc) => {
            if (err) {
              res.redirect('/');
            } else {
              // The inserted document is held within
              // the ops property of the doc
              next(null, doc.ops[0]);
            }
          }
        )
      }
    })
  },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    }
  );

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












/* this works but fcc tests don't pick it up properly 
  app.route("/register")
    .post((req, res, next) => {
     
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
            },
            (err, doc) => {
              if(err) throw err
              else next(null, doc.ops[0]);
            });
            
          }
        }
        catch(e) { 
          console.log(e);
          res.redirect("/");
        }
      } 

      registerUser(req.body.username, req.body.password)

    },
      passport.authenticate("local", { failureRedirect: "/" }), (_req, res) => {
        res.redirect("/profile")
      });
*/

}