let express = require('express');
const cookieParser = require('cookie-parser');
let router = express.Router();

let bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({extended: false}));
router.use(bodyParser.json());
router.use(cookieParser());
const {Pool} = require('pg');
let jwt = require('jsonwebtoken');
let bcrypt = require('bcryptjs');
const sql = require('../queryes/user.js');
let config = require('../config.js');

// const pool = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'coursework',
//     password: 'Qwerty123_',
//     port: 5432,
// });
const pool = new Pool({
  connectionString: 'postgres://avzgegtvqfqmpx:39255c33de31232f84ea8d2e6a3053c226b0f1517fc1ededdd863b40037e1c9b@ec2-54-159-112-44.compute-1.amazonaws.com:5432/d3v6s6o400cft2',
  ssl: true,
});

router.post('/register', function (req, res) {
  let hashedPassword = bcrypt.hashSync(req.body.password, 8);
  let roles = '{'
  if (req.body.role) {
    req.body.role.forEach(el => {
      roles += el + ',';
    })
    roles = roles.substring(0, roles.length - 1);
  }
  roles += '}';
  let language_ids = '{'
  if (req.body.languageIds) {
    req.body.languageIds.forEach(el => {
      language_ids += el + ',';
    })
    language_ids = language_ids.substring(0, language_ids.length - 1);
  }
  language_ids += '}';
  pool.query(sql.createUser, [req.body.login, req.body.email, hashedPassword, req.body.first_name, req.body.last_name, req.body.about, roles, language_ids], (err, result) => {
    if (err) return res.status(500).send({message: "There was a problem registering the user."});
    if (!result.rows[0]) return res.status(404).send({message: "User already exists."});
    res.status(200).send({message: "User success added."});
  });
});

router.post('/login', function (req, res) {
  pool.query(sql.find_user_with_login, [req.body.login], (err, result) => {
    if (err) return res.status(500).send({message: 'Error on the server.'});
    if (!result.rows[0]) return res.status(404).send({message: 'No user found.'});
    let passwordIsValid = bcrypt.compareSync(req.body.password, result.rows[0].password);
    if (!passwordIsValid) return res.status(401).send({message: 'Login or password incorrect.'});
    let token = jwt.sign({id: result.rows[0].id}, config.secret, {
      expiresIn: 83600 // expires in 1 hour
    });
    console.log(result.rows[0].login);
    pool.query(sql.find_user_roles, [result.rows[0].id], (err, resul) => {
      if (err) throw err;
      res.cookie('token', token, {maxAge: 3600000}).status(200).send({ // expires in 1 hour
        auth: true,
        token: token,
        roles: resul.rows,
        active: result.rows[0].active,
        login: result.rows[0].login
      });
    });

  });
});

router.get('/logout', function (req, res) {
  res.cookie("token", null);
  res.status(200).send({auth: false, token: null});
});

module.exports = router;
