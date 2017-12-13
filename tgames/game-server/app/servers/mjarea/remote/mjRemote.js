var bearcat = require('bearcat');

var MjRemote = function(app) {
    this.app = app;
    this.commonService = null;
    this.userService = null;
    this.consts = null;
}

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
MjRemote.prototype.playerLeave = function(userInfo) {
    var palyer =  this.userService.getUser(userInfo.userId);
    var roomNum = palyer.roomNumber;
    palyer.onlineStatus = this.consts.onlineStatus.offerline;

    var channel = this.commonService.getChannel(roomNum);
    if( !! channel) {
        channel.leave(userInfo.userId, userInfo.sid);
        var param = {
            route: 'onLeave',
            code: this.consts.MESSAGE.RES,
            user: palyer
        };
        channel.pushMessage(param);
    }
};

/**
 * 用户登录校验
 *
 * @param msg
 * @param session
 * @param next
 */
MjRemote.prototype.login = function (msg) {
    //1. 校验sign
    //2. token有效性校验
    //3. 加载用户信息
    var userId = msg.userId;


    var pic = "/pic.jpg";
    var userName = "张1";
    var user =  bearcat.getBean('player',{userId:userId,pic:pic,userName:userName,onlineStatus:this.consts.onlineType.online});
    this.userService.addUser(user);


    //4.如果存在房间号则恢复房间数据

    //4.1游戏为开始恢复准备数据

    //4.2 游戏一开始恢复游戏数据
}

module.exports = function(app) {
    return bearcat.getBean({
        id: "mjRemote",
        func: MjRemote,
        args: [{
            name: "app",
            value: app
        }],
        props: [{
            name: "commonService",
            ref: "commonService"
        },
            {
                name: "userService",
                ref: "userService"
            },
            {
            name: "consts",
            ref: "consts"
        }]
    });
};