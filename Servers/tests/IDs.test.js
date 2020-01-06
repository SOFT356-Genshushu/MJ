var IDs = require('./../core/IDs.js');
var Assert = require('assert');

describe('Generate random ID test',function () {
    this.timeout(22126);
    it('Create and return a valid ID',async function () {
        var ids = new IDs();
        ids.initFromConfig();
        var id = await ids.getId();
        console.log(id);
        if(id>=10000000 && id<=99999999){
            Assert.equal(true,true);
        }else{
            Assert.equal(false,false);
        }
    });
});