const express = require("express");
const http = require("http");
const mysql = require("mysql");
var cookieParser = require("cookie-parser");
var tryParse = require("tryparse");
const session = require("express-session");
const app = express();
const bodyParser = require("body-parser");
var userNameForNavbar = "";
var userAuthorID;
var errorMessage = "";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    key: "bandCookie",
    secret: "shubham",
    resave: false,
    saveUninitialized: true,
    cookie: {
      expires: 60000
    }
  })
);

app.set("view engine", "ejs");

// import all bootstrap and css files that are going to be injected i our app
app.use("/js", express.static(__dirname + "/node_modules/bootstrap/dist/js"));
app.use("/js", express.static(__dirname + "/node_modules/tether/dist/js"));
app.use("/js", express.static(__dirname + "/node_modules/Jquery/dist"));
app.use("/css", express.static(__dirname + "/node_modules/bootstrap/dist/css"));

app.use(cookieParser());
const Sqlconnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "sampledb"
});

// Sqlconnection.connect(function(err, result) {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log("success");
//   }
// });

const siteTitle = "BandList";
const baseURL = "http://localhost:3020/";
const loginURL = "/Band/login";
const registerURL = "/Band/register";

//register route

app.get("/band/register", function(req, res) {
  res.render("pages/register", {
    siteTitle: siteTitle,
    pageTitle: "Register",
    errMessage: errorMessage,
    items: ""
  });
});

app.post("/band/register", function(req, res) {
  var user = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    dob: req.body.dob,
    company: req.body.company
  };
  if (
    user.name == "" ||
    user.email == "" ||
    user.password == "" ||
    user.dob == ""
  ) {
    errorMessage = "all fields are required";
    res.render("pages/register", {
      siteTitle: siteTitle,
      pageTitle: "Register",
      errMessage: errorMessage,
      items: ""
    });
  } else {
    Sqlconnection.query("INSERT INTO user SET ?", user, function(
      error,
      results,
      fields
    ) {
      if (error) {
        //console.log("error ocurred",error);
        errorMessage = "ocurred";
        res.render("pages/register", {
          siteTitle: siteTitle,
          pageTitle: "Register",
          errMessage: errorMessage,
          items: ""
        });
      } else {
        errorMessage = "";
        res.redirect(loginURL);
      }
    });
  }
});

//login route
app.get("/band/login", function(req, res) {
  res.render("pages/login", {
    siteTitle: siteTitle,
    pageTitle: "Login",
    errMessage: "",
    items: ""
  });
});

app.post("/band/login", function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  Sqlconnection.query("SELECT * FROM user WHERE email = ?", [email], function(
    error,
    results,
    fields
  ) {
    if (error) {
      errorMessage = "sql error occured";
      res.render("pages/login", {
        siteTitle: siteTitle,
        pageTitle: "Login",
        errMessage: errorMessage,
        items: ""
      });
    } else {
      if (results.length > 0) {
        if (results[0].password == password) {
          userNameForNavbar = results[0].name;
          errorMessage = "";
          userAuthorID = results[0].Author_id;
          req.session.user = req.body.email;
          res.redirect(baseURL);
        } else {
          errorMessage = "Email and password does not match";
          res.render("pages/login", {
            siteTitle: siteTitle,
            pageTitle: "Login",
            errMessage: errorMessage,
            items: ""
          });
        }
      } else {
        errorMessage = "Email does not exist";
        res.render("pages/login", {
          siteTitle: siteTitle,
          pageTitle: "Login",
          errMessage: errorMessage,
          items: ""
        });
      }
    }
  });
});

//logout
app.get("/band/logout", function(req, res) {
  if (req.session.user && req.cookies.bandCookie) {
    userNameForNavbar = "";
    res.clearCookie("bandCookie");
    res.redirect(loginURL);
  } else {
    res.redirect(loginURL);
  }
});

//middleware for sessions
app.use((req, res, next) => {
  if (req.cookies.bandCookie && !req.session.user) {
    res.clearCookie("bandCookie");
  }
  next();
});

var sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.bandCookie) {
    //res.redirect(baseURL);
    next();
  } else {
    res.redirect(loginURL);
  }
};

app.get("/", sessionChecker, function(req, res) {
  //getting data from Mysql
  Sqlconnection.query(
    "select * from band ",
    // "select * from band where Author_id = ?" + [userAuthorID],
    function(err, result) {
      console.log("output" + result);

      // rendering page to show data
      res.render("pages/index", {
        siteTitle: siteTitle,
        pageTitle: "List of bands",
        userName: userNameForNavbar,
        items: result
      });
    }
  );
});

//add new band

app.get("/band/add", sessionChecker, function(req, res) {
  res.render("pages/add-band", {
    siteTitle: siteTitle,
    pageTitle: "Add new band",
    userName: userNameForNavbar,
    items: ""
  });
});

//post method to enter the form fields in DB
app.post("/band/add", sessionChecker, function(req, res) {
  //generating the insert query
  var query =
    `insert into band(band_name,Author_id) values ('` +
    req.body.band_name +
    "'," +
    1 +
    ")";

  Sqlconnection.query(query, function(err, result) {
    if (err) {
      console.log(`can't insert data` + err);
    } else {
      res.redirect(baseURL);
    }
  });
});

//edit the existing entry
app.get("/band/edit/:band_id", sessionChecker, function(req, res) {
  Sqlconnection.query(
    `select * from band where band_id = ` + req.params.band_id,
    function(err, result) {
      if (err) {
        console.log("updation err" + err);
      } else {
        res.render("pages/edit-band", {
          siteTitle: siteTitle,
          pageTitle: `Edit band`,
          userName: userNameForNavbar,
          items: result
        });
        //  console.log(result);
      }
    }
  );
});

//post method for editing
app.post("/band/edit/:band_id", sessionChecker, function(req, res) {
  var query =
    `UPDATE band 
                   SET band_name = '` +
    req.body.band_name +
    `' where band_id = ` +
    req.params.band_id;

  Sqlconnection.query(query, function(err, result) {
    if (err) {
      console.log(`updation error` + err);
    } else {
      res.redirect(baseURL);
    }
  });
});

// delete band
app.get("/band/delete/:band_id", sessionChecker, function(req, res) {
  Sqlconnection.query(
    "DELETE FROM band WHERE band_id=" + req.params.band_id,
    function(err, result) {
      if (err) {
        console.log("deletion error" + err);
      } else {
        res.redirect(baseURL);
      }
    }
  );
});

app.listen(3020, function() {
  Sqlconnection.query(
    `CREATE TABLE IF NOT EXISTS user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(15) NOT NULL,
    dob DATE NOT NULL,
    company VARCHAR(45) NOT NULL,
    email VARCHAR(45) NOT NULL,
    password VARCHAR(45) NOT NULL,
    
)`,
    function(err, result) {
      if (err) {
        console.log("error in creating table");
      } else {
        console.log("user table created");
      }
    }
  );
  Sqlconnection.query(
    `CREATE TABLE IF NOT EXISTS band (
    band_id INT AUTO_INCREMENT PRIMARY KEY,
    band_name VARCHAR(45) NOT NULL,
    Author_id VARCHAR(45) NOT NULL
    
)`,
    function(err, result) {
      if (err) {
        console.log("error in creating table");
      } else {
        console.log("band table created");
      }
    }
  );
  console.log("server created!!!");
});
