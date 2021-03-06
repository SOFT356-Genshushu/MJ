function CreatorHelper() {

}

CreatorHelper.getNodeComponent = function (node, type) {
    return node.getComponent(type);
}

CreatorHelper.createNewSpriteNode = function () {
    var node = new cc.Node();
    var sprite = node.addComponent(cc.Sprite);
    return sprite;
}

CreatorHelper.touchInSprite = function (touch, sprite) {
    var locationInNode = sprite.convertToNodeSpace(touch.getLocation());
    var s = sprite.getContentSize();
    var rect = cc.rect(0, 0, s.width, s.height);
    if (cc.rectContainsPoint(rect, locationInNode)) {
        return true;
    }
    return false;
}

//Set node click event
CreatorHelper.setNodeClickEvent = function (node, cb) {
    node.on(cc.Node.EventType.TOUCH_END, function () {
        cb(node);
    }, node);
}

CreatorHelper.setNodeClickEventWithContent = function (node,content,cb) {
    node.on(cc.Node.EventType.TOUCH_END, function () {
        cb(node)
    }, content);
}

//Add clicked event
CreatorHelper.setPressEvent = function (node,cb) {
    node.on(cc.Node.EventType.TOUCH_START, function () {
        cb(node);
    }, node);
}
//Add end event
CreatorHelper.setUnPressEvent = function (node,cb) {
    node.on(cc.Node.EventType.TOUCH_END, function () {
        cb(node);
    }, node);
}

//Add cancelled event
CreatorHelper.setCancelEvent = function (node,cb) {
    node.on(cc.Node.EventType.TOUCH_CANCEL, function () {
        cb(node);
    }, node);
}

//Add mobile event
CreatorHelper.setMoveEvent = function (node,cb) {
    node.on(cc.Node.EventType.TOUCH_MOVE, function (event) {
        cb(node,event);
    }, node);
}




//Replace spriteframe by path, fixed size
CreatorHelper.changeSpriteFrame = function (sprite, url) {
    cc.loader.loadRes(url, cc.SpriteFrame, function (err, spriteFrame) {
        var width = sprite.node.width;
        var height = sprite.node.height;
        sprite.spriteFrame = spriteFrame;
        sprite.node.width = width;
        sprite.node.height = height;
    });
}

//Load all audio files in the directory, and return a JSON corresponding to the name and file
CreatorHelper.loadAllAudio = function (url, cb) {
    cc.loader.loadResAll(url, cc.AudioClip, function (err, assets) {
        var audioMap = {};
        for (var key in assets) {
            var asset = assets[key];
            audioMap[asset.name] = asset;
            cb(audioMap);
        }
    });
}

CreatorHelper.getRealPath = function (localPath) {
    return cc.url.raw(localPath);
}

//Load pictures from remote server
CreatorHelper.changeSpriteFrameWithServerUrl = function (sprite, url) {
    if (cc.sys.isNative) {
        CreatorHelper.changeSpriteFrameWithServerUrlForNative(sprite, url);
    } else {
        CreatorHelper.changeSpriteFrameWithServerUrlForWeb(sprite, url);
    }
}

//Download and change pictures remotely in Web mode
CreatorHelper.changeSpriteFrameWithServerUrlForWeb = function (sprite, url) {
    if (!sprite)return;
    cc.loader.load(url, function (err, tex2d) {
        if (err) {
            setTimeout(function () {
                CreatorHelper.changeSpriteFrameWithServerUrl(sprite, url);
            }, 1000);
        } else {
            var frame = new cc.SpriteFrame();
            frame.setTexture(url);
            sprite.spriteFrame = frame;
            //cc.textureCache.addImage(url);
        }
    });
}

//Download and replace pictures remotely in native mode (only PNG file download is supported, which needs to be modified later)
CreatorHelper.changeSpriteFrameWithServerUrlForNative = function (sprite, url) {
    var MD5 = require("MD5");
    var dirpath = jsb.fileUtils.getWritablePath() + '/ServerImages/';
    var filepath = dirpath + MD5(url) + '.png';
    cc.log("Storage address is"+filepath);
    function loadEnd() {
        cc.loader.load(filepath, function (err, tex) {
            if (err) {
                cc.error(err);
            } else {
                var spriteFrame = new cc.SpriteFrame(tex);
                if (spriteFrame) {
                    sprite.spriteFrame = spriteFrame;
                    cc.textureCache.addImage(filepath);
                }
            }
        });
    }

    var saveFile = function (data) {
        if (typeof data !== 'undefined') {
            if (!jsb.fileUtils.isDirectoryExist(dirpath)) {
                jsb.fileUtils.createDirectory(dirpath);
            }
            if (jsb.fileUtils.writeDataToFile(new Uint8Array(data), filepath)) {
                cc.log('Remote write file succeed.');
                loadEnd();
            } else {
                cc.log('Remote write file failed.');
            }
        } else {
            cc.log('Remote download file failed.');
        }
    };

    if (jsb.fileUtils.isFileExist(filepath)) {
        cc.log('Remote is find' + filepath);
        loadEnd();
        return;
    }


    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        cc.log("xhr.readyState  " + xhr.readyState);
        cc.log("xhr.status  " + xhr.status);
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                xhr.responseType = 'arraybuffer';
                saveFile(xhr.response);
            } else {
                saveFile(null);
                setTimeout(function () {
                    CreatorHelper.changeSpriteFrameWithServerUrlForNative(sprite,url);
                },1000)
            }
        }
    }.bind(this);
    xhr.open("GET", url, true);
    xhr.send();
}

//截图
CreatorHelper.screenShoot = function(func) {
    if (!cc.sys.isNative) return;
    var dirpath = jsb.fileUtils.getWritablePath() + 'ScreenShoot/';
    if (!jsb.fileUtils.isDirectoryExist(dirpath)) {
        jsb.fileUtils.createDirectory(dirpath);
    }
    var name = 'ScreenShoot-' + (new Date()).valueOf() + '.png';
    var filepath = dirpath + name;
    var size = cc.director.getVisibleSize();
    var rt = cc.RenderTexture.create(size.width, size.height);
    cc.director.getScene()._sgNode.addChild(rt);
    rt.setVisible(false);
    rt.begin();
    cc.director.getScene()._sgNode.visit();
    rt.end();
    cc.log(rt.saveToFile.length);
    rt.saveToFile('ScreenShoot/' + name, cc.IMAGE_FORMAT_PNG, true, function() {
        cc.log('save succ');
        cc.log(filepath);
        rt.removeFromParent();
        if (func) {
            func(filepath);
        }
    });
};


module.exports = CreatorHelper;