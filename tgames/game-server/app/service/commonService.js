var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'CommonService');
var bearcat = require('bearcat');
var pomelo = require('pomelo');

var CommonService = function () {
    this.consts = null;
    this.channels = {};
}

/**
 * 获取房间channel
 * @param roomNum
 * @returns {Channel}
 */
CommonService.prototype.getChannel = function(roomNum) {
    if(!this.channels[roomNum])
    {
       var channel = pomelo.app.get('channelService').getChannel(roomNum, true);
       this.channels[roomNum] = channel;
       return channel;
    }

    return this.channels[roomNum];
};

CommonService.prototype.kickUser = function (sid,userId,fn) {
    var bss = pomelo.app.get('backendSessionService');
    bss.kickByUid(sid,userId,fn);
}


/**
 * 推送消息给指定的用户集
 */
CommonService.prototype.sendMessageToPlayers = function(roomNum, users,action,message)
{
    if(!roomNum || !users || !message)
    {
        logger.info("route="+action+",message="+message);
        logger.error("roomNum or users or message is empty,and not send message to client.");
        return;
    }

    var channel = this.getChannel(roomNum);

    if(!channel)
    {
        logger.error("the [roomChannel="+roomNum +"] is not exist.");
        return ;
    }

    var toUsers = [];

    for( var i =0;i<users.length;i++)
    {
        var userId = users[i];
        var member = channel.getMember(userId);
        var sid = member['sid'];
        toUsers.push({
            uid:userId,
            sid:sid
        });
    }


    var channelService = pomelo.app.get('channelService');

    channelService.pushMessageByUids(action,message,toUsers,function(err) {
        if (err) {
            console.log(err);
        } else {
            console.log('push ok');
        }
    });
}

/**
 * 推送消息给指定的用户
 * @param roomNum
 * @param users
 * @param action
 * @param message
 */
CommonService.prototype.sendMessageToPlayer = function (roomNum, user,action,message) {
     var users = [user];
     this.sendMessageToPlayers(roomNum, users,action,message)
}

/**
 * 发送信息给房间的每个人
 */
CommonService.prototype.sendMessageToAllRoomPlayer =function(roomNum,action,message)
{
    var channel =  this.getChannel(roomNum);
    logger.info("route="+action+",message="+message);
    if(channel)
    {
        channel.pushMessage(action,message ,function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log('push ok');
            }
        });
    }
    else
    {
        logger.error("the [roomChannel="+roomNum +"] is not exist.");
    }
}

/**
 * 加入房间通道
 * @param opts
 */
CommonService.prototype.joinChannel = function(opts)
{
    var uid = opts.userId;
    var sid = opts.sid;
    var roomNum = opts.roomNum;

    var channel = this.getChannel(roomNum);
    if( !! channel) {
        channel.add(uid, sid);
    }
}


module.exports = {
    id: "commonService",
    func: CommonService,
    props: [
        {
            name: "consts",
            ref: "consts"
        }]
}