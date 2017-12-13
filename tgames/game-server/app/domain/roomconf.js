var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'Roomconf');
var bearcat = require('bearcat');

/**
 *  房间创建配置信息
 * @param opts
 * @constructor
 */
function Roomconf(opts) {
    this.type = opts.type;
    this.difen = opts.difen;
    this.xzjushu= opts.xzjushu;
    this.zhamaNum =opts.zhamaNum;
    this.tiandihu = opts.tiandihu;
}

Roomconf.prototype.toJSON = function() {
    return {
        type:this.type,
        difen: this.difen ,
        xzjushu:this.xzjushu,
        zhamaNum:this.zhamaNum,
        tiandihu:this.tiandihu
    }
}

module.exports = {
    id: "roomconf",
    func: Roomconf,
    scope: "prototype",
    args: [{
        name: "opts",
        type: "Object"
    }]
}