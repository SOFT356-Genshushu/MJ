
/**
 * Created by litengfei on 2017/1/8.
 */
var app = require("./../core/app.js").instance;
var Ids = require('./../core/IDs.js');
var Config = require('./../core/Config.js');
var idGenerater = new Ids();
idGenerater.initFromTableIdConfig();

var safeCode = Config.getServerConfig()["safeCode"]
var idWithGmUrl ={};
module.exports = function () {
    var onStart = function (serverID, serviceType, serverIP, serverPort, custom) {

    }

    var onClientIn = function (session) {

    }

    var onClientOut = function (session) {
    }

    var tabIds = [];//Recovered ID
    var usingTabIds = [];//Recycling ID in use
    var service = {};

    service.getTableId = async function (gameUrl,serverCode,cb) {
        if(safeCode!== serverCode){
            cb({ok:false});
            return;
        }
        var newId = null;
        if(usingTabIds.length!=0){
            newId = usingTabIds.shift();//Gets the value of the first element of the array and deletes it
        }else{
            newId = await idGenerater.getTableId();
        }
        idWithGmUrl[newId] = gameUrl;
        cb({ok:true,suc:true,tableId:newId});
    }
    service.getTabGameUrl = function (tabId,serverCode,cb) {
        cb({ok:true,suc:true,gameUrl:idWithGmUrl[tabId]});
    }

    service.recoverTabId = function (tabId,cb) {
        if(tabIds.indexOf(tabId)==-1)tabIds.push(tabId);
        if(tabIds.length>=100000 && usingTabIds.length==0){
            usingTabIds = tabIds;
            tabIds = [];
        }
        console.log('the room number for recycling is as follows：');
        console.log(tabIds);
        cb({ok:true,suc:true});
    }

    return {
        service: service, onClientIn: onClientIn, onClientOut: onClientOut, onStart: onStart
    };
}