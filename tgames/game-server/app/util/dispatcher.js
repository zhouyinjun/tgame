var crc = require('crc');

var Dispatcher = function() {

}

Dispatcher.prototype.dispatch = function(uid, connectors) {
    var index = parseInt(uid) % connectors.length;
	return connectors[index];
};

module.exports = {
	id: "dispatcher",
	func: Dispatcher
}