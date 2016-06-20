var c = {
  "dev" : {
    "redis" : {
      "host" : "192.168.99.100",
      "port" : "32775",
      "prefix" : "bigspender-",
      "auth" : null
    }
  },
  "production" : {
    "redis" : {
      "host" : "dokku-redis-bigspender",
      "port" : "6379",
      "prefix" : "bigspender-",
      "auth" : null
    }
  },
  "smtp" : {
    "host": "email-smtp.us-east-1.amazonaws.com",
    "port": 465,
    "secure": true,
    "auth": {
        "user": "AKIAJNWMOGQKQECO64TQ",
        "pass": process.env.SMTP_PASS
    }
  },
  "server" : {
    "port" : 5000,
    "maxUpload" : "50mb"
  }
};

try {
    var localConfig = require(__dirname+'/config.local.js');
    c = Object.assign(c, localConfig);
} catch (ex) {
  console.log("ERROR MERGING CONFIG", ex);
}

module.exports = c;
