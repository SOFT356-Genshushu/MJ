
var Map = require("./../core/Map.js");
class PlayerManager{
    constructor(){
        this.playerInfos = new Map();//isLogin
        this.onLineNums = 0;
    }

    /* *
    *Get or create player ID
    * @param playerID
    *@ return returns the basic information of the player
    */
    getOrCreatePlayer(playerID){
        return this.playerInfos.getOrCreate(playerID);
    }
    /* *
    *Number of people getting online, that is, number of people logging in
    */
    getOnlineNums(){
        return this.onLineNums;
    }

/* *
*Set login status
* @param playerID
* @param isLogin
*/
    setIsLogin(playerID,isLogin){
        var info = this.getOrCreatePlayer(playerID);
        if(isLogin == true && info.isLogin == false)this.onLineNums+=1;
        if(isLogin == false && info.isLogin == true && this.onLineNums > 0)this.onLineNums-=1;
        info.isLogin = isLogin;
    }

    /**
     * Get login status
     * @param playerID
     */
    getIsLogin(playerID){
        return this.getOrCreatePlayer(playerID).isLogin;
    }

    setNickName(playerId,nickName){
        var info = this.getOrCreatePlayer(playerId);
        info.nickName = nickName;
    }

    getNickName(playerId){
        var info = this.getOrCreatePlayer(playerId);
        return info.nickName;
    }

    setHeadUrl(playerId,url){
        var info = this.getOrCreatePlayer(playerId);
        info.headUrl = url;
    }

    getHeadUrl(playerId){
        var info = this.getOrCreatePlayer(playerId);
        return info.headUrl;
    }


    setSession(playerId,session){
        var info = this.getOrCreatePlayer(playerId);
        info.session = session;
    }

    getSession(playerId){
        return this.getOrCreatePlayer(playerId).session;
    }

    setGameUrl(playerId,gameUrl){
        var info = this.getOrCreatePlayer(playerId);
        info.gameUrl = gameUrl;
    }

    getGameUrl(playerId){
        return this.getOrCreatePlayer(playerId).gameUrl;
    }

    setTableId(playerId,tableId){
        var info = this.getOrCreatePlayer(playerId);
        info.tableId = tableId;
    }

    getTableId(playerId){
        return this.getOrCreatePlayer(playerId).tableId;
    }

    setPos(playerId,pos){
        var info = this.getOrCreatePlayer(playerId);
        info.pos = pos;
    }

    getPos(playerId){
        return this.getOrCreatePlayer(playerId).pos;
    }

    hasPlayer(playerId){
        return this.playerInfos.hasKey(playerId);
    }

    /**
     * Set account and password
     * @param playerID
     * @param account
     * @param pass
     */
    setAccountAndPass(playerID,account,pass){
        var info = this.getOrCreatePlayer(playerID);
        info.account = account;
        info.pass = pass;
    }

    /**
     * Players enter the table
     * @param hallID
     * @param tableID
     * @param pos
     * @return If entry is successful, return to position
     */
    enterTable(playerID,hallID,tableID,pos){

    }

    /**
     * Players leave the table
     * @param playerID
     * @return Leave success return true leave failure return false
     */
    leaveTable(playerID){

    }


    /**
     * Is it in the table
     * @param playerID
     */
    isInTable(playerID){

    }

    /**
     * Get information about your desk
     * @param playerID
     * @return {hallID,tableID,pos}
     */
    getTalbeInfo(playerID){

    }



}
module.exports = PlayerManager;