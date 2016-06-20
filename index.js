// Include Global Needs
// Hi Internet! It's Brandon Corbin - this is my big spender experiments main index page.
// there's very little that you would need to mess with here, but you can use it as an
// example of how to make things work. Most likely the structure is all wrong - for
// that, I appologize to any purists, feel free to correct and push.
//
// Sincerely,
// Brandon
//

// Configuration
var express = require('express'),
path = require('path'),
favicon = require('serve-favicon'),
logger = require('morgan'),
cookieParser = require('cookie-parser'),
bodyParser = require('body-parser'),
ejsLayouts = require("express-ejs-layouts"),
theExperiment = require(__dirname + '/experiment/experiment'),
config = require(__dirname+'/config'),
mailer = require(__dirname+'/components/mailer');
app = express();

// Set limits for uploading data.
app.use(bodyParser.json({ limit: config.server.maxUpload }));
app.use(bodyParser.urlencoded({ limit: config.server.maxUpload, extended: true }));
app.use(ejsLayouts);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(cookieParser());
app.use(function (req, res, next) {
  //Setup CORS
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// The Main Route
// Pass everything to the experiment Routes`
app.use('/', theExperiment);

// EVERYTHING ELSE

app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json('error', {
    message: err.message,
    error: err
  });
});

/// Set the Port
app.listen(config.server.port, function () {
  console.log('Example app listening on port '+config.server.port);
});

process.on('uncaughtException', function (error) {
  console.log(error.stack);
});

module.exports = app;
