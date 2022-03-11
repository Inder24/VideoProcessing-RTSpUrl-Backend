"use strict";
exports.__esModule = true;
var ws_1 = require("ws");
var ffmpeg_1 = require("./src/ffmpeg");
var codec_1 = require("./src/codec");
var transcoder_1 = require("./src/transcoder");
var wss = new ws_1.WebSocketServer({
    port: 8187
});
var wss2 = new ws_1.WebSocketServer({
    port: 8185
});
var wss3 = new ws_1.WebSocketServer({
    port: 8190
});
var wsConnList = new Map();
var ffmpegList = new Map();
wss.on("connection", function (wsClient, request) {
    var wsId = Date.now();
    var myffmpeg;
    wsClient.on('message', function (data) {
        console.log('received %s', data);
    });
    wsClient.on('close', function () {
        wsClient.removeAllListeners();
        if (wsConnList.has(wsId)) {
            console.log("Removed " + wsId);
            wsConnList["delete"](wsId);
        }
        ffmpegList.forEach(function (obj) {
            if (obj.wsConnList.has(wsId)) {
                obj.wsConnList["delete"](wsId);
                obj.wsConnDataRecord["delete"](wsId);
            }
        });
    });
    wsConnList.set(wsId, wsClient);
    console.log("Connected " + wsId);
    var url = request.url;
    var rtspLink = url.substring(1);
    console.log(rtspLink);
    if (!ffmpegList.has(rtspLink)) {
        myffmpeg = new ffmpeg_1.ffmpeg(rtspLink);
        ffmpegList.set(rtspLink, myffmpeg);
        myffmpeg.wsConnList.set(wsId, wsClient);
        myffmpeg.wsConnDataRecord.set(wsId, 0);
        myffmpeg.startRTSP();
        myffmpeg.sendBufferData();
    }
    else if (ffmpegList.has(rtspLink)) {
        myffmpeg = ffmpegList.get(rtspLink);
        if (myffmpeg.isProcess == false) {
            myffmpeg = new ffmpeg_1.ffmpeg(rtspLink);
            myffmpeg.wsConnList.set(wsId, wsClient);
            myffmpeg.wsConnDataRecord.set(wsId, 0);
            myffmpeg.startRTSP();
            myffmpeg.sendBufferData();
        }
        else {
            myffmpeg.wsConnList.set(wsId, wsClient);
            myffmpeg.wsConnDataRecord.set(wsId, 0);
        }
    }
});
wss2.on("connection", function (wsClient, request) {
    var mycodec;
    wsClient.on('message', function (data) {
        console.log('received %s', data);
    });
    var url = request.url;
    var getValue = url.substring(1);
    console.log(getValue);
    mycodec = new codec_1.codec(getValue);
    mycodec.startRTSP();
    mycodec.wsConnList = wsClient;
    mycodec.getCodec();
});
wss3.on("connection", function (wsClient, request) {
    var mytranscoder;
    var oldUrl = "";
    var newUrl = "";
    var receivedValue = false;
    wsClient.on('message', function (data) {
        var output = data.toString().split('rtsp');
        if (output[0][2] === 'o')
            oldUrl = "rtsp" + output[1].slice(0, -2);
        else {
            newUrl = "rtsp" + output[1].slice(0, -2);
            receivedValue = true;
        }
    });
    if (receivedValue) {
        mytranscoder = new transcoder_1.transcoder(oldUrl, newUrl);
        mytranscoder.startRTSP();
    }
});
