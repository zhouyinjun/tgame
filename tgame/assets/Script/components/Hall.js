var Net = require("Net")
var Global = require("Global")
cc.Class({
    extends: cc.Component,

    properties: {
        joinGameWin:cc.Node
    },
    // use this for initialization
    onLoad: function () {
        if(!cc.sys.isNative && cc.sys.isMobile){
            var cvs = this.node.getComponent(cc.Canvas);
            cvs.fitHeight = true;
            cvs.fitWidth = true;
        }
        if(!cc.vv){
            cc.director.loadScene("start");
            return;
        }

        cc.vv.userMgr.userId = this.genRandomNum(6);

        //var params = cc.vv.args;
        var roomId = cc.vv.userMgr.oldRoomId 
        if( roomId != null){
            cc.vv.userMgr.oldRoomId = null;
            cc.vv.userMgr.enterRoom(roomId);
        }

        cc.vv.utils.addEscEvent(this.node);
    },
    
    onJoinGameClicked:function(){
        this.joinGameWin.active = true;
    },
    genRandomNum: function (n) {
        var Num="";
        for(var i=0;i<n;i++)
        {
            Num+=Math.floor(Math.random()*10);
        }
        return Num;
    },
    
    onCreateRoomClicked:function(){
        // 1. 调用http接口创建房间并返回房间信息。
        var roomNum = 999999;
        var userId = cc.vv.userMgr.userId;
        window.console.log("userId:"+userId);

        pomelo.on("test",function () {
            console.log("push is succeful.");
        })

        //2.连接游戏server，登录游戏server，并在server中创建房间信息
        var createRoom = function (ret) {
            var roomConf = {
                type:'zzmj',
                difen: 1 ,
                xzjushu:8,
                zhamaNum:6,
                tiandihu:1
            };
            pomelo.request("mjarea.mjHandler.createRoom",{roomNumber:roomNum,roomConf:roomConf},function (ret) {
                console.log("create room succeful.");
                  if(ret.code == 200)
                  {
                      cc.vv.gameNetMgr.seats = ret.seats;
                      cc.vv.gameNetMgr.seatIndex = ret.mySeatIndex;
                      cc.vv.gameNetMgr.roomId = roomNum;
                      cc.director.loadScene("zzmaj");
                  }
                  else
                  {
                      console.log("create room other.");
                  }
            })
        }

       cc.vv.gameNetMgr.connectGameServer({userId:userId},createRoom);
    },
    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        // var x = this.lblNotice.node.x;
        // x -= dt*100;
        // if(x + this.lblNotice.node.width < -1000){
        //     x = 500;
        // }
        // this.lblNotice.node.x = x;
        //
        // if(cc.vv && cc.vv.userMgr.roomData != null){
        //     cc.vv.userMgr.enterRoom(cc.vv.userMgr.roomData);
        //     cc.vv.userMgr.roomData = null;
        // }
    },
});
