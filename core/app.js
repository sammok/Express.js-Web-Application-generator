//  App config file
const ENVIRONMENT = process.env.NODE_ENV;
var CONFIG = require('./config.json');
CONFIG = CONFIG[ENVIRONMENT || 'develop'];

//  Dependencies
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var mongoose = require('mongoose');
var cors = require('cors');

//  App
var app = express();

//  App Config
app.set('config', CONFIG);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('staticSource', path.join(__dirname, 'public'));

//  serve static Sources
app.use(express.static(app.get('staticSource')));

//  Middleware
//  cors
if (CONFIG.env_name == 'production') {
  app.use(cors({
    origin: CONFIG.server.origins,
    credentials: true
  }));
}
else {
  app.use(function(req, res, next) {
    var origin = req.headers.origin;
    var allowCredentials;
    var response = false;

    var isAPITest = req.query.test_userName || req.query.test_userID;

    if (isAPITest) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      allowCredentials = false;
    } else {
      setAccessControlAllowOriginHeader(origin);
      allowCredentials = true;
    }

    //  if already response, terminating this cors middleware
    if (response == true) return;

    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', allowCredentials);

    function setAccessControlAllowOriginHeader (origin) {
      if(CONFIG.server.origins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        return response = false;
      } else {
        app.responseHelper(res, 400, "No 'Access-Control-Allow-Origin' header is present on the requested resource");
        return response = true;
      }
    }

    return req.method == 'OPTIONS' ? res.send(200) : next();
  });
}

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: CONFIG.session.redis_secret,
  store: new RedisStore,
  httpOnly: true
}));

//  initialize User Session if need
app.use(function (req, res, next) {
  if (ENVIRONMENT == 'production') {
    if (!req.session.user) {
      req.session.user = {
        username: '',
        id: ''
      };
    }
  } else {
    var testUsername = req.query.test_userName;
    var testUserID = req.query.test_userID;

    //  if the request is requested by API TEST,
    //  initialize User session via request info
    if (testUsername || testUserID) {
      req.session.user = {
        id: testUserID || '',
        username: testUsername || ''
      };
    }
    else {
      //  initialize an unlogin User Session
      if (!req.session.user) {
        req.session.user = {
          username: '',
          id: ''
        };
      }
    }
  }

  next();
});

app.run = function (config) {
  //  connect Mongodb
  mongoose.connect('mongodb://localhost/' + config.database);
  // mongoose.set('debug', true);

  //  init Mongodb Schema register
  require('./models/models').init();

  //  routes
  app.set("SERVER_URL", config.server.protocol + '://' + config.server.hostname + ':' + config.server.port);
  app.use(require('./routes/routes')(app));

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handlers
  if (CONFIG.env_name === 'production') {
    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {}
      });
    });
  } else {
    // development error handler
    // will print stacktrace
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

  //  listen the Port
  app.listen(config.server.port, function () {
    console.log('server running at ' + app.get('SERVER_URL'));
  });
};

//  run App
app.run(CONFIG);

module.exports = app;
