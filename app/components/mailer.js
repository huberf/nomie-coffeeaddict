var nodemailer = require('nodemailer');
var config = require(__dirname + '/../config/all');

// Mailer
// 
// Send a message to an email 
// 
// Example: 
// 
// var mail = new Mailer();
// mail.to('test@gmail.com')
// .subject("This is a subject")
// .body("Do you like me?<br />Brandon")
// .send(function(err, results) { });
// 

var transporter = nodemailer.createTransport(config.server.smtp);
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
      from: config.server.smtp.from, // sender address
      to: pvt._to.join(','), // list of receivers
      subject: pvt._subject, // Subject line
      html: pvt._body
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
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