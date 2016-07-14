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
var config = require(__dirname+'/../config/all');
var redisConfig = config.server.dev.redis;
if(process.env['NODE_ENV']=='production') {
  redisConfig = config.server.production.redis;
}
var storage = redis.createClient(redisConfig.port, redisConfig.host); // create storage

/**
 * User
 *
 * Create a generic user object that uses Redis storage
 *
 * var user = new User('234-321-2234', function(err, userData) {
 *   if(!err) {
 *     console.log(userData);
 *   }
 * });
 *
 * @param  {string} anonid Anonid from req.body.anonid
 * @param  {function} onLoaded Callback in the err,data format
 * @return {object}        User pub
 */
var User = function(anonid, onLoaded) {
  onLoaded = onLoaded || function() {}; // set a default
  var pvt = { anonid : anonid }; // Private Stuffs
  var pub = {}; // Public Stuffs
  var data = {}; // User Data Stuffs


  pub.anonid = redisConfig.prefix+pvt.anonid;
  
  /**
   * Internal Init will get the user from redis if it exists.
   * @return {[type]} [description]
   */
  pvt.init = function() {
    
    storage.get(pub.anonid, function(err, record) {
      if(!err && record != null) {
        data = JSON.parse(record);
        onLoaded(null, pub);
      } else {
        // We didn't find a user
        console.log("Nothing found with key", pub.anonid);
        onLoaded(err, pub);
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
    data._updated = new Date();
    data._created = data._created || new Date();
    // Save to Redis
    storage.set(pub.anonid, JSON.stringify(data), function(err, res) {
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
