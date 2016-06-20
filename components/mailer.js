var nodemailer = require('nodemailer');
var config = require(__dirname+'/../config');
var smtpConfig = config.smtp;


var transporter = nodemailer.createTransport(smtpConfig);
var mailer = {};

var Mailer = function() {
  var pub = {};
  var pvt = {};
  pvt._to = [];
  pvt._subject = "No subject provided";
  pvt._body = "No body provided";

  pub.to = function(email) {
    pvt._to.push(email);
    return pub;
  }
  pub.subject = function(subject) {
    pvt._subject = subject;
    return pub;
  }
  pub.body = function(body) {
    pvt._body = body;
    return pub;
  }

  pub.send = function(callback) {
    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"Nomie" <hello@nomie.io>', // sender address
        to: pvt._to.join(','), // list of receivers
        subject: pvt._subject, // Subject line
        html:  pvt._body
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            callback(error, null)
        } else {
          callback(null, info);
        }
    });
    return pub;
  }
  return pub;
}

module.exports = Mailer;
