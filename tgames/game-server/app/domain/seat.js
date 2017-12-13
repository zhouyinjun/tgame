var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'Seat');
var bearcat = require('bearcat');

/**
 *  红中麻将战绩实体
 * @param opts
 * @constructor
 */
function Seat(opts) {
    this.userId = opts.userId;
    this.name = opts.name;
    this.score= 0;           //积分
    this.ready =opts.ready;
    this.seatIndex=opts.seatIndex;
    this.zimoNum=0;
    this.jiepaoNum=0;
     this.dianpaoNum=0;
    this.mgangNum = 0;   //明杠数
    this.agangNum=0;     //按杠数
    this.zhongmaNum=0; //中码数
}

Seat.prototype.toJSON = function() {
    return {
        userId: this.userId,
        name:this.name,
        score:this.score,
        ready:this.ready,
        seatIndex:this.seatIndex,
        zimoNum:this.zimoNum,
        jiepaoNum:this.jiepaoNum,
        dianpaoNum:this.dianpaoNum,
        mgangNum: this.mgangNum,
        agangNum: this.agangNum,
        zhongmaNum: this.zhongmaNum
    }
}



module.exports = {
    id: "seat",
    func: Seat,
    scope: "prototype",
    args: [{
        name: "opts",
        type: "Object"
    }]
}