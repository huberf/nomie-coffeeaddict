// You do not need to do anything to  this file it just brings both configurations files together.
module.exports = {
	server : require(__dirname+'/server'),
	app : require(__dirname+'/cloudapp')
};