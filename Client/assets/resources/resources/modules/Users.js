/**
 * Created by litengfei on 2018/1/28.
 */
class User{

}
User.playerId = null;
User.account = null;//account
User.pass = null;//password
User.nickName = "";//name
User.headUrl = "";//head image address
User.fangka = null;//score
User.sex = null;//gender
User.pos = null;//position in table
User.hallUrl = null;
User.loginToGameData = null;//Data logged in to the game server
User.loginToHallData = null;//Data logged in to the hall server
User.Score = [];

User.isSelfPos = function (pos) {
    if(User.pos == pos)return true;
    return false;
}

User.isSelfPId = function (playerId) {
    if(User.playerId == playerId)return true;
    return false;
}
module.exports = User;