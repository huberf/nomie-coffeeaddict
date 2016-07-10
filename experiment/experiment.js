var express = require('express');
var router = express.Router();
var ejs = require('ejs');
var fs = require('fs');
var moment = require('moment');
var Mailer = require('../components/mailer');
var User = require('../components/user');
var config = require(__dirname+'/../config');


var getExperimentConfig = function(req) {
  // Determine if we should do HTTPS or not.
  var protocol = 'http://';
  if(process.env['NODE_ENV']=='production') {
    protocol = 'https://';
  }

  // Base Configuration
  var experimentConfiguration = {
    "secure" : false,
    "name" : "Big Spender",
    "img" : "https://snap.icorbin.com/bigspender-cover-2.jpg",
    "id" : "io.nomie.experiments.bigspender."+Math.random(), // Math.random allows users to add this experiment multiple times.
    "summary" : "Monitor your spending! BigSpender helps keep track of how much money you spend on... whatever. Set a weekly budget and be notified when you're getting close.",
    "uses" : ['nickname','geo'], // available: 'nickname','geo'
    "color" : "#E59B81", // Pick a color that works on both black and white backgrounds
    "hostedBy" : "Brandon Corbin",
    "more" : protocol+req.headers.host+"/about",
    "collection" : {
        "method" : "automatic",
        "frequency" : "30mm", // every 30 minutes
        "url" : protocol+req.headers.host+"/capture",
        "amount" : "1m" // select one month back
    },
    "leave" : protocol+req.headers.host+"/capture",
    "info" : {
      "goal" : {
        "type" : "text",
        "label" : "Your Weekly Budget",
        "value" : "75.00",
        "required" : "true",
        "placeholder" : "100.00",
        "description" : null
      },
      "email" : {
        "type" : "text",
        "label" : "Optional Email to Notify",
        "value" : "",
        "placeholder" : "your@email.com",
        "description" : null
      }
    },
    "slots" : {
      "spend" : {
        "label" : "Food Out Cost",
        "summary" : "Tracker used to track spending",
        "tracker" : null,
        "required" : true
      }
    }
  };

  return experimentConfiguration;
};



// *****************************************************
// Generate the Experiment JSON doc for Nomie to consume

router.get('/join', function(req, res, next) {


  res.json(getExperimentConfig(req));
});



router.get('/', function(req, res, next) {
  res.render('about', { experiment : getExperimentConfig(req)});
});
router.get('/about', function(req, res, next) {
  res.render('about', { experiment : getExperimentConfig(req)});
});

/*****************************************************

  #####     #    ######  ####### #     # ######  #######
 #     #   # #   #     #    #    #     # #     # #
 #        #   #  #     #    #    #     # #     # #
 #       #     # ######     #    #     # ######  #####
 #       ####### #          #    #     # #   #   #
 #     # #     # #          #    #     # #    #  #
  #####  #     # #          #     #####  #     # #######

This route is the primary capture method for your experiment.
Data will be posted to the body of the request.

req.body.anonid
req.body.created (JSON Date)
req.body.timezoneOffset - users current timezoneOffset
req.body.nickname (if your experiment requires it)
req.body.experiment
req.body.experiment.slots[tracker1]
req.body.experiment.slots[tracker1].tracker
req.body.experiment.slots[tracker1].tracker.label
req.body.experiment.slots[tracker1].tracker.color
req.body.experiment.slots[tracker1].tracker.charge
req.body.experiment.slots[tracker1].tracker.config

*
******************************************************/
router.post('/capture', function(req, res, next) {

  try {
    console.log("## CAPTURE :: START");
    var results = {};

    // Set defaults in case something went wrong
    req.body = req.body || {};
    req.body.experiment = req.body.experiment || {};
    req.body.experiment.info = req.body.experiment.info || {};
    req.body.experiment.info.email = req.body.experiment.info.email || null;


    if(!req.body.experiment.slots) {
      console.log("## CAPTURE :: ERROR - Data mismatch");
      res.json({
        success : false,
        error : {},
        message : "No Slots were passed"
      });
    } else {
      console.log("## CAPTURE :: WE HAVE SLOTS! GOOD.");
          // Look up the user by the anon id - pulling from redis
      // this User is defined in ../components/user.js
      var user = new User(req.body.anonid, function(err, user) {
        console.log("USER SAVED:: MOVING ON TO PROCESSING RESULTS");
        try {
          var daySlotFormat = 'YYYY-MM-DD';
          var slotName = 'spend';
          var slot = req.body.experiment.slots[slotName]; // Get the Tracker Slot
          var rows = slot.data || []; // Get Tracker Data

          // Determine the users offset by looking at the last records time
          var offset = req.body.timezoneOffset || 0;
          var createdDate = new Date(req.body.created);

          // Set up the base numbers
          var thisWeekSpend = 0;
          var lastWeekSpend = 0;
          var todaySpend = 0;
          var yesterdaySpend = 0;

          // Setup date keys
          var thisWeek = moment().utcOffset(offset).startOf('week').format('W-YYYY'); // eg 51-2016
          var lastWeek = moment().utcOffset(offset).subtract(1, 'week').startOf('week').format('W-YYYY'); // eg 50-2016
          var today = moment().utcOffset(offset).format(daySlotFormat); // eg Jan-6th-2016
          var yesterday = moment().utcOffset(offset).subtract(1, 'day').format(daySlotFormat); // eg Jan-6th-2016
          var now = moment().utcOffset(offset).format("ddd MMM Do YYYY hh:mma") + ' offset: '+offset + ' created:'+req.body.created + ' typeof: '+moment(req.body.created).utcOffset(offset).format("ddd MMM Do YYYY hh:mma ");

          // Get their email - if they passed it.
          // We get this field, because in the router.get('/') below, we specify
          // an email input field as well as a weekly goal.
          // req.body.experiment.info will contain those fields
          // If the user did provide it, we're going to save it
          
          var email;
          if(req.body.experiment.info.email) {
            email = req.body.experiment.info.email.value || null;
            console.log("## CAPTURE :: USER PROVIDED EMAIL "+email);
            user.set('email', email);
            user.save(function() {});
          }

          // Loop over the individual records
          // Here we will basically tally up the totals based on the week
          var lastWeekDaily = {};
          var thisWeekDaily = {};
          
          var lwloop = moment().startOf('week').subtract(1, 'week');
          var twloop = moment().startOf('week');
          var todayDate = moment().utcOffset(offset);
          

          var lastWeekTally = {'sun' : 0, 'mon' : 0, 'tue' : 0, 'wed' : 0, 'thu' : 0, 'fri' : 0, 'sat' : 0};
          var thisWeekTally = {'sun' : 0, 'mon' : 0, 'tue' : 0, 'wed' : 0, 'thu' : 0, 'fri' : 0, 'sat' : 0};
          
          console.log("## CAPTURE :: LOOPING OVER DAYS");

          for(var i=0;i<7;i++) {
            lastWeekDaily[lwloop.format(daySlotFormat)] = { value : 0, day : lwloop.format('ddd').toLowerCase() };
            thisWeekDaily[twloop.format(daySlotFormat)] = { value : 0, day : twloop.format('ddd').toLowerCase() };
            lwloop.add(1, 'day');
            twloop.add(1, 'day');
          }


          

          for(var i in rows) {
            var value = rows[i].value || 0;
            var rTime = moment(new Date(rows[i].time)).utcOffset(offset);
            var day = rTime.format(daySlotFormat);
            var dayShortName = rTime.format('ddd');
            var week = rTime.startOf('week').format('W-YYYY');

            if(thisWeekDaily.hasOwnProperty(day)) {
              thisWeekDaily[day].value = thisWeekDaily[day].value + value;
            }
            if(lastWeekDaily.hasOwnProperty(day)) {
              lastWeekDaily[day].value = lastWeekDaily[day].value + value;
            }

            if(week === thisWeek) {
              thisWeekSpend = thisWeekSpend + value;
            }
            if(week === lastWeek) {
              lastWeekSpend = lastWeekSpend + value;
            }
            if(day === today) {
              todaySpend = todaySpend + value;
            }
            if(day === yesterday) {
              yesterdaySpend = yesterdaySpend + value;
            }
          }

          console.log("DAILY FORMATS");
          console.log(thisWeekDaily);
          console.log(lastWeekDaily);

          for(var i in thisWeekDaily) {
            thisWeekTally[thisWeekDaily[i].day]=thisWeekDaily[i].value;
          }
           for(var i in lastWeekDaily) {
            lastWeekTally[lastWeekDaily[i].day]=lastWeekDaily[i].value;
          }

          console.log("DAILY Tallys");
          console.log(thisWeekTally);
          console.log(lastWeekTally);


          // If the user provided a goal - lets do some
          // of that goal comparison magic
          var goal = req.body.experiment.info.goal.value || 0; // Incase they're stupid
          if(isNaN(goal)) {
            goal = 0;
          };

          // Check to see if we're over the users limit
          var overlimit = false;

          var lastWeekOverlimit = false;

          if(goal > 0 &&  thisWeekSpend > goal) {
            console.log("## CAPTURE :: OVER THE LIMIT!");
            overlimit = true;
          }

          if(goal > 0 &&  lastWeekSpend > goal) {
            console.log("## CAPTURE :: OVER THE LIMIT!");
            lastWeekOverlimit = true;
          }

          // Determine the percent towards the goal
          var percentTowardGoal = null;
          if(goal) {
            percentTowardGoal = ((thisWeekSpend / goal)  * 100).toFixed(0);
          }

          // Create a big old Results object full of awesome stuff.
          var results = {
            now : now,
            thisDay : moment().utcOffset(offset).format('ddd').toLowerCase(),
            overlimit : overlimit,
            lastWeekOverlimit : lastWeekOverlimit,
            goal : goal,
            email : email,
            weekStart : moment().utcOffset(offset).startOf('week').format('ddd MMM Do YYYY'),
            weekEnd : moment().utcOffset(offset).endOf('week').format('ddd MMM Do YYYY'),
            todaySpend : todaySpend,
            lastWeekDaily : lastWeekDaily,
            thisWeekDaily : thisWeekDaily,
            lastWeekTally : lastWeekTally,
            thisWeekTally : thisWeekTally,
            yesterdaySpend : yesterdaySpend,
            lastWeekSpend : lastWeekSpend,
            percentTowardGoal : percentTowardGoal,
            thisWeek : thisWeek,
            experiment : req.body.experiment,
            thisWeekSpend : thisWeekSpend
          };

          // If the user is over the limit, and they provided an email
          // we're going to send them an email!

          if(overlimit && email) {
            console.log("## CAPTURE :: OVER THE LIMIT - AND EMAIL!");
            var lastMessageKey = 'lastMessage-'+slot.tracker._id;
            overlimit = true;
            var emailTemplate = fs.readFileSync('./views/email.ejs','utf8');
            var emailRendered = ejs.render(emailTemplate, results);

            var time = user.get(lastMessageKey);
            var sendMail = true;

            if(!time) {
              console.log("## CAPTURE :: NO EMAIL SENT THIS WEEK - SEND");
              sendMail = true;
            } else {
              if(moment(time).utcOffset(offset).startOf('week').format('ddd MMM Do YYYY') == results.weekStart) {
                console.log("## CAPTURE :: DON'T SEND EMAIL - ALREADY SENT", err, time);
                sendMail = false;
              }
            }
            if(sendMail) {
              console.log("## CAPTURE :: SENDING THE EMAIL...");
              var mailer = new Mailer();
              user.set(lastMessageKey, new Date()).save();
              mailer.to(email)
                .subject(slot.tracker.label+" over Limit!")
                .body(emailRendered)
                .send(function(err, response) {
                  console.log("## CAPTURE :: EMAIL SENT");
                  console.log(err, response);
                });
            }

          } // end if over limit and we're to email them.

          // Send the response outside of waiting for the email to send.
          // WE don't really care if the email sends at this point.
          // We will go get the results view.
          var file = fs.readFileSync('./views/results.ejs','utf8');
          var rendered = ejs.render(file, results);

          // Return JSON to Nomie
          // Note, if you pass HTML, a modal will slide up with your HTML displayed
          // If you pass "url" : "http://myurl.com/something?id=what" then Nomie will
          // open full browser window to that url.

          res.json({
            html : rendered,
            results : {  good : true }
          });

        } catch(e) {
          res.json({
            success : false,
            error : e,
            message : e.message
          });
        } // end try catch




      }); // end look up user
    } // end if they have slots or not.

  } catch(e) {

    console.log("#################### ERROR CAUGHT ########################");
    console.log('#');
    console.log('#', e);
    console.log('#');
    console.log("##########################################################");
    res.json(e);
  }

});



module.exports = router;
