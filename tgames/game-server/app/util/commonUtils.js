
var CommonUtils = function() {

}

var chars = ['0','1','2','3','4','5','6','7','8','9'];

/**
 * 获取指定长度的随机数
 * @param n
 * @returns {string}
 */
CommonUtils.prototype.genRandomNum = function (n) {
    var res = "";
    for(var i = 0; i < n ; i ++) {
        var id = Math.ceil(Math.random()*35);
        res += chars[id];
    }
    return res;
}


module.exports = {
    id: "commonUtils",
    func: CommonUtils
}