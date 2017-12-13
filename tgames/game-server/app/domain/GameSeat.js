var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'GameSeat');

function GameSeat(opts) {
  this.game = opts.game; //座位对应的游戏
  this.seatIndex = opts.seatIndex;    //游戏房间座位索引
  this.GameSeatIndex = opts.GameSeatIndex;  //游戏局数
  this.userId = opts.userId;  //座位号对应的游戏玩家
  this.holds = []; //我的手牌
  this.folds = []; //我打出的牌
  this.angangs = []; // 暗杠的牌
  this.diangangs = []; //定杠的牌
  this.wangangs =[];//湾杠的牌
  this.pengs = []; //碰的牌
  this.countMap = {}; //手牌数目 快速判定 碰、杠
  this.tingMap = {};    //玩家听牌，用于快速判定胡了的番数
  this.pattern = "";  //胡牌的番型  自摸、放炮、天胡、地胡、小七对 。。。
  this.canGang = false; //是否可以杠
  this.gangPai = []; //用于记录玩家可以杠的牌
  this.canPeng = false; //是否可以碰
  this.canHu = false;   //是否可以胡
  this.canChuPai = false; //是否可以出牌
  this.actions = [] ;
  this.iszimo = false; //是否自摸
  this.score = 0; //游戏本轮积分
  this.huInfo = [];
  this.hued = false;
  this.guoHu = -1;
  this.lastFangGangSeat = -1;
    this.numZiMo = 0;
    this.numJiePao = 0;
    this.numDianPao = 0;
    this.numAnGang = 0;
    this.numMingGang = 0;
    this.numChaJiao = 0;
}



module.exports = {
    id: "gameSeat",
    func: GameSeat,
    scope: "prototype",
    args: [{
        name: "opts",
        type: "Object"
    }]
}