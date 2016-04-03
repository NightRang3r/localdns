var express = require('express');
var config = require('config');
var db = require('./db')();
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var app = express();
var pages = require('./controllers/page');
var users = require('./controllers/user');

app.set('trust proxy', 1);
app.set('view engine', 'jade');

app.locals.pretty = true;
app.locals.domain = config.domain;

app.use(express.static('public'));

app.use(require('body-parser').urlencoded({ extended: false }));

app.use(session({
	name: 'session',
	secret: 'foo',
	resave: false,
	saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: db })
}));

app.use(function (req, res, next) {
	res.locals.ip = req.connection.remoteAddress;
	res.locals.loggedIn = req.session.loggedIn || false;

	next();
});

app.get('/', pages.home);
app.get('/about', pages.about);
app.get('/register', users.register);
app.get('/login', users.login);
app.post('/update', users.update);

module.exports = app;
