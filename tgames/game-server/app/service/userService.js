var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'UserService');

/**
 * 用户服务
 * @constructor
 */
var UserService = function () {
    this.users = {};
    this.roomService = null;
}

UserService.prototype.addUser = function (user)
{
    if(user && user.userId)
    {
        this.users[user.userId]=user;
    }
}

UserService.prototype.getUser = function (userId) {
    return this.users[userId];
}

UserService.prototype.killAllInRoom = function (roomId) {
    if(roomId == null)
    {
        return;
    }

    var roomInfo =  this.roomService.getRoom(roomId);
    if(roomInfo == null)
    {
        return null;
    }

    var channel = this.commonService.getChannel(roomId);
    for(var i = 0; i < roomInfo.seats.length; ++i){
        var rs = roomInfo.seats[i];
        //如果不需要发给发送方，则跳过
        if(rs.userId > 0){

            var user = this.users[rs.userId];
            if(user != null){
                delete this.users[rs.userId];
                var sid = channel.getMember(rs.userId);
                var fn = function () {
                    logger.info("remove session is ok !");
                }
                this.commonService.kickUser(sid,rs.userId,fn);
            }
        }
    }
    channel.destroy();
}


module.exports = {
    id: "userService",
    func: UserService,
    props: [
        {
            name: "roomService",
            ref: "roomService"
        }
    ]
}