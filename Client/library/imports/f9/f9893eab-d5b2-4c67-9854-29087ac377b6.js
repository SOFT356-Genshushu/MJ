"use strict";
cc._RF.push(module, 'f98936r1bJMZ5hUKQh6w3e2', 'AutoReconnectWsRpcClient');
// resources/resources/common/AutoReconnectWsRpcClient.js

"use strict";

/**
 * Created by litengfei on 16/12/7.
 */
var WsRpcClient = require("WsRpcClient");
var EventEmitter = require("EventEmitter");
//auto connect WsRpcClient
function AutoReconnectWsRpcClient() {
    var self = this;
    this.client = new WsRpcClient();
    this.client.enbleHeartBeat = false;
    this.events = new EventEmitter();
    this.isReady = false;
    this.proxy = null;
    this.rpcService = null;
    this.url = null;

    //Add events to switch back from outside
    if (cc && cc.eventManager) {
        cc.eventManager.addCustomListener(cc.game.EVENT_SHOW, function () {
            setTimeout(function () {
                self.checkHeartBeatAndReconnect(1000);
            }.bind(self), 50);
        }.bind(this));
    }
}

AutoReconnectWsRpcClient.prototype.connect = function (url) {
    if (this.client != null) {
        try {
            this.client.clearSocket(); //Clear network events
        } catch (e) {}
    }
    this.url = url;
    this.client.enbleHeartBeat = false;
    this.client.isReconnected = false;
    this.client.addRpc(this.rpcService);
    this.client.startConnectUntilConnected(url);
    this.client.onClose(function (client) {
        this.isReady = false;
        this.proxy = null;
        this.events.emit("onClose", client);
        this.client = new WsRpcClient();
        this.client.enbleHeartBeat = false;
        this.client.isReconnected = false;
        this.stopCheckHeartBeart(); //Stop heartbeat detection
        this.connect(this.url);
    }.bind(this));
    this.client.onReady(function () {
        this.startCheckHeartBeat(); //Start heartbeat detection
        this.isReady = true;
        this.proxy = this.client.proxy;
        this.events.emit("onReady", this.client);
        this.events.removeEvent("onReady");
    }.bind(this));
};

AutoReconnectWsRpcClient.prototype.startCheckHeartBeat = function () {
    var self = this;
    this.heartBeatInterVal = setInterval(function () {
        self.checkHeartBeatAndReconnect(10000);
    }, 11000);
};

AutoReconnectWsRpcClient.prototype.stopCheckHeartBeart = function () {
    clearInterval(this.heartBeatInterVal);
};

AutoReconnectWsRpcClient.prototype.checkHeartBeatAndReconnect = function (timeOut) {
    cc.log("Enter the start detection stage");
    var self = this;
    var isConnected = false;
    self.client.onReady(function () {
        self.client.proxy.heartBeat(function (data) {
            if (data.ok) isConnected = true;
        });
    });
    setTimeout(function () {
        if (isConnected == false && self.isReady == true) {
            self.isReady = false;
            //Send disconnect event
            self.proxy = null;
            self.stopCheckHeartBeart();
            self.client.clearSocket();
            self.events.emit("onClose", self.client);
            self.client = new WsRpcClient();
            self.connect(self.url);
        }
    }, timeOut);
};

AutoReconnectWsRpcClient.prototype.addRpc = function (service) {
    this.rpcService = service;
};

AutoReconnectWsRpcClient.prototype.onReady = function (cb) {
    if (this.isReady) {
        this.client.onReady(cb);
    } else {
        this.events.on("onReady", cb);
    }
};
AutoReconnectWsRpcClient.prototype.onReadyState = function (cb) {
    this.client.onReadyState(cb);
};

AutoReconnectWsRpcClient.prototype.onClose = function (cb) {
    //Reconnect
    this.events.on("onClose", cb);
};

AutoReconnectWsRpcClient.prototype.close = function () {
    this.client.close();
};

AutoReconnectWsRpcClient.prototype.off = function (cb) {
    this.events.remove(cb);
};

AutoReconnectWsRpcClient.prototype.clear = function () {
    this.events = null;
    if (this.client) {
        this.client.clearSocket();
    }
};

module.exports = AutoReconnectWsRpcClient;

cc._RF.pop();