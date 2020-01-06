var UnitTools = require('UnitTools');
var Config = require('Config');
var NetWorkManager = require('NetWorkManager');
var Users = require('Users');
class LoginManager{
    static testLogin(account,pass){
        UnitTools.request(Config.testLoginUrl,{account:account,pass:pass},function (err,data) {
            if(err){
                cc.log("Login exception!!!");
                cc.log(data);
                return;
            }
            data = JSON.parse(data);
            if(data.ok==true && data.suc==true){
                Users.hallUrl = "ws://"+data.hallUrl;
                NetWorkManager.connectAndAuthToHall(data.account,data.pass,"ws://"+data.hallUrl);
                NetWorkManager.onConnectedToHall(function () {
                    cc.log('ceshissss'+Users.loginToHallData.isInGame);
                    if(Users.loginToHallData.isInGame){//Jump to the game interface
                        NetWorkManager.connectAndAuthToGame(Users.account,Users.pass,Users.loginToHallData.gameUrl);
                        NetWorkManager.onConnectedToGame(function () {
                            var loginData = Users.loginToGameData;
                            if(loginData.isInGame){
                                cc.director.loadScene("game");
                            }else{
                                NetWorkManager.clearGameService();
                            }
                        })
                    }else{
                        cc.director.loadScene("hall");
                    }
                });
            }else if(data.ok==true && data.suc==false){
                alert('Wrong password, please re-enter');
            }else if(data.ok==false && data.suc==false){
                alert('User does not exist, please register first');
            }
            
        },5000);
    }
}
LoginManager.account=null;
LoginManager.pass = null;
LoginManager.nickName = "";
LoginManager.headUrl = "";
LoginManager.fangka = null;
module.exports = LoginManager;