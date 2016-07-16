
// Welcome!
// There's really not much you should need to do in this file. 
// Everything you need is located in ./app/*

// Base Requirements 
var express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    ejsLayouts = require("express-ejs-layouts"),
    config = require(__dirname + '/app/config/all'),
    app = express();

// Set limits for uploading data.
app.use(bodyParser.json({ limit: config.server.server.maxUpload }));
app.use(bodyParser.urlencoded({ limit: config.server.server.maxUpload, extended: true }));
app.use(cookieParser());
// Set up EJS and Views
app.use(ejsLayouts);
app.set('views', __dirname + '/app/views');
app.set('view engine', 'ejs');
// Set up logger for Dev
app.use(logger('dev'));

// Set up Public Folder
app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS
// This allows anyone to call the REST services. 
app.use(function(req, res, next) {
    //Setup CORS
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


// 
// The Main Route
// Includes and maps base routes to the main App. 

var cloudApp = require(__dirname + '/app/app');
app.use('/', cloudApp);



// EVERYTHING ELSE

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.json('error', {
            message: err.message,
            error: err
        });
    });
}

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json('error', {
        message: err.message,
        error: err
    });
});

/// Set the Port
app.listen(config.server.server.port, function() {
    console.log('Example app listening on port ' + config.server.server.port);
});

process.on('uncaughtException', function(error) {
    console.log(error.stack);
});

module.exports = app;
