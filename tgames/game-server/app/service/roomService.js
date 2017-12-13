var logger = require('pomelo-logger').getLogger('bearcat-tgame', 'RoomService');
var bearcat = require('bearcat');
var pomelo = require('pomelo');

var RoomService = function () {
    this.rooms = {};
    this.totalRooms = 0;
}

/**
 * 往游戏大厅中添加房间
 * @param roomInfo
 */
RoomService.prototype.addRoom = function(roomInfo)
{
    var roomNum = roomInfo.roomNumber;
    if(!this.getRoom(roomNum))
    {
        this.rooms[roomNum]=roomInfo;
        this.totalRooms = this.totalRooms + 1;
        return true;
    }
    return false;
}

RoomService.prototype.setReady = function (userId,roomId,value) {
    var roomInfo = this.rooms[roomId];
    for(var i=0;i<roomInfo.seats.length;i++)
    {
        roomInfo.seats[i].ready = value;
    }
}

/**
 *
 * @param roomNum
 * @returns {*}
 */
RoomService.prototype.getRoom = function (roomNumber) {
    return this.rooms[roomNumber];
}


RoomService.prototype.destroy = function(roomId){
    var roomInfo = this.rooms[roomId];
    if(roomInfo == null){
        return;
    }

   // for(var i = 0; i < 4; ++i){
   //     var userId = roomInfo.seats[i].userId;
   //     if(userId > 0){
   //         delete userLocation[userId];
   //         db.set_room_id_of_user(userId,null);
   //     }
   // }

    delete this.rooms[roomId];
    this.totalRooms--;
   // db.delete_room(roomId);
}


module.exports = {
    id: "roomService",
    func: RoomService,
    props: [
        {
        name: "consts",
        ref: "consts"
    }]
}