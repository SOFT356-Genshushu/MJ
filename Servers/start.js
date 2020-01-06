//读取config.json文件
var config = new (require("./core/Config.js")) ();
config.load("config.json");
var develop = config.get("mode") == "debug"?true:false;

var App = require("./core/app.js");
var app = new App();
App.instance = app;
app.isDebug = develop;//Set debug mode or not

var UnitTools = require("./core/UnitTools.js");

//Error trapping
UnitTools.processError(function(err){
   //app.logError({mes:err.message,stack:err.stack});
   console.log(err.stack);
})

process.on('unhandledRejection',(reason,p) => {
    console.log("Unhandled Rejection at Promise", p, "reason", reason);
});

//Set process name
UnitTools.setProcessInfo("tongfei","main",UnitTools.getLocalIps(false)[1],"main");
if(develop == true)//Debug mode, single thread starts all services
{
    app.startAll();
    return;
}

app.loadAppConfig();//Read profile

var logInfo  = function(data){
    console.log(data);
}
var startHosts = app.getStartServersInfo();

UnitTools.forEach(startHosts,function(index,host){
    var custom = host.custom;
    if(UnitTools.isJson(host.custom)){
        custom = JSON.stringify(host.custom);
    }
    UnitTools.startNewProcess([__dirname+"/core/StartApp.js",host.type,host.id,host.name,host.ip,host.port,custom],logInfo,logInfo,logInfo);
});

