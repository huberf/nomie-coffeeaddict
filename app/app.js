var express = require('express'),
  router = express.Router(),
  ejs = require('ejs'),
  fs = require('fs'),
  moment = require('moment'),
  User = require(__dirname + '/components/user');

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

router.get('/', function(req, res, next) {
  res.render('about', {
    cloudApp: config.app.get(config.server.getActive().url)
  });
});

router.get('/about', function(req, res, next) {
  res.render('about', {
    cloudApp: config.app.get(config.server.getActive().url)
  });
});

//
// TEST Route
// 
// This will generate some fake data and display a "close" representation
// to what your results would look like in Nomie. Please note that this
// view is an approximation - using an external Nomie UI library. 
// Nomie DOES NOT contain all of the same classes as NUI. The best way to test it
// is to add your Cloud app via the URL method to Nomie and test it within the app.


router.get('/test', function(req, res, next) {
  var postData = new TestData();

  DataProcessor(postData.generate(), function(err, results) {
    var file = fs.readFileSync(__dirname + '/views/results.ejs', 'utf8');
    
     // provide the config to the view too, if we need any of the variables.

    var rendered = ejs.render(file, results);
    (!err) ? res.send('<link href="http://nui.nomie.io/css/nui.css" rel="stylesheet" />' + rendered) : res.json(err);
  })
});

//
// CAPTURE Route
// 
// This is the Main Capture route. It is fired when a user runs the Cloud App
// or the schedule is triggered 
// 


router.post('/capture', function(req, res, next) {
  var user;
  try {
    console.log("## CAPTURE :: START");
    var results = {};

    // Set defaults in case something went wrong
    req.body = req.body || {};
    req.body.experiment = req.body.experiment || {};
    req.body.experiment.info = req.body.experiment.info || {};
    req.body.timezonOffset = req.body.timezonOffset || '-240';
    // req.body.experiment.info.email = req.body.experiment.info.email || null;

    if (!req.body.experiment.slots || !req.body.anonid) {

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
      var slotId = "spend";
      var spenderSlot = req.body.experiment.slots[slotId]; // get the first slot - in the BigSPender, it's case the only slot called "spend"

      user = new User(req.body.anonid, function(err, thisUser) {

        var isNewUser = (err) ? true : false; // is this a new user or not. If an error exists then we didnt find it in the storage unit.

        // 
        // Everything is in order - let's process the results.
        // If the user is over the limit, we will FORCE show the modal
        // one time, and ONLY one time. Don't be a dick and force show the results
        // a bunch.
        // 
        // If we haven't notified them of being over the limit this week
        // 
        // 
        DataProcessor(req.body, function(dataError, results) {
          var forceShow = false;
          if (!dataError) {

            // Get the Results file and merge it with the results
            var file = fs.readFileSync(__dirname + '/views/results.ejs', 'utf8');
            results.config = config;

            // 
            // Create a Sharing Message
            // to help promote the Cloud App and Nomie!
            var shareMessage = "I'm tracking my '"+spenderSlot.tracker.label+"' spending with @NomieApp. #bigspender";
            if(results.goal && results.overlimit) {
              shareMessage = "Ugh, I'm over my weekly '"+spenderSlot.tracker.label+"' budget by $"+(results.goal - results.thisWeekSpend).toFixed(2)+". @NomieApp #bigspender"
            } else if(results.goal) {
              shareMessage = "I'm UNDER my weekly '"+spenderSlot.tracker.label+"' budget by $"+(results.goal - results.thisWeekSpend).toFixed(2)+"!! @NomieApp #bigspender"
            }
            // Encode sharing message for save travels.
            results.shareMessage = encodeURI(shareMessage);

            // Render out results to a string
            var rendered = ejs.render(file, results);

            // Is the user of their limit?
            if (results.overlimit == true) {
              if (isNewUser) {
                // New User - lets see if they are already over the limit
                // if so, lets force show the modal to alert them. 
                forceShow = true;
              } else {
                // Existing User
                var lastMessage = thisUser.get(spenderSlot.tracker._id + '-message-on');
                if (!lastMessage) {
                  // No message for this slot and week. 
                  forceShow = true;
                } else {
                  var weekStart = moment().utcOffset(req.body.timezonOffset).startOf('week').format('MMM Do YYYY');
                  if (moment(lastMessage).utcOffset(req.body.timezonOffset).startOf('week').format('MMM Do YYYY') != weekStart) {
                    console.log("## CAPTURE :: DON'T SEND EMAIL - ALREADY SENT", err, time);
                    forceShow = true;
                  }

                }
              }

              // If we're going to force show this, lets save
              // that we did, this way we only show it one time 
              // for each week.
              if (forceShow) {
                thisUser.set(spenderSlot.tracker._id + '-message-on', moment().utcOffset(req.body.timezonOffset).toDate());
                thisUser.save(function(err, results) {});
              } // end updating user last message time for this lot. 
            } // end if over limit

            // Send JSON back to Nomie.
            res.json({
              forceShow: forceShow,
              html: rendered
              // url : 'http://localhost:5000/results/details?id='+req.body.anonid, // HTML or URL can be used, but not both. URL will open a users browser on their device.
            });
          }
        }); // end Processing Data

      }); // end User Data Loading.


    } // end if they have slots or not.

  } catch (e) {
    console.log("#################### ERROR CAUGHT ########################");
    console.log('#', e);
    res.json(e);
  }

});


module.exports = router;