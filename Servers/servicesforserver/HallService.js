var app = require("./../core/app.js").instance;
var UnitTools = require("./../core/UnitTools.js");
var DataBaseManager = require("./../Theme/FangkaMajiang/db/DataBaseManager.js");
var PlayerManager = require("./../model/PlayerManager.js");
var Config = require('./../core/Config.js');
var Codes = require('./../app/share/Codes.js');
var Maps = require('./../core/Map.js');
DataBaseManager.instance().initDBFromServerConfig();
var safeCode = Config.getServerConfig()["safeCode"]
module.exports = function () {
    var playerManager = new PlayerManager();

    var idWithGmUrl = new Maps();

    var onStart = function (serverID, serviceType, serverIP, serverPort, custom) {

    }

    var onClientIn = function (session) {

    }

    var onClientOut = function (session) {
        if(!playerManager.hasPlayer(session.playerId)){
            return;
        }
       if(session == playerManager.getSession(session.playerId)){
            playerManager.setIsLogin(session.playerId,false); 
       }
    }

    var checkAndClearPlayerState = async function (playerId,gameUrl) {
        //code 1 means playing, 2 means not playing
        var service = app.getServiceWithServerPort(gameUrl);
        var result = await service.runProxy.isPlayerInGame(playerId,safeCode);
        
        if(result.ok && result.suc){
            if(result.code == 1){
                return 1;
            }else if(result.code==2){
                //Indicates not in the game, clear the game service address
                playerManager.setGameUrl(playerId,null);
                return 2;
            }
        }

    }

    var service = {};
    service.login = async function (account,pass,cb) {
        if(UnitTools.isNullOrUndefined(account) || UnitTools.isNullOrUndefined(pass)){
            cb({ok:false});
            return;
        }

        var infos = await DataBaseManager.instance().canLogin(account,pass);
        if(infos === null){
            cb({ok:true,suc:false});
            return;
        }
        playerManager.setIsLogin(infos.id,true);
        cb.session.playerId = infos.id;
        var gameUrl = playerManager.getGameUrl(infos.id);
        console.log("PLAYERID: "+infos.id);
        console.log("GAMEURL: "+gameUrl);
        if(gameUrl){
            var checkCode = await checkAndClearPlayerState(infos.id,gameUrl);
            if(checkCode==1){
                infos.isInGame = true;
                infos.gameUrl = gameUrl;
            }
        }
        cb({ok:true,suc:true,info:infos});
    }

    service.getPlayerBaseInfo = async function(cb){
        var playerId = cb.session.playerId;
        var isLogin = playerManager.getIsLogin(playerId);
        if(!isLogin){
            cb({ok:false});
            return;
        }
        var infos = await DataBaseManager.instance().finPlayerWithId(playerId,{id:1,nickName:1,score:1,headimgUrl:1});
        if(infos === null){
            cb({ok:true,suc:false});
            return;
        }
        cb({ok:true,suc:true,info:infos});
    }

    service.createRoom = async function(roomInfo,cb){
        var playerId = cb.session.playerId;
        var isLogin = playerManager.getIsLogin(playerId);
        if(!isLogin){
            cb({ok:false});
            return;
        }
        var oldUrl = playerManager.getGameUrl(playerId);
        if(oldUrl){
            cb({ok:true,suc:true,url:oldUrl});
            return;
        }
        var gameService = app.getRandomService("Tuidaohu");
        var gameUrl = "ws://"+gameService.ip+":"+gameService.port;
        var idService = app.getServiceWithServerID("IdService1");
        var newId = await idService.runProxy.getTableId(gameUrl,safeCode);
        
        console.log("HallService->createRoom->newId:%s",newId.tableId);
        
        if(!newId.ok){
            cb({ok:true,suc:false,info:"Failed to create, please try again!!!"});
            return;
        }


        //idWithGmUrl.setKeyValue(newId.tableId,gameUrl);

        playerManager.setGameUrl(playerId,gameUrl);

        var createTable = await gameService.runProxy.createTable(playerId,newId.tableId,roomInfo,safeCode);
        console.log('table%o',createTable);
        cb({ok:true,suc:true,url:gameUrl,roomId:newId.tableId});
    }

    service.joinTable = async function (tableId,cb) {
        var playerId = cb.session.playerId;
        if(!playerManager.getIsLogin(playerId)){
            cb({ok:true,suc:false,codes:Codes.Player_Not_Login});
            return;
        }
        var gameUrl = playerManager.getGameUrl(playerId)
        if(gameUrl){
            cb({ok:true,suc:true,gameUrl:gameUrl});
            return;
        }
        var idService = app.getServiceWithServerID("IdService1");
        var urlInfo = await idService.runProxy.getTabGameUrl(tableId,safeCode); //idWithGmUrl.getNotCreate(tableId);
        if(!urlInfo.gameUrl){
            cb({ok:true,suc:false,codes:Codes.Game_Not_Exsit});
            return;
        }
        var gameService = app.getServiceWithServerPort(urlInfo.gameUrl);

        var res = await gameService.runProxy.joinTable(tableId,playerId,safeCode);

        if(res.ok && res.suc){
            playerManager.setGameUrl(playerId,urlInfo.gameUrl)
            cb({ok:true,suc:true,gameUrl:urlInfo.gameUrl});
            return;
        }
        cb(res);
    }

    return {
        service: service, onClientIn: onClientIn, onClientOut: onClientOut, onStart: onStart
    };
}