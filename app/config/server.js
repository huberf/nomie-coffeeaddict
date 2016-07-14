// 
// Setup this Cloud Apps Base Server Configuration
// You'll need to have REDIS installed somewhere for this Cloud App to work with User Data. 
// http://redis.io/

var ServerConfig = {
  "dev" : {
    "url" : "http://localhost:5000",
    "redis" : {
      "host" : "192.168.99.100",
      "port" : "32775",
      "prefix" : "bigspender-",
      "auth" : null
    }
  },
  "production" : {
    "url" : "https://bigspender.nomie.org",
    "redis" : {
      "host" : "dokku-redis-bigspender",
      "port" : "6379",
      "prefix" : "bigspender-",
      "auth" : null
    }
  },
  "smtp" : {
    "from" : '"Nomie" <hello@nomie.io>',
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