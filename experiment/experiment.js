var express = require('express');
var router = express.Router();
var ejs = require('ejs');
var fs = require('fs');
var moment = require('moment');
var Mailer = require('../components/mailer');
var User = require('../components/user');
var config = require(__dirname+'/../config');

var experimentSettings = {
  name : "BigSpender",
  summary : "Track how much you're spending",
  id : "io.nomie.experiments.bigspender."+Math.random(), // Math.random allows users to add this experiment multiple times.
  color : "#63ab0d", // Pick a color that works on both black and white backgrounds
  uses : ['nickname','geo'], // available: 'nickname','geo'
  createdBy : "Brandon Corbin"
};


router.get('/fuck', function(req, res, next) {

  var results = {};
  results.passed = "2016-06-19T15:08:07.613Z";
  results.now = new Date();
  results.offset = new Date(results.passed).getTimezoneOffset();
  results.moment = moment().parseZone(results.passed).utcOffset();
  res.json(results);
});
router.post('/fuck', function(req, res, next) {
  res.json({
    body : req.body
  });
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
          // Look up the user by the anon id - pulling from redis
      // this User is defined in ../components/user.js
      var user = new User(req.body.anonid, function(err, user) {
        console.log("## CAPTURE :: USER LOAD", err, user);
        // What's the name of the primary slot for this experiment?



        try {
          var slotName = 'spend';
          var slot = req.body.experiment.slots[slotName]; // Get the Tracker Slot
          var rows = slot.data || []; // Get Tracker Data

          // Determine the users offset by looking at the last records time
          var offset = req.body.timezoneOffset || 0;
          var createdDate = new Date(req.body.created);

          console.log("########################################################");
          console.log("##### User Timezone Offset", offset, new Date(req.body.created));
          console.log("########################################################");

          // Set up the base numbers
          var thisWeekSpend = 0;
          var lastWeekSpend = 0;
          var todaySpend = 0;
          var yesterdaySpend = 0;

          // Setup date keys
          var thisWeek = moment().utcOffset(offset).startOf('week').format('W-YYYY'); // eg 51-2016
          var lastWeek = moment().utcOffset(offset).subtract(1, 'week').startOf('week').format('W-YYYY'); // eg 50-2016
          var today = moment().utcOffset(offset).format('MMM-Do-YYYY'); // eg Jan-6th-2016
          var yesterday = moment().utcOffset(offset).subtract(1, 'day').format('MMM-Do-YYYY'); // eg Jan-6th-2016
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
          for(var i in rows) {
            var value = rows[i].value || 0;
            var rTime = moment(new Date(rows[i].time)).utcOffset(offset);
            var day = rTime.format('MMM-Do-YYYY');
            var week = rTime.startOf('week').format('W-YYYY');

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

          console.log('################################################');
          console.log("### SHOULD BE THE TRACKER ID", slot.tracker._id);

          // If the user provided a goal - lets do some
          // of that goal comparison magic
          var goal = req.body.experiment.info.goal.value || 0; // Incase they're stupid
          if(isNaN(goal)) {
            goal = 0;
          };

          // Check to see if we're over the users limit
          var overlimit = false;
          if(goal > 0 &&  thisWeekSpend > goal) {
            console.log("## CAPTURE :: OVER THE LIMIT!");
            overlimit = true;
          }

          // Determine the percent towards the goal
          var percentTowardGoal = null;
          if(goal) {
            percentTowardGoal = ((thisWeekSpend / goal)  * 100).toFixed(0);
          }

          // Create a big old Results object full of awesome stuff.
          var results = {
            now : now,
            overlimit : overlimit,
            goal : goal,
            email : email,
            weekStart : moment().utcOffset(offset).startOf('week').format('ddd MMM Do YYYY'),
            weekEnd : moment().utcOffset(offset).endOf('week').format('ddd MMM Do YYYY'),
            todaySpend : todaySpend,
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

            //console.log("::: EMAIL CONTENT ", emailRendered);

            var time = user.get(lastMessageKey);

            console.log("## CAPTURE :: LAST MESSAGE", time);

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

// Get the main page - this will generate the Experiment JSON doc that nomie will
// use for the join process.
router.get('/', function(req, res, next) {

  var protocol = (req.secure) ? 'https://' : 'http://';

  if(process.env['NODE_ENV']=='production') {
    protocol = 'https://';
  }

  var experimentConfiguration = {
    "secure" : req.secure,
    "name" : experimentSettings.name,
    "id" : experimentSettings.id,
    "summary" : experimentSettings.summary,
    "uses" : experimentSettings.uses,
    "color" : experimentSettings.color,
    "hostedBy" : experimentSettings.createdBy,
    // "more" : protocol+req.headers.host+"/?detail",
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
        "label" : "Weekly Max Spend",
        "value" : "",
        "required" : "true",
        "placeholder" : "100.00",
        "description" : "What's the max you want to spend each week?"
      },
      "email" : {
        "type" : "text",
        "label" : "Optional Email",
        "value" : "",
        "placeholder" : "your@email.com",
        "description" : "Notify you when you go over the limit?"
      }

    },
    "slots" : {
      "spend" : {
        "label" : "Money",
        "summary" : "Tracker used to track spending",
        "tracker" : null,
        "required" : true
      }
    }
  };

  res.json(experimentConfiguration);
});





module.exports = router;
