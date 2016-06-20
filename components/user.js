/**
 * Nomie User Storage
 * A generic User Object for storing data from anonymous Nomie users.
 * You could use something like localForage if you don't want to use Redis.
 * BUT if you're going to run this experiment at any scale, consider using a proper data
 * storage engine.
 */


/**
 * Setup Redis Storage.
 */
var redis = require('node-redis');
var config = require(__dirname+'/../config');
var redisConfig = config['dev'].redis;
if(process.env['NODE_ENV']=='production') {
  redisConfig = config['production'].redis;
}
var storage = redis.createClient(redisConfig.port, redisConfig.host); // create storage

/**
 * User
 *
 * Create a generic user object that uses Redis storage
 *
 * @param  {string} anonid Anonid from req.body.anonid
 * @param  {function} onInit Callback in the err,data format
 * @return {object}        User pub
 */
var User = function(anonid, onInit) {
  onInit = onInit || function() {}; // set a default
  var pvt = { anonid : anonid }; // Private Stuffs
  var pub = {}; // Public Stuffs
  var data = {}; // User Data Stuffs
  var key = redisConfig.prefix+pvt.anonid; // Set key for storage.

  /**
   * Initialize a User : Private
   * @return {object} Pub
   */
  pvt.init = function() {
    storage.get(key, function(err, record) {
      if(!err && record != null) {
        data = JSON.parse(record);
        console.log("We got someting!!!", data);
        onInit(null, pub);
      } else {
        // We didn't find a user
        console.log("Nothing found with key", key);
        onInit(err, pub);
      }
    });
  }
  // Set a user data field
  pub.set = function(key, value) {
    console.log("Setting "+key+" to "+value);
    data[key] = value;
    return pub;
  }
  // Get a user data field
  pub.get = function(key) {
    return data[key] || null;
  }
  // Save to Storage
  pub.save = function(callback) {
    callback = callback || function() {};
    console.log("USER :: Save");
    data._updated = new Date();
    storage.set(redisConfig.prefix+pvt.anonid, JSON.stringify(data), function(err, res) {
      console.log("USER :: Save", err, res);
      callback(err, res);
    });
    return pub;
  }
  // auto initialize
  pvt.init();
  return pub;
}; // end user;

module.exports = User;
