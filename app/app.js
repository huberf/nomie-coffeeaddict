var express = require('express'),
  router = express.Router(),
  ejs = require('ejs'),
  fs = require('fs'),
  moment = require('moment');

//
// Load the Config
var config = require(__dirname + '/config/all');

//
// Load Test Data - for testing the UI
var TestData = require(__dirname + '/utils/test-data');

//
// Load Data Processor 
// This is the main function that handles the massaging of the data
var DataProcessor = require(__dirname + '/components/data-processor');


//
// JOIN Route
// 
// The route localhost/join is the URL you'd provide to Nomie to test 
// in the App for example: http://192.168.1.150:5000/join

router.get('/join', function(req, res, next) {
  res.send(config.app.get(config.server.getActive().url));
});


//
// TEST Route
// 
// This will generate some fake data and display a close representation
// to what your results would look like in Nomie. Please note that this
// view is an approximation - using an external Nomie UI library. 
// Nomie DOES NOT contain all of the same classes as NUI. 

router.get('/test', function(req, res, next) {
  var postData = new TestData();

  DataProcessor(postData.generate(), function(err, results) {
    var file = fs.readFileSync(__dirname + '/views/results.ejs', 'utf8');
    var rendered = ejs.render(file, results);
    (!err) ? res.send('<link href="http://nui.nomie.io/css/nui.css" rel="stylesheet" />' + rendered) : res.json(err);
  })
});

//
// CAPTURE Route
// 
// This is the Main Capture route. It is fired when a user runs the Cloud App
// or the schedule is triggered 

router.post('/capture', function(req, res, next) {

  try {
    console.log("## CAPTURE :: START");
    var results = {};

    // Set defaults in case something went wrong
    req.body = req.body || {};
    req.body.experiment = req.body.experiment || {};
    req.body.experiment.info = req.body.experiment.info || {};
    req.body.experiment.info.email = req.body.experiment.info.email || null;

    if (!req.body.experiment.slots) {

      //
      // Missing Slots
      // Possible this is not a valid request. 
      // Let's die
      // 
      res.json({
        success: false,
        error: {
          message: "No Slots were passed"
        },
      });
    } else {

      // 
      // Everything is in order. 
      // Let's process the results 
      // 
      DataProcessor(req.body, function(err, results) {
        if (!err) {

          // Get the Results file and merge it with the results
          var file = fs.readFileSync(__dirname + '/views/results.ejs', 'utf8');
          var rendered = ejs.render(file, results);

          // Send JSON back to Nomie.
          res.json({
            html: results.html,
            results: {
              good: true
            }
          });
        }

      });

    } // end if they have slots or not.

  } catch (e) {
    console.log("#################### ERROR CAUGHT ########################");
    console.log('#', e);
    res.json(e);
  }

});


module.exports = router;