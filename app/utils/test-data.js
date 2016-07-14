var moment = require('moment');
var _ = require('underscore');
var config = require(__dirname+'/../config/all');

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

		if(options.type!="tick" && !options.value) {
			options.value = Math.floor(Math.random() * options.max) + options.min;  
		}

		var data = pvt.fake();
		data.experiment = _.extend(data.experiment,config.app.get());
		for(var slot in data.experiment.slots) {
			data.experiment.slots[slot].data = pvt.generateFakeTaps();
			data.experiment.slots[slot].tracker = pvt.generateFakeTracker();
		}

		// loop

		return data;
	}

	pvt.generateFakeTracker = function() {
		var tracker = {
			"label": "Food Out",
			"icon": "flaticon-happy38",
			"config": {
				"type": "numeric",
				"dynamicCharge": false,
				"min": "0",
				"max": "10",
				"math": "sum",
				"uom": "dollars"
			},
			"charge": 2,
			"color": "#29bb9a",
			"lid": null,
			"groups": null,
			"stats": {
				"created": 1468510424522,
				"first": null,
				"last": null,
				"dayAvg": 0,
				"monthAvg": 0
			},
			"_id": "1468203170198-009ray"
		};
		return tracker;
	}

	pvt.generateFakeTaps = function() {
		var events = [];
		var options = options || {};
		options.daysBack = options.daysBack || 60;
		options.maxPerDay = options.maxPerDay || 10;
		options.minPerDay = options.minPerDay || 1;   

		
		for(var i=0;i<options.daysBack; i++) {
			var start = moment().subtract(i, 'days');
			var event = {
				"geo": [39.562, -86.0563],
				"time": start.toDate(),
				"offset": -240,
				"value": 10,
				"charge": 2
			};
			events.push(event);
		} // end looping over days;

		console.log("## EVENTS ##", events);

		return events;

	};

	pvt.fake = function() {



		var stub = {
			"experiment": {
				"secure": false,
				"name": "",
				"img": "",
				"id": "",
				"summary": "",
				"uses": [],
				"color": "#E59B81",
				"hostedBy": "",
				"join": "",
				"more": "",
				"collection": {
				},
				"info": {
				},
				"slots": {
					"spend": {
						"tracker": {
							"label": "Food Out",
							"icon": "flaticon-happy38",
							"config": {
								"type": "numeric",
								"dynamicCharge": false,
								"min": "0",
								"max": "10",
								"math": "sum",
								"uom": "dollars"
							},
							"charge": 2,
							"color": "#29bb9a",
							"lid": null,
							"groups": null,
							"stats": {
								"created": 1468510424522,
								"first": null,
								"last": null,
								"dayAvg": 0,
								"monthAvg": 0
							},
							"_id": "1468203170198-009ray"
						},
						"required": true,
						"data": []
					}
				},
				"lastResults": {
					"on": "2016-07-14T15:37:08.192Z"
				},
				"running": true
			},
			"nickname": "EasyPie9",
			"anonid": "3cd39bcc-3694-0ade-a2b0-54f8f76239e6",
			"created": "2016-07-14T15:38:26.792Z",
			"timezoneOffset": -240
		}
		return stub;
	}


	return pub;

}