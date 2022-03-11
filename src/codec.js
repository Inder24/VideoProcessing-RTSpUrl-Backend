"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.codec = void 0;
var child_process_1 = require("child_process");
var util_1 = require("util");
var MP4Box = require('./mp4box.all.js');
var codec = /** @class */ (function () {
    function codec(rtspLinkOrVideo) {
        this.sleep = (0, util_1.promisify)(setTimeout);
        this.frag_duration = "60000";
        this.ffmpegLocation = "ffmpeg";
        this.constantRunning = false;
        this.rtspLinkOrVideo = rtspLinkOrVideo;
        this.codecInfo = "a";
        this.pid = 0;
        this.fragmentQueue = Array();
        this.stopProcess = false;
        this.filePos = 0;
        this.mp4boxfile = MP4Box.createFile();
    }
    codec.prototype.startRTSP = function () {
        var _this = this;
        var codecProc = (0, child_process_1.spawn)(this.ffmpegLocation, [
            "-i", this.rtspLinkOrVideo,
            "-c:v", "copy",
            "-an",
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-frag_duration", this.frag_duration,
            "-fflags", "nobuffer",
            "-tune", "zerolatency",
            "-f", "mp4",
            "-"
        ]);
        this.pid = codecProc.pid;
        console.log(this.pid);
        this.constantRunning = true;
        codecProc.stdout.on("data", function (data) {
            _this.fragmentQueue.push(data);
        });
    };
    codec.prototype.start = function () {
        var _this = this;
        var codecProc = (0, child_process_1.spawn)(this.ffmpegLocation, [
            "-stream_loop", "-1",
            "-i", this.rtspLinkOrVideo,
            "-c:v", "copy",
            "-an",
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-frag_duration", this.frag_duration,
            "-fflags", "nobuffer",
            "-tune", "zerolatency",
            "-f", "mp4",
            "-"
        ]);
        this.pid = codecProc.pid;
        codecProc.stdout.on("data", function (data) {
            _this.fragmentQueue.push(data);
        });
    };
    codec.prototype.exit = function () {
        if (this.constantRunning)
            process.kill(this.pid, 0);
        this.stopProcess = true;
    };
    codec.prototype.getCodec = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, ab;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.onready(this);
                        _a.label = 1;
                    case 1:
                        if (!!this.stopProcess) return [3 /*break*/, 6];
                        _a.label = 2;
                    case 2:
                        if (!(this.fragmentQueue.length > 0)) return [3 /*break*/, 4];
                        data = this.fragmentQueue.shift();
                        if (data) {
                            ab = data.buffer;
                            ab.fileStart = this.filePos;
                            this.filePos += ab.byteLength;
                            this.mp4boxfile.appendBuffer(ab);
                        }
                        else {
                            this.mp4boxfile.flush();
                        }
                        return [4 /*yield*/, this.sleep(1)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 2];
                    case 4: return [4 /*yield*/, this.sleep(20)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    codec.prototype.onready = function (e) {
        this.mp4boxfile.onMoovStart = function () {
            console.log("Starting to receive File Information");
        };
        this.mp4boxfile.onError = function (e) {
            console.log("error", e);
        };
        this.mp4boxfile.onReady = function (info) {
            var mime = 'video/mp4; codecs=\"';
            for (var i = 0; i < info.tracks.length; i++) {
                if (i !== 0)
                    mime += ',';
                mime += info.tracks[i].codec;
            }
            mime += '\"';
            console.log(mime);
            e.codecInfo = mime;
            e.stopProcess = true;
            e.wsConnList.send(e.codecInfo);
            e.wsConnList.close();
            e.exit();
        };
    };
    codec.prototype.toArrayBuffer = function (buffer) {
        var ab = new ArrayBuffer(buffer.length);
        var view = new Uint8Array(ab);
        for (var i = 0; i < buffer.length; ++i) {
            view[i] = buffer[i];
        }
        return ab;
    };
    codec.prototype.typedArrayToBuffer = function (array) {
        return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
    };
    return codec;
}());
exports.codec = codec;
