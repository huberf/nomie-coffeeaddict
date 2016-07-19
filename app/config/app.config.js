var cloudConfig = {};
var serverConfig = require(__dirname+'/server.config.js');

//
// Pick your Cloud App ID 
// 
// This needs to be completely unique to your application. 
// Please make sure that it's unique, otherwise it might not 
// able to be installed.

var CLOUDAPP_ID = "io.nomie.experiments.bigspender";

//
// Limit One Per User?
//
// Can a Nomie User install this Cloud App multiple times?
// Or should they only be allowed to install one?

var limit_one_per_user = false;

//
// Name your Cloud App
// 
// Give your cloud app a proper name! Keep it shorter than 20 characters.

cloudConfig.name = "Big Spender";

//
// Who's the Owner of this Cloud App?
// 
// It can be a company or a persons name. 

cloudConfig.hostedBy = "Brandon Corbin";

//
// Cloud App Image
//
// Include a full URL to your cloud app image.
// Otherwise, it will default to the album are in /public/album.jpg

// cloudConfig.img = "https://snap.icorbin.com/bigspender-cover-2.jpg";


//
// Your Cloud App Summary 
// 
// Create a shortish description that highlights the purpose of this 
// cloud app.  

cloudConfig.summary = "Monitor your spending! BigSpender helps keep track of how much money you spend on... whatever. Set a weekly budget and be notified when you're getting close.";

// 
// Set a color for your Cloud App
// 
// This color will be used in Nomie to help your App standout
// Make sure the color isn't too light. 

cloudConfig.color = "#CD704C";

// 
// Determine what data this cloud app requires
// 
// Options are: nickname, geo
// nickname: returns the the users nickname
// geo: will include geo location data for tracker events. Otherwise no geo. 

cloudConfig.requires = ['nickname','geo'];

//
// Collection Methods
// 
// Collections can happen automatically (one a schedule) or manually (the user manually runs)
// Automatic collections can also specify how frequently they want to collect
// 
cloudConfig.collection_method = "automatic";

// 
// Collection Frequency 
// 
// Options are 1mm (minutes), 1h (hour), 1d (day), 1m (month)
// For example: 60mm will check every 60 minutes or the next time the user launches Nomie.

cloudConfig.collection_frequency = "30mm"; // capture every 6 hours - if automated

//
// Collection Amount 
// 
// How much data should you collect
// Options: latest, 

cloudConfig.collection_amount = "1m"; // Select a month of data 


// 
// Setup what Trackers this cloud app needs.
// 
// Each slot equals one tracker. In this case I'm only needing 1 tracker 
// that I label "Food out Cost". 

cloudConfig.slots = {
    "spend" : {
      "label" : "Food Out Cost",
      "summary" : "Tracker used to track spending",
      "tracker" : null, // leave empty 
      "required" : true // is this required to run the cloud app?
    }
};

cloudConfig.fields = {}
cloudConfig.fields.goal = {
  "type" : "text", //text, password, boolean, select
  "label" : "Your Weekly Budget",
  "value" : 75.00,
  "placeholder" : "100.00",
  "description" : null,
  "required" :  true
};

// 
// EXAMPLE OF SELECT - this feature is not yet implemented
// 
// cloudConfig.fields.timeframe = {
//   "type" : "select",
//   "value" : "weekly",
//   "options" : [
//     { label: "Daily", value: "daily"},
//     { label: "Weekly", value: "weekly"},
//     { label: "Monthly", value: "monthly"}
//   ],
//   label : "Budget Timeframe"
// };


//
// Optional Learn More URL
//
// Include a moreUrl and Nomie will set this as the default learn more website. 
// otherwise, this Cloud App template will automatically include the /about.ejs page

// cloudConfig.moreUrl = "https://ourwebsite.com/something/something"


//////////////////////////////
// DO NOT EDIT FROM HERE ON BELOW - UNLESS YOU KNOW WHAT YOU'RE DOING.


cloudConfig.get = function(host) {
  host = host || 'http://localhost:5000';
  // Base Configuration
  var appConfig = {
    "id" : CLOUDAPP_ID+((!limit_one_per_user) ? Math.random() : ''), 
    "name" : cloudConfig.name,
    "img" : cloudConfig.img || host+"/album.jpg",
    "summary" : cloudConfig.summary,
    "uses" : cloudConfig.requires, // available: 'nickname','geo'
    "color" : cloudConfig.color, // Pick a color that works on both black and white backgrounds
    "hostedBy" : cloudConfig.hostedBy,
    "join" : host+"/join",
    "more" : cloudConfig.moreUrl || host,
    "collection" : {
        "method" : cloudConfig.collection_method,
        "frequency" : cloudConfig.collection_frequency, // every 30 minutes
        "url" : host+"/capture",
        "amount" : cloudConfig.collection_amount // select one month back
    },
    "leave" : host+"/capture",
    "info" : cloudConfig.fields,
    "slots" : cloudConfig.slots
  };
  return appConfig;
}


module.exports = cloudConfig;


