var User = require('Users');
var Majiang = require('Chess').Majiang;
class Handler{
    constructor(){
        this.logicCom = null;//Game components
        this.eventQueue = [];//Message queue
    }
    static instance(){
        if(Handler.g==null)Handler.g = new Handler();
        return Handler.g;
    }

    handleinPos(data){
        var scrPos = this.logicCom.getScreenPos(User.pos,data.pos)
        this.logicCom.showHead(data.playerId,scrPos,data.headimgUrl,data.nickName);
    } 
    handlestartCards(data){
        
        var cardIndexs = data.cardIndexs;
        for(var i=0;i<13;i++){
            var cardIndex = cardIndexs[i];
            var cardUi = this.logicCom.creatHandCardsUi(2,cardIndex);
            var pos = this.logicCom.handCardsPos[2][i];
            cardUi.x = pos.x;
            cardUi.y=pos.y;
            this.logicCom.handCardsUi.addChild(cardUi);
            var tIndex = Majiang.tIndex(cardIndex);
            this.logicCom.selfHandCard[tIndex][''+cardIndex]={ui:cardUi};
            this.logicCom.bindCardEvt(cardIndex,cardUi);

            var cardUi = this.logicCom.creatHandCardsUi(0,cardIndex);
            var pos = this.logicCom.handCardsPos[0][i];
            cardUi.x = pos.x;
            cardUi.y=pos.y;
            this.logicCom.handCardsUi.addChild(cardUi);

            this.logicCom.handCards[0][i] = {ui:cardUi,cardIndex:cardIndex};

            var cardUi = this.logicCom.creatHandCardsUi(1,cardIndex);
            var pos = this.logicCom.handCardsPos[1][i];
            cardUi.x = pos.x;
            cardUi.y=pos.y;
            this.logicCom.handCardsUi.addChild(cardUi);
            this.logicCom.handCards[1][i] = {ui:cardUi,cardIndex:cardIndex};

            var cardUi = this.logicCom.creatHandCardsUi(3,cardIndex);
            var pos = this.logicCom.handCardsPos[3][i];
            cardUi.x = pos.x;
            cardUi.y=pos.y;
            cardUi.zIndex = 14-i;
            //this.logicCom.node.zIndex = i;
            this.logicCom.handCardsUi.addChild(cardUi);
            this.logicCom.handCards[3][i] = {ui:cardUi,cardIndex:cardIndex};
        }
        this.logicCom.adjustSelfHandCard();
    }

    handletouchCard(data){
        var pos = data.pos;
        var cardIndex_s = data.cardIndex_s;
        var scrPos = this.logicCom.getScreenPos(User.pos,pos);
        var type = User.pos ==pos?1:2;
        this.logicCom.turn(scrPos);
        this.logicCom.touchCard(scrPos,cardIndex_s,type);
        cc.log('Trigger touch');
    }
    handletoHitCard(data){
        var pos = data.pos;
        var scrPos = this.logicCom.getScreenPos(User.pos,pos);
        this.logicCom.turn(scrPos);
        this.logicCom.actionId = data.actionId;
    }
    handlehitCard(data){
        var pos = data.pos;
        var cardIndex = data.cardIndex;
        var scrPos = this.logicCom.getScreenPos(User.pos,pos);
        var type = User.pos ==pos?1:2;
        this.logicCom.hitCard(scrPos,cardIndex,type);
    }
    handletoWaitAction(data){
        this.logicCom.actionId = data.actionId;
        this.logicCom.showActionSelectUi(data.action);
    }
    handledoAction(data){
        this.logicCom.handledoAction(data);
    }
    handlehu(data){
        if(data.finished)this.logicCom.raceScore = data.shareScore
        this.logicCom.handlehu(data);
        cc.log('hu');
    }
    handleshareScore(data){//Settlement page
        this.logicCom.showFinalScore(data.posScores,data.posNames);
    }
}
module.exports = Handler;
Handler.g=null;

Handler.service = {};
Handler.service.inPos = function (data,cb) {
    cc.log("Receive server information: inpos");
    cc.log(data);
    Handler.instance().eventQueue.push({eventName:'inPos',data:data});
    //Handler.instance().handlerinPos(data);
}

Handler.service.startCards = function (data,cb) {
    cc.log('Received the opening message: %o',data);
    Handler.instance().eventQueue.push({eventName:'startCards',data:data});
    //Handler.instance().handlestartCards(data);
}

Handler.service.touchCard = function (data,cb) {
    cc.log('Received touch message: %o',data);
    Handler.instance().eventQueue.push({eventName:'touchCard',data:data});
    //Handler.instance().handlestartCards(data);
}

Handler.service.toHitCard = function (data,cb) {
    cc.log('Received a message about whose turn it was to play: %o',data);
    Handler.instance().eventQueue.push({eventName:'toHitCard',data:data});
    //Handler.instance().handlestartCards(data);
}

Handler.service.hitCard = function (data,cb) {
    cc.log('Received the news that the cards were actually played down: %o',data);
    Handler.instance().eventQueue.push({eventName:'hitCard',data:data});
    //Handler.instance().handlestartCards(data);
}
Handler.service.toWaitAction = function (data,cb) {
    cc.log('Received message waiting for player operation: %o',data);
    Handler.instance().eventQueue.push({eventName:'toWaitAction',data:data});
    //Handler.instance().handlestartCards(data);
}
Handler.service.doAction = function (data,cb) {
    cc.log('Receive player select action message: %o',data);
    Handler.instance().eventQueue.push({eventName:'doAction',data:data});
    //Handler.instance().handlestartCards(data);
}

Handler.service.hu = function (data,cb) {
    cc.log('Received the Hu card message: %o',data);
    Handler.instance().eventQueue.push({eventName:'hu',data:data});
    //Handler.instance().handlestartCards(data);
}

Handler.service.shareScore = function (data,cb) {
    cc.log('Share message received: %o',data);
    Handler.instance().eventQueue.push({eventName:'shareScore',data:data});
    //Handler.instance().handlestartCards(data);
}