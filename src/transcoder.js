"use strict";
exports.__esModule = true;
exports.transcoder = void 0;
var child_process_1 = require("child_process");
var util_1 = require("util");
var transcoder = /** @class */ (function () {
    function transcoder(rtspLinkOrVideo, outputrtspLinkOrVideo) {
        this.sleep = (0, util_1.promisify)(setTimeout);
        this.frag_duration = "60000";
        this.ffmpegLocation = "./ffmpeg/ffmpeg";
        this.constantRunning = false;
        this.rtspLinkOrVideo = rtspLinkOrVideo;
        this.outputrtspLinkOrVideo = outputrtspLinkOrVideo;
        this.pid = 0;
        this.isProcess = true;
        this.headersNotPresent = true;
    }
    transcoder.prototype.startRTSP = function () {
        var ffmpegProc = (0, child_process_1.spawn)(this.ffmpegLocation, [
            "-rtsp_transport", "tcp",
            "-i", this.rtspLinkOrVideo,
            "-map", "0",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-x264opts", "keyint=60:vbv-maxrate=2000:vbv-bufsize=3000",
            "-f", "rtsp", this.outputrtspLinkOrVideo, //Define pipe format to be mp4
        ]);
        //ffmpeg -i rtsp://192.168.1.155:8080/h264_ulaw.sdp -c:v copy -an -movflags frag_keyframe+empty_moov+default_base_moof -frag_duration 60000 -fflags nobuffer -tune zerolatency -f mp4 -
        this.pid = ffmpegProc.pid;
        console.log(this.pid);
        ffmpegProc.stdout.on("data", function (data) {
            console.log("streaming", data);
            // this.fragmentQueue.push(data);
            // this.saveInitialFragment(data.buffer);
        });
        ffmpegProc.stderr.on("data", function (data) {
            console.log("error " + data);
        });
    };
    return transcoder;
}());
exports.transcoder = transcoder;
