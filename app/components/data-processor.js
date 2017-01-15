var User = require(__dirname + '/user');
var moment = require('moment');
var fs = require('fs');
var ejs = require('ejs');
var config = require(__dirname + '/../config/all');

// Email config
var api_key = process.env.MAILGUN_KEY;
var Mailgun = require('mailgun').Mailgun;
var mailBot = new Mailgun(api_key);

/*

Process Nomie Data!

This function is what will capture the data from Nomie,
analyize it some how or another, and turn a JSON response
to the route - the route will then mash it with the results.ejs
and send it back to Nomie.

In the case of this Big Spender App, I am compiling a map of this week and last week,
looping over the results and adding up the value for each week and each day. I then
put all of this together in a big nasty object and return it for results.ejs to consume.

 */

var processNomieData = function(postData, onComplete) {
  var results = generateResults(postData);
  onComplete(null, results);
};

/**
 * Generate the total Results for this Request
 * @param  {object} postData The post data from Nomie
 * @return {object}          Results
 */
var generateResults = function(postData) {
  var daySlotFormat = 'YYYY-MM-DD';

//  postData.experiment.info.email = postData.experiment.info.email || {};
  var email;
  if( postData.experiment.info.hasOwnProperty('email')) {
    email = postData.experiment.info.email.value || null;
  }
  // Single Slot Instance
  // Since this cloud app only uses a single slot, I can call it from here.
  var slotName = Object.keys(postData.experiment.slots)[0];
  var slot = postData.experiment.slots[slotName]; // Get the Tracker Slot

  // Get the Data from this tracker
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



  // Loop over the individual records
  // Here we will basically tally up the totals based on the week
  var lastWeekDaily = {};
  var thisWeekDaily = {};

  // UTC Offset
  // You will see the use of offset, this is a value that is passed from the user
  // you should adjust your times accordingly if you will be displaying anything back to them.
  // otherwise, you will show them dates for which your server time is configured.

  // Create Last Week Loop Counter
  var lwloop = moment().utcOffset(offset).startOf('week').subtract(1, 'week');
  // Create This Week Loop Counter
  var twloop = moment().utcOffset(offset).startOf('week');
  // Get Time of Day
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

  console.log(rows);
  var allWeeks = {};
  for (var i in rows) {
    console.log(value);
    var value = rows[i].value || 0;
    var rTime = moment(new Date(rows[i].time)).utcOffset(offset);
    var day = rTime.format(daySlotFormat);
    var dayShortName = rTime.format('ddd');
    var week = rTime.startOf('week').format('W-YYYY');

    allWeeks[week]+=1

    if (thisWeekDaily.hasOwnProperty(day)) {
      thisWeekDaily[day].value = thisWeekDaily[day].value + 1;
    }
    if (lastWeekDaily.hasOwnProperty(day)) {
      lastWeekDaily[day].value = lastWeekDaily[day].value + 1;
    }

    if (week === thisWeek) {
      thisWeekSpend = thisWeekSpend + 1;
    }
    if (week === lastWeek) {
      lastWeekSpend = lastWeekSpend + 1;
    }
    if (day === today) {
      todaySpend = todaySpend + 1;
    }
    if (day === yesterday) {
      yesterdaySpend = yesterdaySpend + 1;
    }
  }
  var average = 0;
  var loops = 0;
  for (var prop in allWeeks) {
    if (allWeeks.hasOwnProperty(prop)) {
      console.log(allWeeks[prop]);
      average+=allWeeks[prop];
      loops++;
    }
  }
  average = average / loops;


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
  postData.experiment.info.goal = postData.experiment.info.goal || {};
  postData.experiment.info.goal.value = postData.experiment.info.goal.value || null;
  var goal = postData.experiment.info.goal.value || 0; // Incase they're stupid
  if (isNaN(goal)) {
    goal = 0;
  };

  console.log("## Made it to line 156");

  // Check to see if we're over the users limit
  var overlimit = false;

  var lastWeekOverlimit = false;

  if (goal > 0 && thisWeekSpend > goal) {
    console.log("## CAPTURE :: OVER THE LIMIT!");
    overlimit = true;
    if( email ) {
    mailBot.sendRaw(process.env.MAILGUN_EMAIL,
            [email],
              'From: Nomie Coffee Alert <' + process.env.MAILGUN_EMAIL + '>' +
              '\nTo: ' + email +
              '\nContent-Type: text/html; charset=utf-8' +
              '\nSubject: ' + 'You\'ve had too much coffee!' +
              '\n\n' + 'You have gone over your limit. Try to keep your coffee usage down.',
              function(err) { err && console.log(err) });
    }
  }

  if (goal > 0 && lastWeekSpend > goal) {
    console.log("## CAPTURE :: OVER THE LIMIT!");
    lastWeekOverlimit = true;
  }

  // Determine the percent towards the goal
  var percentTowardGoal = null;
  if (goal) {
    console.log(thisWeekSpend);
    percentTowardGoal = ((thisWeekSpend / goal) * 100).toFixed(0);
  }

  var peakDay = null;
  for(var i = 0; i < thisWeekDaily.length; i++ ) {
    if(thisWeekDaily[peakDay] < thisWeekDaily[i]) {
      console.log('Found new peak day');
      console.log(i);
      peakDay = i;
    }
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
    thisWeekSpend: thisWeekSpend,
    peakDay: peakDay,
    average: average
  };

  return results;
};


module.exports = processNomieData;
