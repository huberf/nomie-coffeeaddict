//
// Setup this Cloud Apps Base Server Configuration
// If you want to send emails, (accounts: true) You'll need to have REDIS installed somewhere for this Cloud App to work.
// Otherwise set accounts: false, and no emails will be sent.

var ServerConfig = {
  "notifications" : false, // if sent to true, you must have smtp and redis configured properly.
  "dev" : {
    "url" : "http://www.coffeeaddict.tech:5000",
    "storage" : "localhost",
    "redis" : {
      "host" : "192.168.99.100",
      "port" : "6379",
      "prefix" : "bigspender-",
      "auth" : null
    }
  },
  "production" : {
    "url" : "http://www.coffeeaddict.tech:5000",
    "storage" : "redis",
    "redis" : {
      "host" : "dokku-redis-bigspender",
      "port" : "6379",
      "prefix" : "bigspender-",
      "auth" : null
    }
  },
  "smtp" : {
    "from" : '"Nomie" <nomie@host.com>',
    "host": null,
    "port": 465,
    "secure": true,
    "auth": {
        "user": null,
        "pass": null
    }
  },
  "server" : {
    "port" : 5000,
    "maxUpload" : "50mb"
  }
};


// We will load a Local Server Config if it's present.
// This allows us to store private keys without pushing them
// to the code repository.
// No need to edit beyond this point.
//

ServerConfig.getActive = function() {
  if(process.env['NODE_ENV']=='production') {
    return ServerConfig.production;
  } else {
    return ServerConfig.dev;
  }
};

try {
    var ServerLocalConfig = require(__dirname+'/server.local.js');
    ServerConfig = Object.assign(ServerConfig, ServerLocalConfig);
} catch (ex) {
  console.log("ERROR MERGING CONFIG", ex);
}

module.exports = ServerConfig;
