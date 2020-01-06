"use strict";
cc._RF.push(module, '9b583t6y/dIrbnfq1UZMMCs', 'WsRpcClient');
// resources/resources/common/WsRpcClient.js

"use strict";

/**
 * Created by litengfei on 16/6/29.
 */
var WebSocket = WebSocket || window.WebSocket || window.MozWebSocket;
/**
 * Created by litengfei on 16/6/14.
 */
/**
 * Created by litengfei on 16/6/14.
 *
 */
var Buffer = require("buffer/").Buffer;
var UnitTools = require("UnitTools");
var EventEmitter = require("EventEmitter");
var MessagePack = require("msgpack-lite");
function WsRpcClient() {
    var self = this;
    this.client = null;
    this.url = null;
    this.rpc = {};
    this.proxy = {}; //clientProxy
    this.proxyDes = null;
    this.serverCb = {};
    this.isReady = false;
    this.readyCb = [];
    this.describe = null;
    this.events = new EventEmitter();
    this.cbTimeOut = 15000; //The default is 15 seconds, and then the callback function {OK: false} will be notified
    this.cbInterval = null;
    this.isReconnected = true;
    this.haveConnectd = false; //Already connected
    this.heartBeatInterval = null; //Heartbeat detection cycle
    this.enbleHeartBeat = true; //Whether to turn on heartbeat detection
}
//starServer
WsRpcClient.prototype.connect = function (url) {
    var self = this;
    this.url = url;
    this.client = new WebSocket(this.url);
    this.client.binaryType = "arraybuffer";
    this.client.onopen = function (evt) {
        self.sendDescribe(self.client);
        self.events.emit("onConnect", self);
    };
    this.client.onmessage = function (evt) {
        self.handleMessage(self.client, evt.data);
    };
    this.client.onclose = function (evt) {
        self.stopCbTimeOut();
        if (self.isReady == true) {
            self.events.emit("onClose", self);
        }
        setTimeout(function () {
            if (self.isReconnected == true) {
                self.connect(self.url);
            }
        }, 1000);
        self.clearSocket();
    };
    this.client.onerror = function (evt) {
        setTimeout(function () {
            if (self.isReconnected == true) {
                self.connect(self.url);
            }
        }, 1000);
        self.clearSocket();
    };
};

WsRpcClient.prototype.startConnectUntilConnected = function (url) {
    //Start connecting until the connection is successful, only effective when the first connection is made
    var self = this;
    this.url = url;
    this.client = new WebSocket(this.url);
    this.client.binaryType = "arraybuffer";
    this.client.onopen = function (evt) {
        self.sendDescribe(self.client);
        self.events.emit("onConnect", self);
    };
    this.client.onmessage = function (evt) {
        self.handleMessage(self.client, evt.data);
    };
    this.client.onclose = function (evt) {
        self.stopCbTimeOut();
        if (self.isReady == true) {
            //If you just started connecting
            self.events.emit("onClose", self);
            self.isReady = false;
        }
        setTimeout(function () {
            if (self.haveConnectd == false) {
                self.startConnectUntilConnected(self.url);
            }
        }, 8000);
        self.clearSocket();
    };
    this.client.onerror = function (evt) {
        setTimeout(function () {
            if (self.haveConnectd == false) {
                self.startConnectUntilConnected(self.url);
            }
        }, 8000);
        self.clearSocket();
    };
};

WsRpcClient.prototype.startHeartCheck = function () {
    var self = this;
    this.heartBeatInterval = setInterval(function () {
        if (self.haveConnectd == false) return;
        if (self.isReady == false) return; //If isready is false, the connection has just started or has been disconnected
        self.onReady(function (client) {
            //Send heartbeat package
            client.proxy.heartBeat(function (data) {
                if (!data.ok) {
                    cc.log("No heartbeat package! Decision disconnection");
                    clearInterval(self.heartBeatInterval);
                    self.clearSocket();
                    self.isReady = false;
                    //Send disconnect event
                    self.connect(self.url);
                    self.events.emit("onClose", self);
                }
            });
        });
    }, 11000);
};

WsRpcClient.prototype.clearSocket = function () {
    if (!this.client) return;
    this.client.onopen = null;
    this.client.onmessage = null;
    this.client.onclose = null;
    this.client.onerror = null;
    this.client.close();
    this.client = null;
    clearInterval(this.heartBeatInterval);
};

WsRpcClient.prototype.close = function () {
    this.client.close();
};
//Get a list of functions that can be called
WsRpcClient.prototype.getDescribeList = function () {
    if (this.describe == null) this.describe = {};else {
        return this.describe;
    }
    var self = this;
    UnitTools.forEach(this.rpc, function (key, value) {
        self.describe[key] = { args: value.length - 1 }; //length-1 not need the cb arg
    });
    return this.describe;
};
WsRpcClient.prototype.getServerFuncArgNum = function (an) {
    return this.proxyDes[an].args;
};

WsRpcClient.prototype.addRpc = function (rpcJson) {
    var self = this;
    if (UnitTools.isJson(rpcJson)) {
        UnitTools.forEach(rpcJson, function (funcName, func) {
            self.rpc[funcName] = func;
        });
    } else {
        throw new Error("addRpc the arg must be a json");
    }
};

WsRpcClient.prototype.handleDescribe = function (client, data) {
    var self = this;
    var des = data.des;
    this.proxyDes = des;
    UnitTools.forEach(des, function (key, value) {
        self.proxy[key] = self.runServerAction.bind(self, key);
    });
    this.startCbTimeOut();
    this.isReady = true;
    this.haveConnectd = true;
    if (this.enbleHeartBeat) {
        cc.log("It turns on the heartbeat");
        this.startHeartCheck(); //Heartbeat detection
    }
    this.events.emit("onReady", this);
    this.events.removeEvent("onReady");
};
//handle the client message
WsRpcClient.prototype.handleMessage = function (client, message) {
    var data = this.parseDataToJson(message);
    var type = data.type;
    switch (type) {
        case 1:
            //describe
            this.handleDescribe(client, data.data);
            break;
        case 2:
            //call function
            this.runActionWithRawMessage(client, data.data);
            break;
        case 3:
            //callback
            this.handleCb(client, data.data);
            break;
    }
};

WsRpcClient.prototype.handleCb = function (client, data) {
    var cbID = data.cbID;
    var cbData = data.cbData;
    if (UnitTools.hasKey(this.serverCb, cbID)) {
        try {
            this.serverCb[cbID].cb(cbData);
            UnitTools.remove(this.serverCb, cbID); //delete call back
        } catch (e) {
            cc.log(e.stack);
            UnitTools.remove(this.serverCb, cbID); //delete call back
        }
    }
};
//handle the client close
WsRpcClient.prototype.handleClientClose = function (client) {};

WsRpcClient.prototype.sendRawData = function (client, data) {
    client.send(this.jsonDataToSend(data));
};

WsRpcClient.prototype.sendActionData = function (client, rawData) {
    var sendData = {};
    sendData.type = 2;
    sendData.data = rawData;
    this.sendRawData(client, sendData);
};

//tell client the callbackData
WsRpcClient.prototype.sendCallbackData = function (client, rawData, callbackID) {
    var sendData = {};
    sendData.type = 3;
    sendData.data = {};
    sendData.data.cbData = rawData;
    sendData.data.cbID = callbackID;
    this.sendRawData(client, sendData);
};
//tell client the describe
WsRpcClient.prototype.sendDescribe = function (client) {
    var names = this.getDescribeList();
    var sendData = {};
    sendData.type = 1;
    sendData.data = { des: names };
    this.sendRawData(client, sendData);
};

WsRpcClient.prototype.runActionWithRawMessage = function (client, data) {
    var an = data.an;
    var args = data.args;
    var callbackID = data.cbID;
    this.runAction(client, an, args, callbackID);
};
//run the function on server
WsRpcClient.prototype.runAction = function (client, actionName, args, callbackID) {
    var self = this;
    if (UnitTools.hasKey(this.rpc, actionName) == false) {
        throw new Error("server call function " + actionName + " is not defined");
    }
    args.push(function (cbData) {
        //tell the client cb Data
        if (callbackID == 0) return; //cbID is 0 means no client no callback
        self.sendCallbackData(client, cbData, callbackID);
    });
    this.rpc[actionName].apply(this, args);
};

//run client action first arg is bind to actionName  last is to be callback
WsRpcClient.prototype.runServerAction = function (an) {
    var length = arguments.length;
    var cb = arguments[length - 1];
    var cbID = UnitTools.isFunction(cb) ? UnitTools.genID() : 0;
    if (cbID == 0 && !this.checkRunActionArgNums(an, length - 1)) {
        cc.log("server func " + "no callback need " + this.getServerFuncArgNum(an) + " args");
        return;
    } else if (cbID != 0 && !this.checkRunActionArgNums(an, length - 2)) {
        cc.log("server func " + an + " need " + this.getServerFuncArgNum(an) + " args");
        return;
    }
    var sendData = {};
    var cb = arguments[length - 1];
    sendData.cbID = cbID;
    sendData.args = Array.prototype.slice.call(arguments, 1, length - 1 + !cbID);
    sendData.an = arguments[0];
    if (sendData.cbID != 0) {
        this.serverCb[sendData.cbID] = { cb: cb, time: UnitTools.now() };
    }
    this.sendActionData(this.client, sendData);
};

WsRpcClient.prototype.parseDataToJson = function (str) {

    var unit8Array = Buffer.from(str);
    return MessagePack.decode(unit8Array);
    //return JSON.parse(str);
};

WsRpcClient.prototype.jsonDataToSend = function (data) {
    return MessagePack.encode(data);
    //return JSON.stringify(data);
};

WsRpcClient.prototype.checkRunActionArgNums = function (an, argNums) {
    if (this.proxyDes[an].args != argNums) return false;
    return true;
};

//Return whether to connect
WsRpcClient.prototype.onReady = function (callback) {
    if (this.isReady == false || this.client.readyState != 1) {
        this.isReady = false;
        this.events.on("onReady", callback);
        return;
    } else {
        callback(this);
    }
};

WsRpcClient.prototype.onReadyState = function (cb) {
    if (this.isReady == false || this.client.readyState != 1) {
        cb(false);
    } else {
        cb(true);
    }
};

WsRpcClient.prototype.off = function (callback) {
    this.events.remove(callback);
};

WsRpcClient.prototype.onConnect = function (callback) {
    this.events.on("onConnect", callback);
};

WsRpcClient.prototype.onClose = function (callback) {
    this.events.on("onClose", callback);
};

WsRpcClient.prototype.startCbTimeOut = function () {
    var self = this;
    this.cbInterval = setInterval(function () {
        var rmA = [];
        UnitTools.forEach(self.serverCb, function (key, value) {
            if (UnitTools.isTimeOut(value.time, self.cbTimeOut)) {
                rmA.push(key);
            }
        });
        if (rmA.length == 0) return;
        UnitTools.forEach(rmA, function (key, value) {
            try {
                self.serverCb[value].cb({ ok: false });
                cc.log("Call timeout!");
            } catch (e) {}
            UnitTools.remove(self.serverCb, value);
        });
    }, this.cbTimeOut);
};

WsRpcClient.prototype.stopCbTimeOut = function () {
    //All functions waiting for a callback are notified as false because they are disconnected
    UnitTools.forEach(this.serverCb, function (key, value) {
        try {
            value.cb({ ok: false });
            cc.log("Connection closed, but not yet called!");
        } catch (e) {}
    });
    clearInterval(this.cbInterval);
};
module.exports = WsRpcClient;

cc._RF.pop();