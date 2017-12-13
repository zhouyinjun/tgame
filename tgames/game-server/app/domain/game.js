var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'Game');

function Game(opts) {
  this.mahjongs = new Array(108);
  this.roomInfo = opts.roomInfo;    //游戏房间
  this.gameIndex = opts.gameIndex;  //游戏局数
  this.zhuangjia = opts.zhuangjia;  //庄家座位号
  this.majCurrentIndex = 0; //麻将的当前索引
  this.gameSeats = new Array(4); // 游戏对应座位玩家信息
  this.turn = 0; // 当前轮到哪个座位出牌
  this.chuPai = -1; //当前出牌
  this.state = "idle";
  this.yipaoduoxiang = -1; //一炮多响
  this.actionList = [];    //当前发生游戏动作出牌、吃、碰、杠、胡、自摸
  this.chupaiCnt = 0;  //出牌数
  this.qiangGangContext = null;
  this.firstHupai = -1;
}



module.exports = {
    id: "game",
    func: Game,
    scope: "prototype",
    args: [{
        name: "opts",
        type: "Object"
    }]
}