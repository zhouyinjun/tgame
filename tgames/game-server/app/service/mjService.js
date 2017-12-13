var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'MjService');
var bearcat = require('bearcat');

/**
 * 麻将服务
 * @constructor
 */
var MjService = function () {
    this.games = {};
    this.gameSeatsOfUsers = {};
    this.consts = null;
    this.roomService = null;
    this.commonService = null;
    this.mjutils = null;
    this.userService =null;
}

/**
 * 新开始游戏
 */
MjService.prototype.beginGame = function (roomNum)
{
    var roomInfo = this.roomService.getRoom(roomNum);
    if(roomInfo  == null)
    {
        return;
    }

    var seats = roomInfo.seats;
    //1.初始化game
    roomInfo.numOfGames ++ ;
    roomInfo.status = this.consts.ROOM_STATUS.RUNNING;
    var game = bearcat.getBean("game",{roomInfo:roomInfo,gameIndex:roomInfo.numOfGames,zhuangjia:roomInfo.nextZhuangjia});
    for(var i = 0; i < 4; ++i){
       var gameSeat =  bearcat.getBean("gameSeat",
            {
                game:game,
                GameSeatIndex:roomInfo.numOfGames,
                seatIndex:i,
                userId:seats[i].userId,
            });

        game.gameSeats[i] = gameSeat;
        this.gameSeatsOfUsers[gameSeat.userId] = gameSeat;
    }
    this.games[roomNum] = game;

    //2.洗牌
     this.shuffle(game);
    //3.发牌
     this.deal(game);
    //4.开局时，通知前端必要的数据
     var numOfMJ = game.mahjongs.length - game.majCurrentIndex;
    for(var i = 0; i < seats.length; ++i){
        var s = seats[i];
        //通知玩家手牌
        this.commonService.sendMessageToPlayer(roomNum,s.userId,"game_holds_push",game.gameSeats[i].holds);
        //通知还剩多少张牌
        this.commonService.sendMessageToPlayer(roomNum,s.userId,"mj_count_push",numOfMJ);
        //通知局数
        this.commonService.sendMessageToPlayer(roomNum,s.userId,"game_num_push",roomInfo.numOfGames);
        //通知游戏开始
        this.commonService.sendMessageToPlayer(roomNum,s.userId,"game_begin_push",{zhuangjia:game.zhuangjia});
    }

    var turnSeat = game.gameSeats[game.turn];
    game.state = "playing";
    //通知游戏进行, 前段显示指针高亮、出牌倒计时
    this.commonService.sendMessageToAllRoomPlayer(roomNum,"game_playing_push",turnSeat.userId);

    //通知玩家出牌方
    turnSeat.canChuPai = true;
    this.commonService.sendMessageToAllRoomPlayer(roomNum,"game_chupai_push",turnSeat.userId);
    //检查是否可以暗杠或者胡
    //直杠
    checkCanAnGang(game,turnSeat);
    //检查胡 用最后一张来检查
    var checkPaiIndex = turnSeat.holds.length - 1;
    this.checkCanHu(turnSeat,turnSeat.holds[checkPaiIndex]);
    //通知前端
    this.sendOperations(game,turnSeat,game.chuPai);
}

/**
 *  麻将洗牌
 * @param game
 */
MjService.prototype.shuffle = function (game) {

    var mahjongs = game.mahjongs;
    //筒 (0 ~ 8 表示筒子
    var index = 0;
    for(var i = 0; i < 9; ++i){
        for(var c = 0; c < 4; ++c){
            mahjongs[index] = i;
            index++;
        }
    }
    //条 9 ~ 17表示条子
    for(var i = 9; i < 18; ++i){
        for(var c = 0; c < 4; ++c){
            mahjongs[index] = i;
            index++;
        }
    }
    //万
    //条 18 ~ 26表示万
    for(var i = 18; i < 27; ++i){
        for(var c = 0; c < 4; ++c){
            mahjongs[index] = i;
            index++;
        }
    }
    for(var i = 0; i < mahjongs.length; ++i){
        var lastIndex = mahjongs.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjongs[index];
        mahjongs[index] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }
}

/**
 * 麻将发牌
 * @param game
 */
MjService.prototype.deal = function (game){
    //强制清0
    game.majCurrentIndex = 0;

    //每人13张 一共 13*4 ＝ 52张 庄家多一张 53张
    var seatIndex = game.zhuangjia;
    for(var i = 0; i < 52; ++i){
        var mahjongs = game.gameSeats[seatIndex].holds;
        if(mahjongs == null){
            mahjongs = [];
            game.gameSeats[seatIndex].holds = mahjongs;
        }
        this.mopai(game,seatIndex);
        seatIndex ++;
        seatIndex %= 4;
    }

    //庄家多摸最后一张
    this.mopai(game,game.zhuangjia);
    //当前轮设置为庄家
    game.turn = game.zhuangjia;
}

/**
 * 麻将摸牌
 * @param game
 * @param seatIndex
 * @returns {*}
 */
MjService.prototype.mopai = function (game,seatIndex) {
    if(game.majCurrentIndex == game.mahjongs.length - game.roomInfo.roomConf.zhamaNum){
        return -1;
    }
    var data = game.gameSeats[seatIndex];
    var mahjongs = data.holds;
    var pai = game.mahjongs[game.majCurrentIndex];
    mahjongs.push(pai);

    //统计牌的数目 ，用于快速判定（空间换时间）
    var c = data.countMap[pai];
    if(c == null) {
        c = 0;
    }
    data.countMap[pai] = c + 1;
    game.majCurrentIndex ++;
    return pai;
}

/**
 * 判定是否有碰、杠、胡
 * @param seatData
 * @returns {boolean}
 */
MjService.prototype.hasOperations = function (seatData){
    if(seatData.canGang || seatData.canPeng || seatData.canHu){
        return true;
    }
    return false;
}

/**
 * 记录游戏动作
 * @param game
 * @param si
 * @param action
 * @param pai
 */
function recordGameAction(game,si,action,pai){
    game.actionList.push(si);
    game.actionList.push(action);
    if(pai != null){
        game.actionList.push(pai);
    }
}

/**
 * 检查听牌
 * @param game
 * @param seatData
 */
MjService.prototype.checkCanTingPai = function (game,seatData){
    seatData.tingMap = {};

    //检查是否是七对 前提是没有碰，也没有杠 ，即手上拥有13张牌
    if(seatData.holds.length == 13){
        //有5对牌
        var hu = false;
        var danPai = -1;
        var pairCount = 0;
        for(var k in seatData.countMap){
            var c = seatData.countMap[k];
            if( c == 2 || c == 3){
                pairCount++;
            }
            else if(c == 4){
                pairCount += 2;
            }

            if(c == 1 || c == 3){
                //如果已经有单牌了，表示不止一张单牌，并没有下叫。直接闪
                if(danPai >= 0){
                    break;
                }
                danPai = k;
            }
        }

        //检查是否有6对 并且单牌是不是目标牌
        if(pairCount == 6){
            //七对只能和一张，就是手上那张单牌
            //七对的番数＝ 2番+N个4个牌（即龙七对）
            seatData.tingMap[danPai] = {
                fan:2,
                pattern:"7pairs"
            };
            //如果是，则直接返回咯
        }
    }

    //检查是否是对对胡  由于四川麻将没有吃，所以只需要检查手上的牌
    //对对胡叫牌有两种情况
    //1、N坎 + 1张单牌
    //2、N-1坎 + 两对牌
    var singleCount = 0;
    var colCount = 0;
    var pairCount = 0;
    var arr = [];
    for(var k in seatData.countMap){
        var c = seatData.countMap[k];
        if(c == 1){
            singleCount++;
            arr.push(k);
        }
        else if(c == 2){
            pairCount++;
            arr.push(k);
        }
        else if(c == 3){
            colCount++;
        }
        else if(c == 4){
            //手上有4个一样的牌，在四川麻将中是和不了对对胡的 随便加点东西
            singleCount++;
            pairCount+=2;
        }
    }

    if((pairCount == 2 && singleCount == 0) || (pairCount == 0 && singleCount == 1) ){
        for(var i = 0; i < arr.length; ++ i){
            //对对胡1番
            var p = arr[i];
            if(seatData.tingMap[p] == null){
                seatData.tingMap[p] = {
                    pattern:"duidui",
                    fan:1
                };
            }
        }
    }

    //检查是不是平胡
     this.mjutils.checkTingPai(seatData,0,9);
     this.mjutils.checkTingPai(seatData,9,18);
     this.mjutils.checkTingPai(seatData,18,27);
}

/**
 * 清除碰、杠、胡操作
 * @param game
 * @param seatData
 */
function clearAllOptions(game,seatData){
    var fnClear = function(sd){
        sd.canPeng = false;
        sd.canGang = false;
        sd.gangPai = [];
        sd.canHu = false;
        sd.lastFangGangSeat = -1;
    }
    if(seatData){
        fnClear(seatData);
    }
    else{
        game.qiangGangContext = null;
        for(var i = 0; i < game.gameSeats.length; ++i){
            fnClear(game.gameSeats[i]);
        }
    }
}

/**
 * 游戏碰牌
 * @param userId
 */
MjService.prototype.peng = function(userId){
    var seatData = this.gameSeatsOfUsers[userId];
    if(seatData == null){
        logger.error("can't find user game data.");
        return;
    }

    var game = seatData.game;

    //如果是他出的牌，则忽略
    if(game.turn == seatData.seatIndex){
        logger.warn("it's your turn.");
        return;
    }

    //如果没有碰的机会，则不能再碰
    if(seatData.canPeng == false){
        console.log("seatData.peng == false");
        return;
    }

    //如果有人可以胡牌，则需要等待
    var i = game.turn;
    while(true){
        var i = (i + 1)%4;
        if(i == game.turn){
            break;
        }
        else{
            var ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;
            }
        }
    }

    clearAllOptions(game);

    //验证手上的牌的数目
    var pai = game.chuPai;
    var c = seatData.countMap[pai];
    if(c == null || c < 2){
        console.log("pai:" + pai + ",count:" + c);
        console.log(seatData.holds);
        console.log("lack of mj.");
        return;
    }

    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for(var i = 0; i < 2; ++i){
        var index = seatData.holds.indexOf(pai);
        if(index == -1){
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[pai] --;
    }
    seatData.pengs.push(pai);
    game.chuPai = -1;

    recordGameAction(game,seatData.seatIndex,this.consts.ACTION_PENG,pai);

    //广播通知其它玩家
    var roomNum = game.roomInfo.roomNumber;
    this.commonService.sendMessageToAllRoomPlayer(roomNum,"peng_notify_push",{userId:seatData.userId,pai:pai})

    //碰的玩家打牌
    moveToNextUser(game,seatData.seatIndex);

    //广播通知玩家出牌方
    seatData.canChuPai = true;
    this.commonService.sendMessageToAllRoomPlayer(roomNum,"game_chupai_push",seatData.userId);
};

/**
 * 游戏杠牌
 * @param userId
 * @param pai
 */
MjService.prototype.gang = function(userId,pai){
    var seatData = this.gameSeatsOfUsers[userId];
    if(seatData == null){
        logger.error("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果没有杠的机会，则不能再杠
    if(seatData.canGang == false) {
        logger.error("seatData.gang == false");
        return;
    }

    var numOfCnt = seatData.countMap[pai];

    if(seatData.gangPai.indexOf(pai) == -1){
        console.log("the given pai can't be ganged.");
        return;
    }

    //如果有人可以胡牌，则需要等待
    var i = game.turn;
    while(true){
        var i = (i + 1)%4;
        if(i == game.turn){
            break;
        }
        else{
            var ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;
            }
        }
    }

    var gangtype = ""
    //弯杠 去掉碰牌
    if(numOfCnt == 1){
        gangtype = "wangang"
    }
    else if(numOfCnt == 3){
        gangtype = "diangang"
    }
    else if(numOfCnt == 4){
        gangtype = "angang";
    }
    else{
        console.log("invalid pai count.");
        return;
    }

    game.chuPai = -1;
    clearAllOptions(game);
    seatData.canChuPai = false;

     //广播玩家杠牌
    var roomNum = game.roomInfo.roomNumber;
    this.commonService.sendMessageToAllRoomPlayer(roomNum,"hangang_notify_push",{detail:seatIndex});

    //如果是弯杠，则需要检查是否可以抢杠
    var turnSeat = game.gameSeats[game.turn];
    if(numOfCnt == 1){
        var canQiangGang = this.checkCanQiangGang(game,turnSeat,seatData,pai);
        if(canQiangGang){
            return;
        }
    }

    this.doGang(game,turnSeat,seatData,gangtype,numOfCnt,pai);
}

/**
 * 处理杠牌
 * @param game
 * @param turnSeat
 * @param seatData
 * @param gangtype
 * @param numOfCnt
 * @param pai
 */
MjService.prototype.doGang = function (game,turnSeat,seatData,gangtype,numOfCnt,pai){
    var seatIndex = seatData.seatIndex;
    var gameTurn = turnSeat.seatIndex;

    if(gangtype == "wangang"){
        var idx = seatData.pengs.indexOf(pai);
        if(idx >= 0){
            seatData.pengs.splice(idx,1);
        }
    }
    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for(var i = 0; i < numOfCnt; ++i){
        var index = seatData.holds.indexOf(pai);
        if(index == -1){
            console.log(seatData.holds);
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[pai] --;
    }

    recordGameAction(game,seatData.seatIndex,this.consts.ACTION_GANG,pai);

    //记录下玩家的杠牌
    if(gangtype == "angang"){
        seatData.angangs.push(pai);
    }
    else if(gangtype == "diangang"){
        seatData.diangangs.push(pai);
    }
    else if(gangtype == "wangang"){
        seatData.wangangs.push(pai);
    }

    //checkCanTingPai(game,seatData);
    //通知其他玩家，有人杠了牌
    this.commonService.sendMessageToAllRoomPlayer(game.roomInfo.roomNumber,"gang_notify_push",{userid:seatData.userId,pai:pai,gangtype:gangtype})

    //变成自己的轮子
    moveToNextUser(game,seatIndex);
    //再次摸牌
    this.doUserMoPai(game);

    //只能放在这里。因为过手就会清除杠牌标记
    seatData.lastFangGangSeat = gameTurn;
}

/**
 * 检查是否可以抢杠胡
 * @param game
 * @param turnSeat
 * @param seatData
 * @param pai
 * @returns {boolean}
 */
MjService.prototype.checkCanQiangGang = function (game,turnSeat,seatData,pai){
    var hasActions = false;
    for(var i = 0; i < game.gameSeats.length; ++i){
        //杠牌者不检查
        if(seatData.seatIndex == i){
            continue;
        }
        var ddd = game.gameSeats[i];
        this.checkCanHu(ddd,pai);
        if(ddd.canHu){
            this.sendOperations(game,ddd,pai);
            hasActions = true;
        }
    }
    if(hasActions){
        game.qiangGangContext = {
            turnSeat:turnSeat,
            seatData:seatData,
            pai:pai,
            isValid:true,
        }
    }
    else{
        game.qiangGangContext = null;
    }
    return game.qiangGangContext != null;
}

/**
 * 玩家出牌
 * @param userId
 * @param pai
 */
MjService.prototype.chupai = function (userId,pai) {
    pai = Number.parseInt(pai);
    var seatData = this.gameSeatsOfUsers[userId];
    if(seatData == null){
        logger.error("can't find user game data.");
        return false;
    }

    var game = seatData.game;
    var seatIndex = seatData.seatIndex;
    //如果不该他出，则忽略
    if(game.turn != seatData.seatIndex){
        logger.error("not your turn.");
        return false;
    }

    if(seatData.canChuPai == false){
        logger.error('no need chupai.');
        return false;
    }

    if(this.hasOperations(seatData)){
        logger.error('plz guo before you chupai.');
        return false;
    }

    //从此人牌中扣除
    var index = seatData.holds.indexOf(pai);
    if(index == -1){
        logger.error("holds:" + seatData.holds);
        logger.error("can't find mj." + pai);
        return false;
    }

    seatData.canChuPai = false;
    game.chupaiCnt ++;

    seatData.holds.splice(index,1);
    seatData.countMap[pai] --;
    game.chuPai = pai;
    recordGameAction(game,seatData.seatIndex,this.consts.MJ_ACTION.ACTION_CHUPAI,pai);
    //检查听牌
    //checkCanTingPai(game,seatData);
    this.commonService.sendMessageToAllRoomPlayer(game.roomInfo.roomNumber,"game_chupai_notify_push",{userId:seatData.userId,pai:pai});

    //检查是否有人要胡，要碰 要杠
    var hasActions = false;
    for(var i = 0; i < game.gameSeats.length; ++i){
        //玩家自己不检查
        if(game.turn == i){
            continue;
        }
        var ddd = game.gameSeats[i];
        //检查杠和碰
        checkCanPeng(game,ddd,pai);
        checkCanDianGang(game,ddd,pai);
        this.checkCanHu(ddd,pai);

        if(this.hasOperations(ddd)){
            this.sendOperations(game,ddd,game.chuPai);
            hasActions = true;
        }
    }

    //如果没有人有操作，则向下一家发牌，并通知他出牌
    var self = this;
    if(!hasActions){
        setTimeout(function(){
            self.commonService.sendMessageToAllRoomPlayer(game.roomInfo.roomNumber,"guo_notify_push",{userId:seatData.userId,pai:game.chuPai});
            seatData.folds.push(game.chuPai);
            game.chuPai = -1;
            moveToNextUser(game);
            self.doUserMoPai(game);
        },500);
    }

}

/**
 * 处理用户摸牌
 * @param game
 */
MjService.prototype.doUserMoPai = function doUserMoPai(game){
    game.chuPai = -1;
    var turnSeat = game.gameSeats[game.turn];
    var pai = this.mopai(game,game.turn);
    //牌摸完了，结束
    if(pai == -1){
        doGameOver(game,turnSeat.userId);
        return;
    }
    else{
        var numOfMJ = game.mahjongs.length - game.majCurrentIndex;
        this.commonService.sendMessageToAllRoomPlayer(game.roomInfo.roomNumber,"mj_count_push",numOfMJ);
    }
    recordGameAction(game,game.turn,this.consts.ACTION_MOPAI,pai);

    //通知前端新摸的牌
    this.commonService.sendMessageToPlayer(game.roomInfo.roomNumber,turnSeat.userId,"game_mopai_push",{pai:pai});
    //检查是否可以暗杠或者胡
    //检查胡，直杠，弯杠
     checkCanAnGang(game,turnSeat);

    //如果未胡牌，或者摸起来的牌可以杠，才检查弯杠
    if(turnSeat.holds[turnSeat.holds.length-1] == pai){
        checkCanWanGang(game,turnSeat,pai);
    }

    //检查看是否可以和
    this.checkCanHu(turnSeat,pai);

    //广播通知玩家出牌方
    turnSeat.canChuPai = true;
    this.commonService.sendMessageToAllRoomPlayer(game.roomInfo.roomNumber,"game_chupai_push",turnSeat.userId);

    //通知玩家做对应操作
    this.sendOperations(game,turnSeat,game.chuPai);
}

/**
 * 将轮子指向下一个玩家
 * @param game
 * @param nextSeat
 */
function moveToNextUser(game,nextSeat){
    //找到下一个没有和牌的玩家
    if(nextSeat == null){
        game.turn ++;
        game.turn %= 4;
        return;
    }
    else{
        game.turn = nextSeat;
    }
}

//向玩家发送碰、杠、胡通知
MjService.prototype.sendOperations = function (game,seatData,pai) {
    if(this.hasOperations(seatData)){
        if(pai == -1){
            pai = seatData.holds[seatData.holds.length - 1];
        }
        var data = {
            pai:pai,
            hu:seatData.canHu,
            peng:seatData.canPeng,
            gang:seatData.canGang,
            gangpai:seatData.gangPai
        };
        //如果可以有操作，则进行操作
        this.commonService.sendMessageToPlayer(game.roomInfo.roomNumber,seatData.userId,'game_action_push',data);
    }
}

//检查是否可以碰
function checkCanPeng(game,seatData,targetPai) {
    var count = seatData.countMap[targetPai];
    if(count != null && count >= 2){
        seatData.canPeng = true;
    }
}

//检查是否可以点杠
function checkCanDianGang(game,seatData,targetPai){
    //检查玩家手上的牌
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.majCurrentIndex){
        return;
    }
    var count = seatData.countMap[targetPai];
    if(count != null && count >= 3){
        seatData.canGang = true;
        seatData.gangPai.push(targetPai);
        return;
    }
}

//检查是否可以暗杠
function checkCanAnGang(game,seatData){
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.majCurrentIndex){
        return;
    }

    for(var key in seatData.countMap){
        var pai = parseInt(key);
            var c = seatData.countMap[key];
            if(c != null && c == 4){
                seatData.canGang = true;
                seatData.gangPai.push(pai);
                break;
            }
    }
}

//检查是否可以弯杠(自己摸起来的时候)
function checkCanWanGang(game,seatData){
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.majCurrentIndex){
        return;
    }

    //从碰过的牌中选
    for(var i = 0; i < seatData.pengs.length; ++i){
        var pai = seatData.pengs[i];
        if(seatData.countMap[pai] == 1){
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
}

/**
 * 检查是否能胡
 * @param game
 * @param seatData
 * @param targetPai
 */
MjService.prototype.checkCanHu = function (seatData,targetPai) {
    seatData.canHu = false;
    seatData.tingMap = {};

    var returnLastPai = false;
    if(seatData.holds.length == 14)
    {
        seatData.holds.splice(13,1);
        returnLastPai = true;
    }

    //检查是否是七对 前提是没有碰，也没有杠 ，即手上拥有13张牌
    if(seatData.holds.length == 13){
        //有5对牌
        var hu = false;
        var danPai = -1;
        var pairCount = 0;
        for(var k in seatData.countMap){
            var c = seatData.countMap[k];
            if( c == 2 || c == 3){
                pairCount++;
            }
            else if(c == 4){
                pairCount += 2;
            }

            if(c == 1 || c == 3){
                //如果已经有单牌了，表示不止一张单牌，并没有下叫。直接闪
                if(danPai >= 0){
                    break;
                }
                danPai = k;
            }
        }

        //检查是否有6对 并且单牌是不是目标牌
        if(pairCount == 6){
            //七对只能和一张，就是手上那张单牌
            //七对的番数＝ 2番+N个4个牌（即龙七对）
            seatData.tingMap[danPai] = {
                fan:2,
                pattern:"7pairs"
            };
            //如果是，则直接返回咯
        }
    }

    //检查是否是对对胡  由于四川麻将没有吃，所以只需要检查手上的牌
    //对对胡叫牌有两种情况
    //1、N坎 + 1张单牌
    //2、N-1坎 + 两对牌
    var singleCount = 0;
    var colCount = 0;
    var pairCount = 0;
    var arr = [];
    for(var k in seatData.countMap){
        var c = seatData.countMap[k];
        if(c == 1){
            singleCount++;
            arr.push(k);
        }
        else if(c == 2){
            pairCount++;
            arr.push(k);
        }
        else if(c == 3){
            colCount++;
        }
        else if(c == 4){
            //手上有4个一样的牌，在四川麻将中是和不了对对胡的 随便加点东西
            singleCount++;
            pairCount+=2;
        }
    }

    if((pairCount == 2 && singleCount == 0) || (pairCount == 0 && singleCount == 1) ){
        for(var i = 0; i < arr.length; ++ i){
            //对对胡1番
            var p = arr[i];
            if(seatData.tingMap[p] == null){
                seatData.tingMap[p] = {
                    pattern:"duidui",
                    fan:1
                };
            }
        }
    }

    this.mjutils.checkTingPai(seatData,targetPai,targetPai+1);

    for(var k in seatData.tingMap){
        if(targetPai == k){
            seatData.canHu = true;
        }
    }

    if(returnLastPai == true)
    {
        seatData.holds.push(targetPai);
    }

}

function calculateResult(game,roomInfo){
    // todo 扎鸟

    var baseScore = roomInfo.roomConf.difen;
    for(var i = 0; i < game.gameSeats.length; ++i){
        var jiepaoNum = 0;
        var dianpaoNum = 0;
        var zimoNum = 0;

        var sd = game.gameSeats[i];
        //对所有胡牌的玩家进行统计
        // 天胡、地胡、自摸得分番数番1倍
        //胡牌者有杠的每一杠番1倍
        //炮胡、抢杠胡不加倍
        var hus = sd.huInfo;
        if(hus && hus.length>0)
        {
            for(var j=0;j<hus.length;j++)
            {
                 if(hus[j].action == "beiqianggang" || hus[j].action == "gangpao" || hus[j].action == "fangpao")
                 {
                    var huedSeat = hus[j].target ;
                    var targetSeatData =  game.gameSeats[huedSeat]
                    var fan = targetSeatData.diangangs.length + targetSeatData.wangangs.length + targetSeatData.angangs.length;
                    sd[i].score = sd[i].score  - (baseScore * (fan + 1));
                     dianpaoNum = dianpaoNum +1;
                 }
                 else if(hus[j].iszimo && hus[j].iszimo == true)
                 {
                     //自摸者增加积分
                     var fan = sd[i].diangangs.length + sd[i].wangangs.length + sd[i].angangs.length;
                     sd[i].score = sd[i].score  + 3*(baseScore * (fan + 2));
                     //其他玩家减积分
                     for(var k = 0; k < game.gameSeats.length; ++k)
                     {
                         if(k != i)
                         {
                             game.gameSeats[k].score = game.gameSeats[k].score - (baseScore * (fan + 2))
                         }
                     }
                     zimoNum = zimoNum + 1;
                 }
                 else
                 {
                     var fan = sd[i].diangangs.length + sd[i].wangangs.length + sd[i].angangs.length;
                     sd[i].score = sd[i].score  + (baseScore * (fan + 1));
                     jiepaoNum = jiepaoNum + 1;
                 }
            }
        }

        // 将本轮战绩统计
        sd[i].numMingGang =  sd[i].wangangs.length;
        sd[i].numAnGang =  sd[i].angangs.length;
        sd[i].numJiePao = jiepaoNum;
        sd[i].numDianPao =  dianpaoNum;
        sd[i].numZiMo = zimoNum;
    }
}

/**
 * 游戏单局结束
 * @param game
 * @param userId
 * @param forceEnd
 */
MjService.prototype.doGameOver = function (game,userId,forceEnd){
    var roomId = this.userService.getUser(userId).roomNumber;
    if(roomId == null){
        return;
    }
    var roomInfo = this.roomService.getRoom(roomId);
    if(roomInfo == null){
        return;
    }

    var results = [];
    //var dbresult = [0,0,0,0];

    var fnNoticeResult = function(isEnd){
        var endinfo = null;
        if(isEnd){
            endinfo = [];
            for(var i = 0; i < roomInfo.seats.length; ++i){
                var rs = roomInfo.seats[i];
                endinfo.push({
                    numzimo:rs.zimoNum,
                    numjiepao:rs.jiepaoNum,
                    numdianpao:rs.dianpaoNum,
                    numangang:rs.agangNum,
                    numminggang:rs.mgangNum,
                    numchadajiao:rs.zhongmaNum,
                });
            }
        }
        this.commonService.sendMessageToAllRoomPlayer(roomId,'game_over_push',{results:results,endinfo:endinfo})
        //如果局数已够，则进行整体结算，并关闭房间
        if(isEnd){
            setTimeout(function(){
                if(roomInfo.numOfGames > 1){
                    //store_history(roomInfo);
                }
                this.userService.killAllInRoom(roomId);
                this.roomService.destroy(roomId);
            },1500);
        }
    }

    if(game != null){
        if(!forceEnd){
            calculateResult(game,roomInfo);
        }

        for(var i = 0; i < roomInfo.seats.length; ++i){
            var rs = roomInfo.seats[i];
            var sd = game.gameSeats[i];

            rs.ready = false;
            rs.score += sd.score
            rs.zimoNum += sd.numZiMo;
            rs.jiepaoNum += sd.numJiePao;
            rs.dianpaoNum += sd.numDianPao;
            rs.agangNum += sd.numAnGang;
            rs.mgangNum += sd.numMingGang;
            rs.zhongmaNum += sd.numChaJiao;

            var userRT = {
                userId:sd.userId,
                actions:[],
                pengs:sd.pengs,
                wangangs:sd.wangangs,
                diangangs:sd.diangangs,
                angangs:sd.angangs,
                holds:sd.holds,
                score:sd.score,
                totalscore:rs.score,
                huinfo:sd.huInfo
            }
            results.push(userRT);

            //dbresult[i] = sd.score;
            delete this.gameSeatsOfUsers[sd.userId];
        }
        delete this.games[roomId];

      //  var old = roomInfo.nextButton;
        if(game.yipaoduoxiang >= 0){
            roomInfo.nextZhuangjia = game.yipaoduoxiang;
        }
        else if(game.firstHupai >= 0){
            roomInfo.nextZhuangjia = game.firstHupai;
        }
        else{
            roomInfo.nextZhuangjia = (game.turn + 1) % 4;
        }

        // if(old != roomInfo.nextButton){
        //     db.update_next_button(roomId,roomInfo.nextButton);
        // }
    }

    if(forceEnd || game == null){
        fnNoticeResult(true);
    }
    else{
        //保存游戏
        //store_game(game,function(ret){
        //    db.update_game_result(roomInfo.uuid,game.gameIndex,dbresult);

            //记录玩家操作
            //var str = JSON.stringify(game.actionList);
          //  db.update_game_action_records(roomInfo.uuid,game.gameIndex,str);

            //保存游戏局数
           // db.update_num_of_turns(roomId,roomInfo.numOfGames);

            //如果是第一次，则扣除房卡
            // if(roomInfo.numOfGames == 1){
            //     var cost = 2;
            //     if(roomInfo.conf.maxGames == 8){
            //         cost = 3;
            //     }
            //     db.cost_gems(game.gameSeats[0].userId,cost);
            // }

            var isEnd = (roomInfo.numOfGames >= roomInfo.roomConf.xzjushu);
            fnNoticeResult(isEnd);
       // });
    }
}

/**
 * 游戏过牌
 * @param userId
 */
MjService.prototype.guo = function(userId){
    var seatData = this.gameSeatsOfUsers[userId];
    if(seatData == null){
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果玩家没有对应的操作，则也认为是非法消息
    if((seatData.canGang || seatData.canPeng || seatData.canHu) == false){
        console.log("no need guo.");
        return;
    }

    var doNothing = game.chuPai == -1 && game.turn == seatIndex;

    this.commonService.sendMessageToPlayer(game.roomInfo.roomNumber,seatData.userId,"guo_result",{guo:"guo"})
    clearAllOptions(game,seatData);

    //这里还要处理过胡的情况
    if(game.chuPai >= 0 && seatData.canHu){
        seatData.guoHu = 1;
    }

    if(doNothing){
        return;
    }

    if(game.chuPai >= 0){
        var uid = game.gameSeats[game.turn].userId;
        this.commonService.sendMessageToAllRoomPlayer(game.roomInfo.roomNumber,'guo_notify_push',{userId:uid,pai:game.chuPai});
        seatData.folds.push(game.chuPai);
        game.chuPai = -1;
    }

    //如果还有人可以操作，则等待
    for(var i = 0; i < game.gameSeats.length; ++i){
        var ddd = game.gameSeats[i];
        if(this.hasOperations(ddd)){
            return;
        }
    }


    var qiangGangContext = game.qiangGangContext;
    //清除所有的操作
    clearAllOptions(game);

    if(qiangGangContext != null && qiangGangContext.isValid){
        this.doGang(game,qiangGangContext.turnSeat,qiangGangContext.seatData,"wangang",1,qiangGangContext.pai);
    }
    else{
        //下家摸牌
        moveToNextUser(game);
        this.doUserMoPai(game);
    }

}


/**
 * 玩家游戏准备
 * @param userId
 */
MjService.prototype.setReady = function(userId){
    var roomId = this.userService.getUser(userId).roomNumber;
    if(roomId == null){
        return;
    }
    var roomInfo = this.roomService.getRoom(roomId);
    if(roomInfo == null){
        return;
    }

    this.roomService.setReady(userId,roomId,true);

    this.commonService.sendMessageToAllRoomPlayer(roomId,"user_ready_push",{userid:userId,ready:true});

    var game = this.games[roomId];
    if(game == null){
        if(roomInfo.seats.length == 4){
            for(var i = 0; i < roomInfo.seats.length; ++i){
                var s = roomInfo.seats[i];
                if(s.ready == false || userMgr.isOnline(s.userId)==false){
                    return;
                }
            }
            //4个人到齐了，并且都准备好了，则开始新的一局
            this.beginGame(roomId);
        }
    }
}

/**
 * 麻将胡牌
 * @param userId
 */
MjService.prototype.hu = function(userId){
    var seatData = this.gameSeatsOfUsers[userId];
    if(seatData == null){
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果他不能和牌，那和个啥啊
    if(seatData.canHu == false){
        console.log("invalid request.");
        return;
    }

    var hupai = game.chuPai;
    var isZimo = false;

    var turnSeat = game.gameSeats[game.turn];
    if(game.firstHupai == -1)
    {
        game.firstHupai = seatIndex ;
    }


    var huData = {
        ishupai:true,
        pai:-1,
        action:null,
        isGangHu:false,
        isQiangGangHu:false,
        iszimo:false,
        target:-1,
        fan:0,
        pattern:null,
        isHaiDiHu:false,
        isTianHu:false,
        isDiHu:false,
    };

    huData.numofgen = seatData.diangangs.length + seatData.wangangs.length + seatData.angangs.length;

    seatData.huInfo.push(huData);

    huData.isGangHu = turnSeat.lastFangGangSeat >= 0;
    var notify = -1;

    if(game.qiangGangContext != null){
        hupai = game.qiangGangContext.pai;
        var gangSeat = game.qiangGangContext.seatData;
        notify = hupai;
        huData.iszimo = false;
        huData.action = "qiangganghu";
        huData.isQiangGangHu = true;
        huData.target = gangSeat.seatIndex;
        huData.pai = hupai;

        recordGameAction(game,seatIndex,this.consts.MJ_ACTION.ACTION_HU,hupai);
        game.qiangGangContext.isValid = false;

        var idx = gangSeat.holds.indexOf(hupai);
        if(idx != -1){
            gangSeat.holds.splice(idx,1);
            gangSeat.countMap[hupai]--;
        }
        gangSeat.huInfo.push({
            action:"beiqianggang",
            target:seatData.seatIndex,
            index:seatData.huInfo.length-1,
        });
    }
    else if(game.chuPai == -1){
        hupai = seatData.holds.pop();
        seatData.countMap[hupai] --;
        notify = hupai;
        huData.pai = hupai;
        if(huData.isGangHu){
            if(turnSeat.lastFangGangSeat == seatIndex){
                huData.action = "ganghua";
                huData.iszimo = true;
            }
        }
        else{
            huData.action = "zimo";
            huData.iszimo = true;
        }
        isZimo = true;
        recordGameAction(game,seatIndex,this.consts.MJ_ACTION.ACTION_ZIMO,hupai);
    }
    else{
        notify = game.chuPai;
        huData.pai = hupai;

        var at = "hu";
        //炮胡
        if(turnSeat.lastFangGangSeat >= 0){
            at = "gangpaohu";
        }

        huData.action = at;
        huData.iszimo = false;
        huData.target = game.turn;


        //记录玩家放炮信息
        var fs = game.gameSeats[game.turn];
        if(at == "gangpaohu"){
            at = "gangpao";
        }
        else{
            at = "fangpao";
        }
        fs.huInfo.push({
            action:at,
            target:seatData.seatIndex,
            index:seatData.huInfo.length-1,
        });

        recordGameAction(game,seatIndex,this.consts.MJ_ACTION.ACTION_HU,hupai);
    }

    //保存番数
    var ti = seatData.tingMap[hupai];
    huData.fan = ti.fan;
    huData.pattern = ti.pattern;
    huData.iszimo = isZimo;
    //如果是最后一张牌，则认为是海底胡
    huData.isHaiDiHu = game.majCurrentIndex == game.mahjongs.length;

    if(game.roomInfo.roomConf.tiandihu){
        if(game.chupaiCnt == 0 && game.zhuangjia == seatData.seatIndex && game.chuPai == -1){
            huData.isTianHu = true;
        }
        else if(game.chupaiCnt == 1 && game.turn == game.zhuangjia && game.zhuangjia != seatData.seatIndex && game.chuPai != -1){
            huData.isDiHu = true;
        }
    }
    seatData.hued = true;
    clearAllOptions(game,seatData);

    //通知前端，有人和牌了
    this.commonService.sendMessageToAllRoomPlayer(game.roomInfo.roomNumber,"hu_push",{seatindex:seatIndex,iszimo:isZimo,hupai:notify});

    //如果一炮多响等待其他人胡牌
    var seats = game.gameSeats;
    for(var i=0;i<seats.length;i++)
    {
        if(i != seatIndex)
        {
            if(seats[i].canHu && seats[i].hued == false)
            {
                return ;
            }
        }

        if(seats[i].huInfo.length >=2)
        {
            game.yipaoduoxiang = i;
        }
    }

    //结束游戏
    var self = this;
    setTimeout(function(){
        self.doGameOver(game,userId);
    },500);
};




module.exports = {
    id: "mjService",
    func: MjService,
    props: [
        {
        name: "consts",
        ref: "consts"
        },
        {
            name: "roomService",
            ref: "roomService"
        },
        {
            name: "commonService",
            ref: "commonService"
        },
        {
            name: "mjutils",
            ref: "mjutils"
        },
        {
            name: "userService",
            ref: "userService"
        }
        ]
}