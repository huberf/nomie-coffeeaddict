/**
 * Nomie User Storage
 * A generic User Object for storing data from anonymous Nomie users.
 * You could use something like localForage if you don't want to use Redis.
 * BUT if you're going to run this experiment at any scale, consider using a proper data
 * storage engine.
 */


/**
 * Setup Redis redisStore.

 */
var config = require(__dirname+'/../config/all');
var redis, redisStore,LocalStorage,localStorage;
var storagePrefix = ''; 

//
// Determine which storage method
// 

if(config.server.storage === "redis") {
  // It's redis!
  var redis = require('node-redis');
  var redisConfig = config.server.dev.redis;
  if(process.env['NODE_ENV']=='production') {
    redisConfig = config.server.production.redis;
  }
  redisStore = redis.createClient(redisConfig.port, redisConfig.host); // create storage
  storagePrefix = redisConfig.prefix;
} else {
  // It's local storage
  LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage(__dirname+'/../../data');
}
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


  pub.anonid = storagePrefix+pvt.anonid;
  
  /**
   * Internal Init will get the user from redis if it exists.
   * @return {[type]} [description]
   */
  pvt.init = function() {
    
    if(config.server.storage==="redis") {
      redisStore.get(pub.anonid, function(err, record) {
        if(!err && record != null) {
          data = JSON.parse(record);
          onLoaded(null, pub);
        } else {
          // We didn't find a user
          console.log("Nothing found with key", pub.anonid);
          onLoaded(err, pub);
        }
      });
    } else {
      var userData = localStorage.getItem(pub.anonid);
      if(userData) {
        data = JSON.parse(userData);
        onLoaded(null, pub);
      } else {
        console.log("Nothing found with key", pub.anonid);
        onLoaded({ message: 'No user data found'}, pub);
      }
    }
    
  }

  /**
   * Set a user variable
   * @param {string} key   Key/ID of the field
   * @param {Object} value Any type of value
   */
  pub.set = function(key, value) {
    console.log("Setting "+key+" to "+value);
    data[key] = value;
    return pub;
  }
  /**
   * Get a User Variable
   * @param  {string} key Key/ID of the field
   * @return {Object}     Any type of value
   */
  pub.get = function(key) {
    return data[key] || null;
  }
  
  /**
   * Save a User
   * @param  {Function} callback err,data pattern
   * @return {Object}            Pub
   */
  pub.save = function(callback) {
    callback = callback || function() {};
    data._updated = new Date();
    data._created = data._created || new Date();
    // Save to Redis
    if(config.server.storage==="redis") {
      redisStore.set(pub.anonid, JSON.stringify(data), function(err, res) {
        console.log("USER :: Save", err, res);
        callback(err, res);
      });
    } else {
      localStorage.setItem(pub.anonid, JSON.stringify(data));
      callback(null, data);
    }
    return pub;
  }
  // auto initialize
  pvt.init();
  return pub;
}; // end user;

module.exports = User;
