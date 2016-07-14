var User = require(__dirname + '/user');
var moment = require('moment');
var fs = require('fs');
var ejs = require('ejs');

var processNomieData = function(postData, onComplete) {

  console.log("### PROCESS DATA ###");

  var user = new User(postData.anonid, function(err, user) {
    console.log("USER SAVED:: MOVING ON TO PROCESSING RESULTS");
    try {
      var daySlotFormat = 'YYYY-MM-DD';
      var slotName = 'spend';
      var slot = postData.experiment.slots[slotName]; // Get the Tracker Slot
      var rows = slot.data || []; // Get Tracker Data

      // Determine the users offset by looking at the last records time
      var offset = postData.timezoneOffset || 0;
      var createdDate = new Date(postData.created);

      // Set up the base numbers
      var thisWeekSpend = 0;
      var lastWeekSpend = 0;
      var todaySpend = 0;
      var yesterdaySpend = 0;

      // Get the dates for:
      // This week, last week, today, yesterday and now
      var thisWeek = moment().utcOffset(offset).startOf('week').format('W-YYYY'); // eg 51-2016
      var lastWeek = moment().utcOffset(offset).subtract(1, 'week').startOf('week').format('W-YYYY'); // eg 50-2016
      var today = moment().utcOffset(offset).format(daySlotFormat); // eg Jan-6th-2016
      var yesterday = moment().utcOffset(offset).subtract(1, 'day').format(daySlotFormat); // eg Jan-6th-2016
      var now = moment().utcOffset(offset).format("ddd MMM Do YYYY hh:mma") + ' offset: ' + offset + ' created:' + postData.created + ' typeof: ' + moment(postData.created).utcOffset(offset).format("ddd MMM Do YYYY hh:mma ");

      // Get their email - if they passed it.
      // We get this field, because in the router.get('/') below, we specify
      //postData input field as well as a weekly goal.
      // postData.experiment.info will contain those fields
      // If the user did provide it, we're going to save it

      var email;
      if (postData.experiment.info.email) {
        email = postData.experiment.info.email.value || null;
        console.log("## CAPTURE :: USER PROVIDED EMAIL " + email);
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


      var lastWeekTally = {
        'sun': 0,
        'mon': 0,
        'tue': 0,
        'wed': 0,
        'thu': 0,
        'fri': 0,
        'sat': 0
      };
      var thisWeekTally = {
        'sun': 0,
        'mon': 0,
        'tue': 0,
        'wed': 0,
        'thu': 0,
        'fri': 0,
        'sat': 0
      };


      // Set up a map for the days for this and last week

      for (var i = 0; i < 7; i++) {
        lastWeekDaily[lwloop.format(daySlotFormat)] = {
          value: 0,
          day: lwloop.format('ddd').toLowerCase()
        };
        thisWeekDaily[twloop.format(daySlotFormat)] = {
          value: 0,
          day: twloop.format('ddd').toLowerCase()
        };
        lwloop.add(1, 'day');
        twloop.add(1, 'day');
      }

      //////////////////////////////////////////
      ///
      // Loop over each Record! 
      // Do you Magic Work here. 

      for (var i in rows) {
        var value = rows[i].value || 0;
        var rTime = moment(new Date(rows[i].time)).utcOffset(offset);
        var day = rTime.format(daySlotFormat);
        var dayShortName = rTime.format('ddd');
        var week = rTime.startOf('week').format('W-YYYY');

        if (thisWeekDaily.hasOwnProperty(day)) {
          thisWeekDaily[day].value = thisWeekDaily[day].value + value;
        }
        if (lastWeekDaily.hasOwnProperty(day)) {
          lastWeekDaily[day].value = lastWeekDaily[day].value + value;
        }

        if (week === thisWeek) {
          thisWeekSpend = thisWeekSpend + value;
        }
        if (week === lastWeek) {
          lastWeekSpend = lastWeekSpend + value;
        }
        if (day === today) {
          todaySpend = todaySpend + value;
        }
        if (day === yesterday) {
          yesterdaySpend = yesterdaySpend + value;
        }
      }
      //////////////////////////////////////
      // end looping over rows


      // Loop over this week 
      for (var i in thisWeekDaily) {
        thisWeekTally[thisWeekDaily[i].day] = thisWeekDaily[i].value;
      }

      // Loop over last week
      for (var i in lastWeekDaily) {
        lastWeekTally[lastWeekDaily[i].day] = lastWeekDaily[i].value;
      }

      // If the user provided a goal - lets do some
      // of that goal comparison magic
      var goal = postData.experiment.info.goal.value || 0; // Incase they're stupid
      if (isNaN(goal)) {
        goal = 0;
      };

      // Check to see if we're over the users limit
      var overlimit = false;

      var lastWeekOverlimit = false;

      if (goal > 0 && thisWeekSpend > goal) {
        console.log("## CAPTURE :: OVER THE LIMIT!");
        overlimit = true;
      }

      if (goal > 0 && lastWeekSpend > goal) {
        console.log("## CAPTURE :: OVER THE LIMIT!");
        lastWeekOverlimit = true;
      }

      // Determine the percent towards the goal
      var percentTowardGoal = null;
      if (goal) {
        percentTowardGoal = ((thisWeekSpend / goal) * 100).toFixed(0);
      }

      // Create a big old Results object full of awesome stuff.
      var results = {
        now: now,
        thisDay: moment().utcOffset(offset).format('ddd').toLowerCase(),
        overlimit: overlimit,
        lastWeekOverlimit: lastWeekOverlimit,
        goal: goal,
        email: email,
        weekStart: moment().utcOffset(offset).startOf('week').format('ddd MMM Do YYYY'),
        weekEnd: moment().utcOffset(offset).endOf('week').format('ddd MMM Do YYYY'),
        todaySpend: todaySpend,
        lastWeekDaily: lastWeekDaily,
        thisWeekDaily: thisWeekDaily,
        lastWeekTally: lastWeekTally,
        thisWeekTally: thisWeekTally,
        yesterdaySpend: yesterdaySpend,
        lastWeekSpend: lastWeekSpend,
        percentTowardGoal: percentTowardGoal,
        thisWeek: thisWeek,
        experiment: postData.experiment,
        thisWeekSpend: thisWeekSpend
      };


      ///////////////////////////////////////////////////////////////
      // If the user is over the limit, and they provided an email
      // we're going to send them an email!

      if (overlimit && email) {
        var lastMessageKey = 'lastMessage-' + slot.tracker._id;
        var emailTemplate = fs.readFileSync(__dirname + '/../views/email.ejs', 'utf8');
        var emailRendered = ejs.render(emailTemplate, results);

        var time = user.get(lastMessageKey);
        var sendMail = true;

        if (!time) {
          console.log("## CAPTURE :: NO EMAIL SENT THIS WEEK - SEND");
          sendMail = true;
        } else {
          if (moment(time).utcOffset(offset).startOf('week').format('ddd MMM Do YYYY') == results.weekStart) {
            console.log("## CAPTURE :: DON'T SEND EMAIL - ALREADY SENT", err, time);
            sendMail = false;
          }
        }
        if (sendMail) {
          console.log("## CAPTURE :: SENDING THE EMAIL...");
          var mailer = new Mailer();
          user.set(lastMessageKey, new Date()).save();
          mailer.to(email)
            .subject(slot.tracker.label + " over Limit!")
            .body(emailRendered)
            .send(function(err, response) {
              console.log("## CAPTURE :: EMAIL SENT");
              console.log(err, response);
            });
        }

      }
      ///////////////////////////////////////////////////////////
      // end if over limit and we're to email them.

      onComplete(null, results);

    } catch (e) {

      /////////////////////////////////////////////////
      /// Error has Occurred 
      /// 

      onComplete({
        success: false,
        error: e,
        message: e.message
      }, null);
    } // end try catch

  }); // end look up user
};

module.exports = processNomieData;