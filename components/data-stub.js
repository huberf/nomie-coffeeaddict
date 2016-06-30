var moment = require('moment');

module.exports = function() {

	var pub = {};
	var pvt = {};

	pub.generate = function(options) {
		options = options || {};
		options.type = options.type || "tick";
		options.uom = options.uom || null;
		options.min = options.min || null;
		options.max = options.max || null;
		options.startDate = options.startDate || moment(new Date()).subtract(1,'month');
		options.minPerDay = options.minPerDay || 0;
		options.maxPerDay = options.maxPerDay || 10;
		options.value = options.value || null;

		if(type!="tick" && !options.value) {
			options.value = Math.floor(Math.random() * options.max) + options.min;  
		}

		var results = [];
		

	}


	return pub;

}