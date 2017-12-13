var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'Room');
var bearcat = require('bearcat');

function Room(opts) {
   this.roomNumber = opts.roomNumber;
   this.seats = opts.seats; //玩家座位信息
   this.roomConf =opts.roomConf;
   this.status = opts.status;  //房间状态  UN_START, START , END
   this.memberNum = opts.memberNum;
   this.numOfGames = 0 ; //游戏当前局数
   this.nextZhuangjia = 0; //下一轮庄家座位索引
   this.createTime=opts.createTime;
   this.creator=opts.creator;
}



module.exports = {
    id: "room",
    func: Room,
    scope: "prototype",
    args: [{
        name: "opts",
        type: "Object"
    }]
}