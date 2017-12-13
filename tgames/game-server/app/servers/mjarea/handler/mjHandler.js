var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'MjHandler');
var bearcat = require('bearcat');
var Code = require('../../../../../shared/code');

var MjHandler = function(app) {
    this.app = app;
    this.mjService = null;
    this.commonService = null;
    this.consts = null;
    this.commonUtils=null;
    this.userService = null;
    this.roomService = null;
};


/**
 * 房主创建房间
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.createRoom = function (msg, session, next)
{
    var roomNum = msg.roomNumber;
    if(!roomNum)
    {
        var r = {
            code: this.consts.MESSAGE.ERR,
            errMsg:this.consts.RES_CODE.ERR_ROOM_NOT_EXIST
        };
        next(null, r);
        return;
    }
    // todo 校验入参

    var userId = session.get("userId");
    console.log("userID="+userId);

   // session.set("palyType", Code.PLAY_TYPE.HZMJ);
   // session.pushAll();

    var player = this.userService.getUser(userId);
    player.roomNumber = roomNum;
    player.seatIndex = 0;

    var seats = new Array(4);
    for(var i=0;i<4;i++)
    {
        var ready = false;
        var _userId = -1;
        var userName = "";
        if(i==0)
        {
            ready =true;
            _userId = userId;
            userName = player.userName;
        }
      var seat =  bearcat.getBean('seat',{
           userId: _userId,
          name:userName,
          ready:ready,
          seatIndex:i}
      );
        seats[i] = seat;
    }
   var roomConf = bearcat.getBean('roomconf',msg.roomConf);
   var roomInfo = bearcat.getBean('room',{
       roomNumber:roomNum,
       seats:seats,
       roomConf:roomConf,
       status:this.consts.ROOM_STATUS.UN_START,
       createTime:Date.now(),
       creator:userId,
       memberNum:1});
    this.roomService.addRoom(roomInfo);

    //将玩家加入房间channel
    var sid = session.frontendId;
    this.commonService.joinChannel({
        userId:userId,
        sid : sid,
        roomNum:roomNum
    });

   var _seatInfo = getSeatInfo(seats,this.userService,this.consts);
    //返回
    var r = {
        code: this.consts.MESSAGE.RES,
        seats:_seatInfo,
        mySeatIndex:0,
        roomNum:roomNum
    };

    next(null, r);
}

function getSeatInfo(seats,userService,consts) {
    var seatInfos = new Array(4);
    for(var i=0;i<seats.length;i++)
    {
        var seat = seats[i];
        var seatInfo = {};
        seatInfo.ready = seat.ready;
        seatInfo.hued = false;
        seatInfo.holds = [];
        seatInfo.folds = [];
        seatInfo.pengs = [];
        seatInfo.angangs = [];
        seatInfo.diangangs = [];
        seatInfo.wangangs = [];
        seatInfo.seatindex=seat.seatIndex;
        if(seat.userId!=-1)
        {
            var user = userService.getUser(seat.userId);
            if(user.onlineStatus==consts.onlineType.online)
            {
                seatInfo.online=true;
            }
            else
            {
                seatInfo.online=false;
            }
        }
        else
        {
            seatInfo.online=false;
        }
        seatInfo.name=seat.name;
        seatInfo.score=seat.score;
        seatInfo.userid=seat.userId;
        seatInfos[i] = seatInfo;
    }
    return seatInfos;
}

/**
 * join room wait game start
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.joinRoom = function(msg, session, next) {
    // 1.校验房号
    var roomNum = msg.roomNumber;
    var userId = session.get("userId");
    var room = this.roomService.getRoom(roomNum);
    if(!roomNum || !room)
    {
        var r = {
            code: this.consts.MESSAGE.ERR,
            errMsg:this.consts.RES_CODE.ERR_ROOM_NOT_EXIST
        };
        next(null, r);
        return;
    }

    if(room.status != this.consts.ROOM_STATUS.UN_START)
    {
        var r = {
            code: this.consts.MESSAGE.ERR,
            errMsg:this.consts.RES_CODE.ERR_GAME_IS_STARTED
        };
        next(null, r);
        return;
    }

    //2.绑定用户房间信息
    var player = this.userService.getUser(userId);
    var room = this.roomService.getRoom(roomNum);
    room.memberNum += 1;
    var seatIndex = room.memberNum - 1 ;
    var seat = room.seats[seatIndex];
    seat.userId = userId;
    seat.name = player.userName;
    seat.ready = true;
    seat.seatIndex = seatIndex;
    player.roomNumber = roomNum;
    player.seatIndex = seatIndex;

    //3.将玩家加入房间channel
    var sid = session.frontendId;
    this.commonService.joinChannel({
        userId:userId,
        sid : sid,
        roomNum:roomNum
    });

    //4.通知房间玩家有新玩家进入房间
    var toSendUsers = [];
    var seats = room.seats;
    for(var i=0;i<seats.length;i++)
    {
        var _seat = seats[i];
        if(_seat.ready )
        {
            if(_seat.userId != userId)
            {
                toSendUsers.push(_seat.userId);
            }
        }
    }

    var seatInfos = getSeatInfo(seats,this.userService,this.consts);
    this.commonService.sendMessageToPlayers(roomNum,toSendUsers,"new_user_coming_push",seatInfos[seatIndex]);

    var beginGame = false;
    //6.房间坐满开始游戏
    if(room.memberNum == 4)
    {
        beginGame = true;
    }

    var r = {
        code: this.consts.MESSAGE.RES,
        mySeatIndex:seatIndex,
        seats:seatInfos,
        beginGame:beginGame
    };
    next(null, r);
}

/**
 *
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.beginGame = function (msg, session, next) {
    var roomNum = msg.roomNumber;
    this.mjService.beginGame(roomNum);
    var room = this.roomService.getRoom(roomNum);
    room.status = this.consts.ROOM_STATUS.RUNNING;
}

/**
 * 麻将出牌
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.chupai = function(msg, session, next)
{
    var pai = parseInt(msg.pai);

    var userId = session.get("userId");
    this.mjService.chupai(userId,pai);
}

/**
 * 麻将碰牌
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.peng = function(msg, session, next)
{
    var userId = session.get("userId");
    this.mjService.peng(userId);
}

/**
 * 麻将杠牌
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.gang = function(msg, session, next)
{
    var pai = msg.pai;
    var userId = session.get("userId");

    if(!typeof(pai) == "number")
    {
        if(typeof(pai) == "string"){
            pai = parseInt(pai);
        }
        else{
            console.log("gang:invalid param");
            return;
        }
    }


    var userId = session.get("userId");
    this.mjService.gang(userId,pai);
}

/**
 * 麻将胡牌
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.hu = function(msg, session, next)
{
    var userId = session.get("userId");
    this.mjService.hu(userId);
}

/**
 * 麻将过牌
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.guo = function(msg, session, next)
{
    var userId = session.get("userId");
    this.mjService.guo(userId);
}

/**
 * 麻将准备
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.ready = function(msg, session, next)
{
    var userId = session.get("userId");
    this.mjService.setReady(userId);
}

/**
 * 麻将聊天
 * @param msg
 * @param session
 * @param next
 */
MjHandler.prototype.chat = function(msg, session, next)
{
    var userId = session.get("userId");
    var roomNum = this.userService.getUser(userId).roomNumber;
    this.commonService.sendMessageToAllRoomPlayer(roomNum,"wenzi_chat_push",msg);
}

module.exports = function(app) {
    return bearcat.getBean({
        id: "mjHandler",
        func: MjHandler,
        args: [{
            name: "app",
            value: app
        }],
        props: [{
            name: "mjService",
            ref: "mjService"
            },
            {
                name: "commonUtils",
                ref: "commonUtils"
            },
            {
                name: "commonService",
                ref: "commonService"
            },
            {
                name: "userService",
                ref: "userService"
            },
            {
                name: "roomService",
                ref: "roomService"
            },
            {
            name: "consts",
            ref: "consts"
        }]
    });
};