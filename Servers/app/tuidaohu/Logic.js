var Stam = require('./../../core/StateManger.js');
var Majiang = require('./../share/Chess.js').Majiang;
var UnitTools = require("./../../core/UnitTools.js"); 
var User = require('./User.js');
var Message =require('./../tuidaohu/Message.js');
var Rule = require('./../share/Rule.js');
var Score = require('./Score.js');

class Action{
    constructor(actionId){
        this.actionTime = Date.now();
        this.actionId = actionId;
        this.actionData = null;
        this.respond = {};
        this.waitPoss=[];
        this.type = 1;//1 means to test the cards played by others; 2 means to test the cards touched by yourself
    }

    setRespond(pos,data){//Set player reply message
        this.respond[pos] = data;
    }

    getRespond(pos){//Get player's reply
        return this.respond[pos];
    }

    isRespond(pos){//Judge whether the player replies to the message
        return !UnitTools.isNullOrUndefined(this.respond[pos]);
    }

    setActionData(actionData){
        this.actionData = actionData;
    }

    getActionData(){
        return this.actionData;
    }
    
    addWaitPos(pos){
        this.waitPoss.push(pos);
    }

    getWaitPoss(){
        return this.waitPoss;
    }

}

class Logic{
    constructor(tab){
        this.tab = tab;
        this.washCards = null;//Cards after washing
        this.handCards = new Array(this.tab.posCount);//Card type quantity array
        
        this.rawHandCard = new Array(this.tab.posCount);//Original card array in hand

        this.handActions = new Array(this.tab.posCount);//Keep the action in your hand

        this.raceScores = {};//Save scores for each round

        for(var pos=0; pos<this.tab.posCount; pos++){
            var a = this.handCards[pos] = new Array(35);
            a.fill(0);
            this.rawHandCard[pos] = {};
            this.handActions[pos] = [];//Action type of each player
            this.raceScores[pos] = [];//Points per player in each round
        }
        this.mainPos = null;//Banker location
        this.frames =[];
        this.touchIndex = 0;
        this.touchPos = null;//Current touch card position
        this.toHitPos = null;//Who is the current card playing position
        this.curHitCardIndex = null;//Current cards
        this.curTouchCardIndex = null;//Currently touched card
        this.actionId = 0;
        this.action = null;//Current user action
        this.hitTimeOut = 2000;
        this.juNum = 0;//Office number is zero by default


        this.Stam = new Stam();
        this.Stam.registerState(1,this.waitingP.bind(this));//1 waiting
        this.Stam.registerState(2,this.washP.bind(this));//2 wash card (washP)
        this.Stam.registerState(3,this.hitP.bind(this));//3 hit card
        this.Stam.registerState(4,this.actionP.bind(this));//Action waiting
        this.Stam.registerState(5,this.prpareP.bind(this));//Preparation stage
        this.Stam.changeToState(1);
    }
    
    clearToContinue(){
        this.washCards = null;//Cards after washing
        this.handCards = new Array(this.tab.posCount);///Card type quantity array
        this.rawHandCard = new Array(this.tab.posCount);//Original card array in hand
        this.handActions = new Array(this.tab.posCount);//Keep the action in your hand
        for(var pos=0; pos<this.tab.posCount; pos++){
            var a = this.handCards[pos] = new Array(35);
            a.fill(0);
            this.rawHandCard[pos] = {};
            this.handActions[pos] = [];//Action type of each player
        }
        this.mainPos = null;//Banker location
        this.touchIndex = 0;
        this.touchPos = null;//Current touch card position
        this.toHitPos = null;//Who is the current card playing position
        this.curHitCardIndex = null;//Current cards
        this.curTouchCardIndex = null;//Currently touched card
        this.actionId = 0;
        this.action = null;//Current user action
    }

    sendSpecialAndSave(pId,eventName,data){
        User.send(pId,eventName,data);
        this.frames.push({type:"special",pId:pId,eventName:eventName,data:data})
    }

    sendGroupAndSave(specials,eventName,data){
        var dataS = this.handleGroupData(data);
        this.tab.eachPos(function (pos) {
            var pId = this.tab.getPidWithPos(pos);
            var realData = UnitTools.arrayHasValue(pId,specials)?data:dataS;
            User.send(pId,eventName,realData);
        }.bind(this));

        this.frames.push({type:"group",specials:specials,eventName:eventName,data:data,dataS:dataS});   
    }

    handleGroupData(data){
        var dataS ={};
        for(var key in data){
            var value = data[key];
            if(key.indexOf("_s")!=-1)continue;
            dataS[key] = value;
        }
        return dataS;
    }

    getRestoreFrames(pId){
        var frames = [];
        for(var idx in this.frames){
            var frame = this.frames[idx];
            if(frame.type =='special' && pId == frame.pId){
                frames.push(frame);
                continue;
            }
            if(frame.type == 'group'){
                var realData = UnitTools.arrayHasValue(pId,frame.specials)?frame.data:frame.dataS;
                frames.push({type:'group',eventName:frame.eventName,data:realData});
            }
        }
        return frames;
    }

    manageCard(pos,cardIndex){
        this.rawHandCard[pos][cardIndex] = cardIndex; 
        var tIndex = Majiang.tIndex(cardIndex);
        this.handCards[pos][tIndex]+=1;
    }

    unmanageCard(pos,cardIndex){
        delete this.rawHandCard[pos][cardIndex]; 
        var tIndex = Majiang.tIndex(cardIndex);
        this.handCards[pos][tIndex]-=1;
    }

    selectCardIndexs(pos,cardIndex,num){
        var select = [];
        var rawCards = this.rawHandCard[pos];
        var tIndex = Majiang.tIndex(cardIndex);
        for(var cIndex in rawCards){
            if(tIndex == Majiang.tIndex(cIndex)){
                select.push(cIndex);
            }
            if(select.length == num) return select;
        }
        return select;
    }

    getRandomHitCard(pos){
        let touchCard = this.handCards[pos][34];
        return touchCard;
        //var handCards =Object.keys(this.rawHandCard[pos]);
        /*var random = UnitTools.random(0,handCards.length-1);
        return handCards[random];*/
        //return handCards[handCards.length-1];
    }

    touchCard(pos){//get one card
        this.touchPos = pos;
        var touchCardIndex = this.washCards[this.touchIndex];
        this.curTouchCardIndex = touchCardIndex;
        if(UnitTools.isNullOrUndefined(touchCardIndex)){
            //Enter the draw game end
            this.Stam.changeToState('liuiju');
            console.log('It ends in a draw');
            return;
        }
        this.touchIndex+=1;
        this.manageCard(pos,touchCardIndex);
        this.handCards[pos][34] = touchCardIndex;
        var pId = this.tab.getPidWithPos(pos);
        this.sendGroupAndSave([pId],Message.touchCard,{pos:pos,cardIndex_s:touchCardIndex});
    }

    touchAndDealHandAction(pos){//get cards and deal with actions
        this.touchCard(pos);
        var action = this.getActionInHand(pos);
        var nums = Object.keys(action);
        var handAction = {};
        handAction[pos] = action;
        //Jump to action wait
        nums!=0?this.toWaitAction(handAction,2):this.toHitCard(pos);

    }

    toHitCard(pos){//Whose turn is it to play
        this.toHitPos = pos;
        this.action = new Action(++this.actionId);
        this.sendGroupAndSave([],Message.toHitCard,{pos:this.toHitPos,actionId:this.action.actionId});
        this.Stam.changeToState(3);
    }

    toWaitAction(actions,type){
        this.action = new Action(++this.actionId);
        this.action.type = type;
        this.action.setActionData(actions);
        for(var pos in actions){
            var action = actions[pos];
            this.action.addWaitPos(pos);
            var pId = this.tab.getPidWithPos(pos);
            this.sendSpecialAndSave(pId,Message.toWaitAction,{actionId:this.actionId,action:action});
        }
        this.Stam.changeToState(4,this.action)
    }

    getActionInHand(pos){//To determine the action of a card in hand, such as a an gang or a guo lu gang
        var action = {};
        var handShap = this.handCards[pos];
        console.log('current get card'+this.curTouchCardIndex);
        {//an gang
            var details = [];
            for(var i =0;i<34;i++){
                if(handShap[i]==4){
                    var detail = {};
                    detail.pos = pos;
                    detail.tIndex = i;
                    detail.cardIndex = this.curTouchCardIndex;
                    details.push(detail);
                }
            }
            if(details.length!=0)action[Logic.HandAction.AnGang] = details;
        }

        {//guo lu gang
            var details = [];
            var actions = this.handActions[pos];
            for(var idx in actions){
                var one = actions[idx];
                if(one.actionType == Logic.HandAction.Peng){
                    var tIndex = one.tIndex;
                    var cardNum = handShap[tIndex];
                    if(cardNum===1){
                        var detail = {};
                        detail.pos = pos;
                        detail.tIndex = tIndex;
                        detail.cardIndex = this.curTouchCardIndex;
                        console.log('current get card'+this.curTouchCardIndex);
                        detail.actionType = Logic.HandAction.GuoluGang;
                        details.push(detail)//!!!!!!!s
                    }
                }
            }
            if(details.length != 0){
                action[Logic.HandAction.GuoluGang] = details;
            }
        }

        {//own win
            var handCards = this.handCards[pos];
            var isHu = Rule.Majiang.hu(handCards);
            if(isHu){
                var detail = action[Logic.HandAction.Zimo] = {};
                detail.pos = pos;
                detail.tIndex = tIndex;
                detail.cardIndex = this.curTouchCardIndex;
                detail.actionType = Logic.HandAction.Zimo;
            }
        }
        return action;
    }

    getActionWithCard(pos,cardIndex){//Judge the cards played by others
        var action = {};

        var tIndex = Majiang.tIndex(cardIndex);
        var cardNum = this.handCards[pos][tIndex];
        {//peng
            if(cardNum==2){
                var detail = action[Logic.HandAction.Peng]={};
                detail.pos = pos;
                detail.tIndex = tIndex;
                detail.cardIndex = cardIndex;
                detail.hitPos = this.toHitPos;
                detail.actionType = Logic.HandAction.Peng;
            }
        }
        {//ming gang
            if(cardNum==3){
                var detail = action[Logic.HandAction.MingGang]={};
                detail.pos = pos;
                detail.tIndex = tIndex;
                detail.cardIndex = cardIndex;
                detail.hitPos = this.toHitPos;
                detail.actionType = Logic.HandAction.MingGang;
            }
        }

        {//other player win
            if(!this.tab.custom.zimo){
                var handCards = this.handCards[pos];
                handCards[tIndex]+=1;
                var isHu = Rule.Majiang.hu(handCards);
                if(isHu){
                    var detail = action[Logic.HandAction.Dinapao] = {};
                    detail.pos = pos;
                    detail.tIndex = tIndex;
                    detail.cardIndex = cardIndex;
                    detail.dainPaoPos = this.toHitPos;
                    detail.actionType = Logic.HandAction.Dinapao;
                }
                handCards[tIndex]-=1;
            }
        }
        return action;
    }

    getAllActionWithCard(hitPos,cardIndex){
        var actions = {};
        this.tab.eachPos(function (pos) {
            if(pos == hitPos)return;
            var action = this.getActionWithCard(pos,cardIndex);
            var nums = Object.keys(action);
            if(nums!=0)actions[pos] = action;
        }.bind(this));
        return actions;
    }

    handleAction(pos,actionType,selectCardIndex){
        var action = this.action.getActionData()[pos][actionType];
        if(actionType == Logic.HandAction.Peng){//Handle peng
            var cardIndex  = action.cardIndex;//Majiang.cards[action.tIndex];
            var selects = this.selectCardIndexs(pos,cardIndex,2);
            for(var idx in selects){
                this.unmanageCard(pos,selects[idx]);
            }
            this.handActions[pos].push(action);
            this.sendGroupAndSave({},Message.doAction,{pos:pos,hitPos:action.hitPos,hitIndex:cardIndex,actionType:actionType,cardIndexs:selects});
            //console.log({pos:pos,hitPos:action.hitPos,hitIndex:cardIndex,actionType:actionType,cardIndexs:selects});
            //var nextPos = this.tab.getNextPos(action.hitPos);
            this.toHitCard(pos);
        }else if(actionType == Logic.HandAction.AnGang){//Handle an gang
            var selectAction = null;
            for(var idx in action){
                var one = action[idx];
                if(one.cardIndex == selectCardIndex){
                    selectAction = one;
                    break;
                }
            }
            var cardIndex  = selectAction.cardIndex;//Majiang.cards[selectAction.tIndex];
            var selects = this.selectCardIndexs(pos,cardIndex,4);
            for(var idx in selects){
                this.unmanageCard(pos,selects[idx]);
            }
            this.handActions[pos].push(selectAction);
            this.sendGroupAndSave({},Message.doAction,{pos:pos,cardIndex:cardIndex,actionType:actionType,cardIndexs:selects});
            this.touchAndDealHandAction(pos);
        }else if(actionType == Logic.HandAction.MingGang){//Handle ming gang
            var cardIndex  = action.cardIndex;//Majiang.cards[action.tIndex];
            var selects = this.selectCardIndexs(pos,cardIndex,3);
            for(var idx in selects){
                this.unmanageCard(pos,selects[idx]);
            }
            this.handActions[pos].push(action);
            this.sendGroupAndSave({},Message.doAction,{pos:pos,cardIndex:cardIndex,hitPos:action.hitPos,hitIndex:cardIndex,actionType:actionType,cardIndexs:selects});

            this.touchAndDealHandAction(pos);
        }else if(actionType == Logic.HandAction.GuoluGang){//Handle guo lu gang
            var selectAction = null;
            for(var idx in action){
                var one = action[idx];
                if(one.cardIndex == selectCardIndex){
                    selectAction = one;
                    break;
                }
            }
            var cardIndex  = selectAction.cardIndex;//Majiang.cards[selectAction.tIndex];
            var selects = this.selectCardIndexs(pos,cardIndex,1);
            for(var idx in selects){
                this.unmanageCard(pos,selects[idx]);
            }
            this.handActions[pos].push(selectAction);
            this.sendGroupAndSave([],Message.doAction,{pos:pos,cardIndex:cardIndex,hitPos:selectAction.hitPos,actionType:actionType,cardIndexs:selects});
            this.touchAndDealHandAction(pos);
        }else if(actionType == Logic.HandAction.Pass){
            if(this.action.type == 1){//pass
                this.touchAndDealHandAction(this.tab.getNextPos(this.toHitPos));
            }else{//self get card pass
                this.toHitCard(this.toHitPos);
            }
        }
    }

    handleHu(isLiuju){//last result
        var self = this;
        var sendData = {};//Inform the final data, including the position of the Hu card and the final score
        var posHuType = {};//win card types in different positions
        var score = {};
        var isZimo = false;//Self win or not
        if(isLiuju){//Handling a tie

        }else{//some one win
            var waitPos = this.action.getWaitPoss();
            for(var idx in waitPos){
                var pos = waitPos[idx];
                var actionType = this.action.getRespond(pos).actionType;
                if(actionType == Logic.HandAction.Pass ||
                     (actionType!=Logic.HandAction.Dinapao &&
                         actionType!=Logic.HandAction.Zimo))continue;
                posHuType[pos] = actionType;
                if(actionType==Logic.HandAction.Zimo)isZimo=true;
            }
        }

        var huSpecial = {};
        for(var pos in posHuType){
            if(this.tab.custom.qingyise){
                var cards = this.rawHandCard[pos];
                var actionCards = this.handActions[pos];
                if(Rule.Majiang.isQingyise(cards,actionCards))huSpecial[pos].push(0);
            }
        }

        score = Score.score(posHuType,this.toHitPos,huSpecial);//++++++++++++++++++++++++++
        sendData.zhuangPos = this.mainPos;
        sendData.posHuType = posHuType;
        sendData.paoPos = isZimo?null:this.toHitPos;
        sendData.posName = this.tab.getNames();
        sendData.score = score;
        sendData.huCardIndex = isZimo?this.curTouchCardIndex:this.curHitCardIndex;
        sendData.posHandCards = this.rawHandCard;
        sendData.huSpecial = huSpecial;
        var posActionCards = {};
        for(var pos in this.handActions){
            var actionCards = this.handActions[pos];
            var posAction = posActionCards[pos] = {};
            for(var idx in actionCards){
                var action = actionCards[idx];
                posAction[action.actionType] = action;
            }
        }
        for(var pos in posActionCards){
            var posAction = posActionCards[pos];
            if(posAction[Logic.HandAction.GuoluGang]){
                delete posAction[Logic.HandAction.Peng];
            }
        }
        sendData.posActionCards = posActionCards;
        sendData.finished = false;
        this.juNum+=1;//round +1
        for(var pos in score){
            var oneScore = score[pos];
            this.raceScores[pos].push(oneScore);//Save everyone's score
        }
        this.tab.custom.juNum=1;
        var isFinished = this.juNum == this.tab.custom.juNum;
        if(isFinished){
            var posNames = {};
            this.tab.eachPos(function (pos) {
                var info = posNames[pos] = {};
                var head = self.tab.getHead(pos);
                info.name = head.nickName;
                info.headUrl = head.headimgUrl;

            });
            sendData.finished = true;
            sendData.shareScore = {posScores:this.raceScores,posNames:posNames};
            //this.sendGroupAndSave([],Message.shareScore,{posScores:this.raceScores,posNames:posNames});
           
        }
        this.sendGroupAndSave([],Message.hu,sendData);
        this.clearToContinue();
        this.Stam.changeToState(5);//To preparation stage
        if(isFinished){
            //Game over, recycle room
            this.handler.recoverTab(this.tab.tableId);
        }
    }

    waitingP(){
        if(this.tab.room.getFreePos() == null){//sit full
            this.tab.room.setAllPosReady(false);
            this.Stam.changeToState(2);
        }
    }

    prpareP(){
        if(this.tab.room.isAllPosReady()){//All players are ready, the game continues
            this.frames =[];
            this.tab.room.setAllPosReady(false);
            this.Stam.changeToState(2);
        }
    }

    washP(){
        this.washCards = Majiang.cards.concat();
        UnitTools.washArray(this.washCards);
        for(var i = 0; i<48;i+=16){
            this.tab.eachPos(function (pos) {
                var startIndex = i+pos*4;
                var handStartIndex = i/4;
                for(var j=0;j<4;j++){
                    var cardIndex = this.washCards[startIndex+j];
                    this.manageCard(pos,cardIndex);
                }
            }.bind(this));
        }
        var startIndex = 48;
        this.tab.eachPos(function (pos) {
            var cardIndex = this.washCards[startIndex];
            this.manageCard(pos,cardIndex);
            startIndex+=1;
        }.bind(this));
        this.tab.eachPos(function (pos) {
            var pId = this.tab.getPidWithPos(pos);
            var cards13 = Object.keys(this.rawHandCard[pos]);
            this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
        }.bind(this));
        this.touchIndex = 54;
        this.mainPos = 3;
        //this.Stam.changeToState(3);
        this.touchAndDealHandAction(this.mainPos);
        /*this.touchCard(this.mainPos);
        this.toHitCard(this.mainPos);*/

    }
    //game logic test 
    washPTest(){
        this.washCards = [];

        var pos0 = [];
        var pos1 = [];
        var pos2 = [];
        var pos3 = [];

        {//碰
            this.washCards = [41,42,43,44];
            this.touchIndex = 0;
            this.mainPos = 2;
            pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            pos3 = [161,162,163,164,165,166,167,168,169,91,141,193,194];
            
            for(var i = 0;i<13;i++){
                this.manageCard(0,pos0[i]);
                this.manageCard(1,pos1[i]);
                this.manageCard(2,pos2[i]);
                this.manageCard(3,pos3[i]);
            }
            this.tab.eachPos(function (pos) {
                var pId = this.tab.getPidWithPos(pos);
                var cards13 = Object.keys(this.rawHandCard[pos]);
                this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
                if(pos == 3)console.log(cards13);
            }.bind(this))
            
            this.touchCard(this.mainPos);
            this.toHitCard(this.mainPos);
        }

        {//暗杠
            this.washCards = [41,42,43,44];
            this.touchIndex = 0;
            this.mainPos = 3;
            pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            pos3 = [161,162,163,164,165,166,167,168,169,91,141,191,194];

            for(var i = 0;i<13;i++){
                this.manageCard(0,pos0[i]);
                this.manageCard(1,pos1[i]);
                this.manageCard(2,pos2[i]);
                this.manageCard(3,pos3[i]);
            }
            this.tab.eachPos(function (pos) {
                var pId = this.tab.getPidWithPos(pos);
                var cards13 = Object.keys(this.rawHandCard[pos]);
                this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
                if(pos == 3)console.log(cards13);
            }.bind(this));
            this.touchAndDealHandAction(this.mainPos);
        }

        {//明杠
            this.washCards = [41,42,43,44];
            this.touchIndex = 0;
            this.mainPos = 2;
            pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            pos2 = [111,112,113,114,115,116,117,118,119,141,142,143,144];
            pos3 = [161,162,163,164,165,166,167,168,169,91,141,191,194];

            for(var i = 0;i<13;i++){
                this.manageCard(0,pos0[i]);
                this.manageCard(1,pos1[i]);
                this.manageCard(2,pos2[i]);
                this.manageCard(3,pos3[i]);
            }
            this.tab.eachPos(function (pos) {
                var pId = this.tab.getPidWithPos(pos);
                var cards13 = Object.keys(this.rawHandCard[pos]);
                this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
                if(pos == 3)console.log(cards13);
            }.bind(this));
            this.touchCard(this.mainPos);
            this.toHitCard(this.mainPos);
        }

        {//过路杠
            //-------------------0   1  2  3
            this.washCards = [41,42,43,44,191];
            this.touchIndex = 0;
            this.mainPos = 2;
            pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            pos3 = [161,162,163,164,165,166,167,168,169,91,141,192,194];

            for(var i = 0;i<13;i++){
                this.manageCard(0,pos0[i]);
                this.manageCard(1,pos1[i]);
                this.manageCard(2,pos2[i]);
                this.manageCard(3,pos3[i]);
            }

            this.tab.eachPos(function (pos) {
                var pId = this.tab.getPidWithPos(pos);
                var cards13 = Object.keys(this.rawHandCard[pos]);
                this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
                if(pos == 3)console.log(cards13);
            }.bind(this));
            this.touchAndDealHandAction(this.mainPos);
        }
        {//胡牌点炮测试
            //-------------------0   1  2  3
            this.washCards = [41,42,43,44,191];
            this.touchIndex = 0;
            this.mainPos = 2;
            pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            pos3 = [161,162,163,164,165,166,167,168,169,171,172,173,191];

            for(var i = 0;i<13;i++){
                this.manageCard(0,pos0[i]);
                this.manageCard(1,pos1[i]);
                this.manageCard(2,pos2[i]);
                this.manageCard(3,pos3[i]);
            }

            this.tab.eachPos(function (pos) {
                var pId = this.tab.getPidWithPos(pos);
                var cards13 = Object.keys(this.rawHandCard[pos]);
                this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
                if(pos == 3)console.log(cards13);
            }.bind(this));
            this.touchAndDealHandAction(this.mainPos);
        }
        {//自摸测试
            //-------------------0   1  2  3
            this.washCards = [42,41,43,44,191];
            this.touchIndex = 0;
            this.mainPos = 2;
            pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            pos3 = [161,162,163,164,165,166,167,168,169,172,173,174,191];

            for(var i = 0;i<13;i++){
                this.manageCard(0,pos0[i]);
                this.manageCard(1,pos1[i]);
                this.manageCard(2,pos2[i]);
                this.manageCard(3,pos3[i]);
            }

            this.tab.eachPos(function (pos) {
                var pId = this.tab.getPidWithPos(pos);
                var cards13 = Object.keys(this.rawHandCard[pos]);
                this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
                if(pos == 3)console.log(cards13);
            }.bind(this));
            this.touchAndDealHandAction(this.mainPos);
        }
        {//碰 过路杠 胡
            this.washCards = [11,42,43,43,61,69];
            this.touchIndex = 0;
            this.mainPos = 2;
            pos0 = [21,12,13,14,15,16,17,18,19,45,42,43,44];
            pos1 = [71,62,63,64,65,66,67,68,69,95,92,93,94];
            pos2 = [121,112,113,114,115,116,117,118,119,145,142,143,144];
            pos3 = [161,111,163,164,165,166,167,168,169,31,32,33,191];

            for(var i = 0;i<13;i++){
                this.manageCard(0,pos0[i]);
                this.manageCard(1,pos1[i]);
                this.manageCard(2,pos2[i]);
                this.manageCard(3,pos3[i]);
            }

            this.tab.eachPos(function (pos) {
                var pId = this.tab.getPidWithPos(pos);
                var cards13 = Object.keys(this.rawHandCard[pos]);
                this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
                if(pos == 3)console.log('第13张牌'+cards13);
            }.bind(this))
            this.touchAndDealHandAction(this.mainPos)
        }
        {//自摸清一色测试
            this.washCards = [42,41,43,44,64];
            this.touchIndex = 0;
            this.mainPos = 2;
            pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            pos3 = [161,162,163,164,165,166,167,168,169,11,12,13,14];

            for(var i = 0;i<13;i++){
                this.manageCard(0,pos0[i]);
                this.manageCard(1,pos1[i]);
                this.manageCard(2,pos2[i]);
                this.manageCard(3,pos3[i]);
            }

            this.tab.eachPos(function (pos) {
                var pId = this.tab.getPidWithPos(pos);
                var cards13 = Object.keys(this.rawHandCard[pos]);
                this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
                if(pos == 3)console.log(cards13);
            }.bind(this))
            this.touchAndDealHandAction(this.mainPos)
        }

    }
    hitP(){
        if(!this.action.isRespond(this.toHitPos)){
            /*var time = Date.now();
            if((time - this.action.actionTime)>this.hitTimeOut){
                var hitIndex = this.getRandomHitCard(this.toHitPos);
                this.action.setRespond(this.toHitPos,hitIndex);
            }*/
            return;
        }
        var cardIndex = this.action.getRespond(this.toHitPos);
        this.curHitCardIndex = cardIndex;
        this.unmanageCard(this.toHitPos,cardIndex);

        this.sendGroupAndSave([],Message.hitCard,{pos:this.toHitPos,cardIndex:cardIndex});

        //判断其他玩家基于这张牌是否有动作
        var handActions = this.getAllActionWithCard(this.toHitPos,cardIndex);
        if(Object.keys(handActions).length != 0){
            console.log('1 waiting!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            this.toWaitAction(handActions,1);
        }else{
            var nextPos = this.tab.getNextPos(this.toHitPos);
            this.touchAndDealHandAction(nextPos);
        }
        /*this.touchCard(nextPos);
        this.toHitCard(nextPos);*/
    }

    actionP(){
        var waitingPoss = this.action.getWaitPoss();
        for(var idx in waitingPoss){
            var pos = waitingPoss[idx];
            if(!this.action.isRespond(pos)){
                return;
            }
        }
        var hasHu = false;//有没有胡的动作
        
        for(var idx in waitingPoss){//找胡
            if(waitingPoss[idx]==null)continue;
            var resData = this.action.getRespond(waitingPoss[idx]);
            if(resData.actionType == Logic.HandAction.Dinapao || resData.actionType == Logic.HandAction.Zimo){
                hasHu = true;
                break;
            }
        }
        if(hasHu){
            //Some win, maybe many win or one win
            this.handleHu(false);
            return;
        }
        var finalActionPos = null;//Who finally dealt with the action
        var finalAction = Logic.HandAction.Pass;//Last action selected
        var finalCardIndex = null;
        for(var idx in waitingPoss){
            if(waitingPoss[idx]==null)continue;
            finalActionPos = waitingPoss[idx];
            var resData = this.action.getRespond(waitingPoss[idx]);
            finalCardIndex =resData.cardIndex;
            if(resData.actionType == Logic.HandAction.Peng || 
                resData.actionType == Logic.HandAction.AnGang||
                resData.actionType == Logic.HandAction.MingGang||
                resData.actionType == Logic.HandAction.GuoluGang){
                    finalAction = resData.actionType;
                    break;
            }
        }
        this.handleAction(finalActionPos,finalAction,finalCardIndex);
    }

    updata(){
        this.Stam.update();
    }
}

Logic.HandAction = {
    Pass:0,
    Peng:1,
    AnGang:2,
    GuoluGang:3,
    MingGang:4,
    Dinapao:5,
    Zimo:6
};

module.exports = Logic;