var Consts = function() {
  this.RES_CODE = {
    SUC_OK: 1, // success
    ERR_FAIL: -1, // Failded without specific reason
    ERR_USER_NOT_LOGINED: -2, // User not login
    ERR_CHANNEL_DESTROYED: -10, // channel has been destroyed
    ERR_SESSION_NOT_EXIST: -11, // session not exist
    ERR_CHANNEL_DUPLICATE: -12, // channel duplicated
    ERR_CHANNEL_NOT_EXIST: -13, // channel not exist
    ERR_ROOM_NOT_EXIST: -20,  //房间不存在
    ERR_CREAT_ROOM_EXIST:-21,
    ERR_GAME_IS_STARTED:-22
  };

  this.MESSAGE = {
    RES: 200,
    ERR: 500,
    PUSH: 600
  };

 this.onlineType = {
        online: 1,
        offerline: 0
    };

  this.ROOM_STATUS = {
       UN_START:0,
       RUNNING:1,
       REPLYING:2,
       END:3
  }


  this.MJ_ACTION = {
      ACTION_CHUPAI : 1,
      ACTION_MOPAI : 2,
     ACTION_PENG : 3,
     ACTION_GANG : 4,
     ACTION_HU : 5,
    ACTION_ZIMO : 6
  }

}

module.exports = {
  id: "consts",
  func: Consts
}