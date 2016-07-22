# Coffee Addict - A Nomie Cloud App

## NOTE: This is a work in progress

<img src="http://snap.icorbin.com/Screen-Shot-2016-07-14-22-49-35.png">

This repo is for Coffee Addict, a Nomie Cloud App that is currently underdevelopment. 
This is based upon the Big Spender cloud app by Brandon Corbin

This Cloud App Requires:

- Node JS
- Redis (optional if wanting email notification)

### Installing

```
git clone https://github.com/happydata/nomie-coffeeaddict.git
cd nomie-coffeeaddict
npm install
```

### Running

```
npm start
```
By default the app will be running at http://localhost:5000/

### Configuring 
Before you can run Coffee Addict, you'll need to ensure you have Redis running. 

#### /app/config/server.config.js


#### /app/config/app.config.js

## Gotchas and other considerations

1. Once a User has installed your cloud app, its configuration is forever set until the user deletes the app.

Meaning that you cannot update your base configuration (collection method, frequency, tracker slot details). 

2. Responses returned as a Modal within Nomie (using the html response opposed to the URL response) has limited HTML support.
Specifically, all HTML is ran through a Markdown processor, so all inline styles, javascript and other funky stuff is removed. 
