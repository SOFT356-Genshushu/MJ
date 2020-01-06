var UnitTools = require("./../../core/UnitTools.js");
var Maps = require('./../../core/Map.js');
var Room = function (id, posCount, custom) {
    this.roomID = id;
    this.posCount = posCount;
    this.accounts = new Maps();//Account number in the room
    this.posInfo = new Maps();//Seat information
    this.posReadyInfo = {};//Seat preparation
    this.custom = custom;
    this.isStarted = false; //Has it started
    this.createTime = new Date();//Time created
    this.createAccount = null;//Creator's account
}

Room.prototype.isPosValid = function (pos) {
    try {//Judge whether the seat number is legal
        var posNum = new Number(pos);
        if (posNum < this.posCount && posNum >= 0)return true;
    } catch (e) {
        return false;
    }
}


Room.prototype.getPos = function (account) {
    if (UnitTools.isNullOrUndefined(account))return null;
    var findPos = null;
    for (var pos in this.posInfo) {
        this.posInfo.forEach(function (pos, info) {
            if (UnitTools.isNullOrUndefined(info.account))return;
            if (info.account.toString() === account.toString()) {
                findPos = pos;
            }
        });
    }
    return findPos;
}

Room.prototype.isPosEmpty = function (pos) {
    if (!this.isPosValid(pos))return false;
    var posInfo = this.posInfo.getNotCreate(pos);
    if (UnitTools.isNullOrUndefined(posInfo))return true;
    if (UnitTools.isNullOrUndefined(posInfo.account))return true;
    return false;
}

Room.prototype.isRoomEmpty = function () {
    var allAccounts = this.getInRoomAllAccounts();
    for (var key in allAccounts) {
        var account = allAccounts[key];
        var pos = this.getPos(account);
        if (!this.isPosEmpty(pos))return false;
    }
    return true;
}


Room.prototype.inRoom = function (account) {//get into the room
    this.accounts.setKeyValue(account,{});
    return true;
}


Room.prototype.inPos = function (account, pos) {//Enter the seat
    //Judge whether the player is in the seat. If so, remove the previous position and enter the new position
    if (!this.isPosValid(pos))return false;
    this.inRoom(account);//If you call inpos directly, you need to enter the account into the room
    if (!this.isPosEmpty(pos))return false;
    var self = this;
    this.posInfo.forEach(function (key, value) {
        try {
            if (value.account.toString() === account.toString()) {
                self.posInfo.setKeyValue(key, {});
            }
        } catch (e) {
        }
    });
    var posInfo = this.posInfo.getOrCreate(pos);
    posInfo.account = account;
    posInfo.isReady = false;
    return true;
}

Room.prototype.outRoom = function (account) {//Leave the room
    this.accounts.remove(account);
    return this.outPos(account);
}

Room.prototype.outPos = function (account) {
    if (UnitTools.isNullOrUndefined(account))return false;
    var self = this;
    this.posInfo.forEach(function (key, value) {
        try {
            if (value.account.toString() === account.toString()) {
                self.posInfo.remove(key);
            }
        } catch (e) {
        }
    });
    return true;
}

//Get a seat that's not your own
Room.prototype.getOtherSidePos = function (pos) {
    var nextPos = new Number(pos)+1;
    nextPos = nextPos>3?0:nextPos;

    var prePos = new Number(pos) -1;
    prePos = prePos<0?3:prePos;

    return [nextPos,prePos].sort();
}

//Get a free seat and return null if not
Room.prototype.getFreePos = function () {
    var freePos = null;
    for(var startPos = 0;startPos<this.posCount;startPos++){
        var posInfo = this.posInfo.getNotCreate(startPos);
        if(UnitTools.isNullOrUndefined(posInfo) || UnitTools.isNullOrUndefined(posInfo.account)){
            return startPos;
        }
    }
    return freePos;
}

Room.prototype.exchangePos = function (account) {
    //1. Judge whether the account is in the location, if not, return directly
    //2. Judge whether the opposite side is full. If it is full, return directly
    //3. Leave the current position and enter the opposite position
    var pos = this.getPos(account);
    if(UnitTools.isNullOrUndefined(pos))return {ok:false};
    var otherSidePos = this.getOtherSidePos(pos);

    for(var key in otherSidePos){
        var otherPos = otherSidePos[key];
        if(this.inPos(account,otherPos)){
            return {ok:true,info:{exchangeAccount:account,oldPos:pos,newPos:otherPos}};
        }
    }
    return {ok:false};
}

Room.prototype.posReady = function (pos, isReady) {
    if (!this.isPosValid(pos))return false;
    var posInfo = this.posInfo.getNotCreate(pos);
    if (UnitTools.isNullOrUndefined(posInfo))return false;
    posInfo.isReady = isReady;
    return true;
}


Room.prototype.isAllPosReady = function () {//Are all the positions ready
    var readyCounts = 0;
    this.posInfo.forEach(function (pos, info) {
        if (info.isReady === true)readyCounts += 1;
    });
    if (readyCounts === this.posCount)return true;
    return false;
}

Room.prototype.isPosReady = function (pos) {
    var info = this.posInfo.getNotCreate(pos);
    if (info.isReady === true)return true;
    return false;
}

Room.prototype.setAllPosReady = function (ready) {//Set all positions ready or not ready
    for(var pos = 0;pos<this.posCount;pos++){
        this.posReady(pos,ready);
    }
}

Room.prototype.getReadyInfo = function () {
    var readyInfo = {};
    this.posInfo.forEach(function (pos, info) {
        if (info.isReady === true) {
            readyInfo[pos] = true;
        }
    });
    return readyInfo;
}


Room.prototype.getInPosInfo = function () {
    var posInfo = {};
    this.posInfo.forEach(function (pos, info) {
        if(UnitTools.isNullOrUndefined(info.account))return;
        var one = posInfo[pos] = {};
        one.ready = this.isPosReady(pos);
        one.account = info.account;
    }.bind(this));
    return posInfo;
}

Room.prototype.getRoomInPosAccounts = function () {//Get accounts to sit down
    var accounts = [];
    this.posInfo.forEach(function (key, value) {
        if (UnitTools.isNullOrUndefined(value.account))return;
        accounts.push(value.account)
    });
    return accounts;
}

Room.prototype.getNotInPosAccounts = function () {//Get players who are not in their seats
    var inPosAccounts = [].concat(this.getRoomInPosAccounts());
    var allAccounts = [].concat(this.getInRoomAllAccounts());
    UnitTools.removeArray(allAccounts, inPosAccounts);
    return allAccounts;
}

Room.prototype.getInRoomAllAccounts = function () {
    return this.accounts.getKeys();
}

Room.prototype.logRoomInfo = function () {
    var roomInfo = {};
    roomInfo.roomID = this.roomID;
    roomInfo.accounts = [];
    this.accounts.forEach(function (key, value) {
        roomInfo.accounts.push(key);
    });
    roomInfo.posInfo = {};
    this.posInfo.forEach(function (key, value) {
        roomInfo.posInfo[key] = value;
    });
    roomInfo.posReadyInfo = this.posReadyInfo;
    console.log(roomInfo);
    return roomInfo;
}
module.exports = Room;

