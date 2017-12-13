var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'Player');
var bearcat = require('bearcat');

/**
 * palyer infos
 * @param opts
 * @constructor
 */
function Player(opts) {
    this.userId = opts.userId;   //
    this.pic = opts.pic;           //用户头像
    this.userName = opts.userName;  //用户名
    this.onlineStatus=opts.onlineStatus; //在线状态
    this.seatIndex=-1;
    this.roomNumber=-1;
}

Player.prototype.toJSON = function() {
    return {
        userId: this.userId,
        pic: this.pic,
        userName: this.userName,
        onlineStatus: this.onlineStatus,
        seatIndex:this.seatIndex,
        roomNumber:this.roomNumber
    }
}


module.exports = {
    id: "player",
    func: Player,
    scope: "prototype",
    args: [{
        name: "opts",
        type: "Object"
    }]
}