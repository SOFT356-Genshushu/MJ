const DataBaseManager = require('./../Theme/FangkaMajiang/db/DataBaseManager');

const Assert = require('assert');

describe('Test database connection', function () {
    var ins = DataBaseManager.instance();
    it('ture',async function () {
        var ok = await ins.initDB("root","123456","127.0.0.1","27017","MaJiang");
        Assert.equal(true,ok);
    });

    it('create user',async function () {
        var okInfo = await ins.createPlayer(123456,"xxx2","123456",0);
        Assert.equal(okInfo.account,"xxx2");
    });

    it('select account xxx',async function () {
        var okInfo = await ins.findPlayer("xxx");
        Assert.equal(okInfo[0].account,"xxx");
    });
});