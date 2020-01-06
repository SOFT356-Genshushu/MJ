(function() {"use strict";var __module = CC_EDITOR ? module : {exports:{}};var __filename = 'preview-scripts/assets/resources/resources/scriptes/Hall.js';var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} : function (request) {return cc.require(request, __filename);};function __define (exports, require, module) {"use strict";
cc._RF.push(module, '035fb6bSbtAcbGbHHgQO4Mr', 'Hall', __filename);
// resources/resources/scriptes/Hall.js

"use strict";

// Learn cc.Class:
//  - [Chinese] http://www.cocos.com/docs/creator/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/editors_and_tools/creator-chapters/scripting/class/index.html
// Learn Attribute:
//  - [Chinese] http://www.cocos.com/docs/creator/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/editors_and_tools/creator-chapters/scripting/reference/attributes/index.html
// Learn life-cycle callbacks:
//  - [Chinese] http://www.cocos.com/docs/creator/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/editors_and_tools/creator-chapters/scripting/life-cycle-callbacks/index.html

var NetWorkManager = require("NetWorkManager");
var CreatorHelper = require("CreatorHelper");
var Users = require("Users");
cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //     // ATTRIBUTES:
        //     default: null,        // The default value will be used only when the component attaching
        //                           // to a node for the first time
        //     type: cc.SpriteFrame, // optional, default is typeof default
        //     serializable: true,   // optional, default is true
        // },
        // bar: {
        //     get () {
        //         return this._bar;
        //     },
        //     set (value) {
        //         this._bar = value;
        //     }
        // },
        headSprite: cc.Sprite, //Head picture
        playerName: cc.Label, //Player name
        playerId: cc.Label, //player id
        fangkaNum: cc.Label, //score
        createRoomBn: cc.Node, //Create room button
        enterRoomBn: cc.Node, //Add room button
        createConfirm: cc.Node,
        juNumGroup: cc.Node,
        waitingPfb: cc.Prefab

    },

    // LIFE-CYCLE CALLBACKS:

    onLoad: function onLoad() {
        var self = this;
        CreatorHelper.setNodeClickEvent(this.createConfirm, function () {
            var custom = {};
            for (var idx in self.juNumGroup.children) {
                var toggle = self.juNumGroup.children[idx].getComponent(cc.Toggle);
                if (toggle.isChecked) {
                    custom.juNum = parseInt(toggle.node.name);
                    break;
                }
            }

            NetWorkManager.onConnectedToHall(function (hallService) {
                hallService.proxy.createRoom(custom, function (data) {
                    if (data.ok && data.suc) {
                        cc.log('RoomID: %o', data.roomId);
                        cc.log('Data: %o', data);
                        NetWorkManager.connectAndAuthToGame(Users.account, Users.pass, data.url);
                        NetWorkManager.onConnectedToGame(function () {
                            var loginData = Users.loginToGameData;
                            if (loginData.isInGame) {
                                cc.director.loadScene("game");
                            } else {
                                NetWorkManager.clearGameService();
                            }
                        });
                    } else {}
                });
            });
        });
        //-------------------------------Joining house price--------------------------------------------------
        var self = this;
        this.clickCount = 0;
        var clearInput = function clearInput() {
            for (var num = 0; num <= 5; num++) {
                var numUi = cc.find(num.toString(), self.shownumUi);
                var numLab = cc.find("txt", numUi).getComponent(cc.Label);
                numLab.string = "";
            }
            self.clickCount = 0;
        };
        this.shownumUi = cc.find("joinroot/joinbg/shownums", this.node);
        CreatorHelper.setNodeClickEvent(this.enterRoomBn, function () {
            clearInput();
        });
        this.inputnumUi = cc.find("joinroot/joinbg/inputnums", this.node);
        for (var num = 0; num <= 9; num++) {
            var numUi = cc.find(num.toString(), this.inputnumUi);
            CreatorHelper.setNodeClickEvent(numUi, function (evt) {
                if (self.clickCount < 6) {
                    var clickNum = evt.name;
                    var numUi = cc.find(self.clickCount.toString(), self.shownumUi);
                    var numLab = cc.find("txt", numUi).getComponent(cc.Label);
                    numLab.string = clickNum;
                    self.clickCount++;
                } else {
                    if (self.clickCount === 6) {
                        var tabNumStr = "";
                        for (var idx = 0; idx <= 5; idx++) {
                            var numUi = cc.find(idx.toString(), self.shownumUi);
                            var numLab = cc.find("txt", numUi).getComponent(cc.Label);
                            tabNumStr += numLab.string;
                        }
                        cc.log(tabNumStr);
                        self.joinTable(tabNumStr);
                    }
                }
            });
        }
        var reinputUi = cc.find("reinput", this.inputnumUi);
        var deleteUi = cc.find("delete", this.inputnumUi);
        CreatorHelper.setNodeClickEvent(reinputUi, function (evt) {
            clearInput();
        });
        CreatorHelper.setNodeClickEvent(deleteUi, function (evt) {
            if (self.clickCount == 0) return;
            self.clickCount--;
            var numUi = cc.find(self.clickCount.toString(), self.shownumUi);
            var numlab = cc.find("txt", numUi).getComponent(cc.Label);
            numlab.string = '';
        });
        //------------------------daunxianjiemian 
        this.onClose = function () {
            var bg = cc.instantiate(this.waitingPfb);
            this.node.addChild(bg);
            NetWorkManager.onConnectedToHall(function () {
                bg.removeFromParent(true);
            });
        };
        NetWorkManager.onClosedFromHall(this.onClose.bind(this));
    },
    joinTable: function joinTable(tableId) {
        NetWorkManager.onConnectedToHall(function (hallService) {
            hallService.proxy.joinTable(tableId, function (data) {
                if (data.ok && data.suc) {
                    NetWorkManager.connectAndAuthToGame(Users.account, Users.pass, data.gameUrl);
                    NetWorkManager.onConnectedToGame(function () {
                        var loginData = Users.loginToGameData;
                        //var loginDataInfo = JSON.stringify(loginData);
                        //cc.log("loginData: "+loginDataInfo.inRoomInfo);
                        if (loginData.isInGame) {
                            cc.director.loadScene("game");
                            cc.log(data.gameUrl);
                            //NetWorkManager.offClosedFromHall(this.onClose.bind(this));
                            //NetWorkManager.clearHallService();
                        } else {
                            NetWorkManager.clearGameService();
                        }
                    });
                } else {
                    alert('Failed to join room');
                }
            });
        });
    },
    start: function start() {
        var self = this;
        NetWorkManager.onConnectedToHall(function (hallService) {
            hallService.proxy.getPlayerBaseInfo(function (data) {
                if (data.ok && data.suc) {
                    //Information obtained successfully
                    var baseInfo = data.info;
                    self.playerName.string = baseInfo.nickName;
                    self.playerId.string = baseInfo.id;
                    self.fangkaNum.string = baseInfo.score;
                    /*var frame = new cc.SpriteFrame();
                    frame.setTexture(baseInfo.headimgUrl);
                    self.headSprite.spriteFrame = frame;*/
                    var headimgurl = baseInfo.headimgUrl;
                    //head image
                    CreatorHelper.changeSpriteFrameWithServerUrl(self.headSprite, headimgurl);
                } else {
                    //Failed to get information, prompt user
                    alert('Failed to get user information');
                }
            });
        });
    }
}
// update (dt) {},
);

cc._RF.pop();
        }
        if (CC_EDITOR) {
            __define(__module.exports, __require, __module);
        }
        else {
            cc.registerModuleFunc(__filename, function () {
                __define(__module.exports, __require, __module);
            });
        }
        })();
        //# sourceMappingURL=Hall.js.map
        