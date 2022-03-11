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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
exports.__esModule = true;
exports.ffmpeg = void 0;
var child_process_1 = require("child_process");
var util_1 = require("util");
var ffmpeg = /** @class */ (function () {
    function ffmpeg(rtspLinkOrVideo) {
        this.sleep = (0, util_1.promisify)(setTimeout);
        this.frag_duration = "60000";
        this.ftyp = null;
        this.moov = null;
        this.moof = null;
        this.ffmpegLocation = "./ffmpeg/ffmpeg";
        this.constantRunning = false;
        this.rtspLinkOrVideo = rtspLinkOrVideo;
        this.fragmentQueue = Array();
        this.wsConnList = new Map();
        this.pid = 0;
        this.isProcess = true;
        this.wsConnDataRecord = new Map();
        this.headersNotPresent = true;
    }
    ffmpeg.prototype.startRTSP = function () {
        var _this = this;
        var ffmpegProc = (0, child_process_1.spawn)(this.ffmpegLocation, [
            "-i", this.rtspLinkOrVideo,
            "-c:v", "copy",
            "-an",
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-frag_duration", this.frag_duration,
            "-fflags", "nobuffer",
            "-tune", "zerolatency",
            "-copytb", "1",
            "-f", "mp4",
            "-"
        ]);
        //ffmpeg -i rtsp://192.168.1.155:8080/h264_ulaw.sdp -c:v copy -an -movflags frag_keyframe+empty_moov+default_base_moof -frag_duration 60000 -fflags nobuffer -tune zerolatency -f mp4 -
        this.pid = ffmpegProc.pid;
        console.log(this.pid);
        ffmpegProc.stdout.on("data", function (data) {
            // console.log(data);
            _this.fragmentQueue.push(data);
            _this.saveInitialFragment(data.buffer);
        });
        ffmpegProc.stderr.on("data", function (data) {
            //  console.log("error " +data);
        });
    };
    ffmpeg.prototype.start = function () {
        var _this = this;
        var ffmpegProc = (0, child_process_1.spawn)(this.ffmpegLocation, [
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
        this.pid = ffmpegProc.pid;
        ffmpegProc.stdout.on("data", function (data) {
            _this.fragmentQueue.push(data);
            _this.saveInitialFragment(data.buffer);
        });
    };
    ffmpeg.prototype.exit = function () {
        if (this.wsConnList.size == 0) {
            process.kill(this.pid, 0);
            this.isProcess = false;
        }
    };
    ffmpeg.prototype.sendBufferData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, _a, _b, _c, key, wsConn;
            var e_1, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.sleep(10)];
                    case 1:
                        _e.sent();
                        _e.label = 2;
                    case 2:
                        if (!this.isProcess) return [3 /*break*/, 7];
                        this.exit();
                        _e.label = 3;
                    case 3:
                        if (!(this.fragmentQueue.length > 0)) return [3 /*break*/, 5];
                        data = this.fragmentQueue.shift();
                        try {
                            for (_a = (e_1 = void 0, __values(this.wsConnList)), _b = _a.next(); !_b.done; _b = _a.next()) {
                                _c = __read(_b.value, 2), key = _c[0], wsConn = _c[1];
                                // if(this.headersNotPresent)
                                // {
                                if (this.wsConnDataRecord.get(key) == 0) {
                                    if (this.ftyp != null) {
                                        wsConn.send(this.ftyp);
                                        this.wsConnDataRecord.set(key, 1);
                                    }
                                }
                                else if (this.wsConnDataRecord.get(key) == 1) {
                                    if (this.moov != null) {
                                        wsConn.send(this.moov);
                                    }
                                    this.wsConnDataRecord.set(key, 2);
                                }
                                else if (this.wsConnDataRecord.get(key) == 2) {
                                    if (this.getNameOfBox(data) == "moof" && this.hasFirstSampleFlag(new Uint8Array(data))) {
                                        console.log("got special moof");
                                        wsConn.send(data);
                                        this.wsConnDataRecord.set(key, 3);
                                        this.headersNotPresent = false;
                                    }
                                }
                                // }
                                // else
                                // {
                                wsConn.send(data);
                                // }
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_d = _a["return"])) _d.call(_a);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return [4 /*yield*/, this.sleep(1)];
                    case 4:
                        _e.sent();
                        return [3 /*break*/, 3];
                    case 5: return [4 /*yield*/, this.sleep(50)];
                    case 6:
                        _e.sent();
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    ffmpeg.prototype.saveInitialFragment = function (data) {
        if (this.moof == null) {
            if (this.getNameOfBox(data) == "ftyp") {
                console.log("got ftyp");
                this.ftyp = data;
            }
            else if (this.getNameOfBox(data) == "moov") {
                console.log("got moov");
                this.moov = data;
            }
            else if (this.getNameOfBox(data) == "moof") {
                console.log("got moof");
                this.moof = data;
            }
        }
    };
    //get ftyp, moov,moof box
    ffmpeg.prototype.getNameOfBox = function (data) {
        try {
            var packet = new Uint8Array(data);
            var res = this.getBox(packet, 0);
            return res[1];
        }
        catch (e) {
            console.log(e);
            return null;
        }
    };
    ffmpeg.prototype.toInt = function (arr, index) {
        var dv = new DataView(arr.buffer, 0);
        return dv.getInt32(index, false); // big endian
    };
    ffmpeg.prototype.bytesToString = function (arr, fr, to) {
        return String.fromCharCode.apply(null, arr.slice(fr, to));
    };
    ffmpeg.prototype.getBox = function (arr, i) {
        return [this.toInt(arr, i), this.bytesToString(arr, i + 4, i + 8)];
    };
    ffmpeg.prototype.getSubBox = function (arr, box_name) {
        var i = 0;
        var res = this.getBox(arr, i);
        var main_length = res[0];
        var name = res[1]; // this boxes length and name
        i = i + 8;
        var sub_box = null;
        while (i < main_length) {
            res = this.getBox(arr, i);
            var l = res[0];
            name = res[1];
            if (box_name == name) {
                sub_box = arr.slice(i, i + Number(l));
            }
            i = i + Number(l);
        }
        return sub_box;
    };
    ffmpeg.prototype.hasFirstSampleFlag = function (arr) {
        // [moof [mfhd] [traf [tfhd] [tfdt] [trun]]]
        var traf = this.getSubBox(arr, "traf");
        if (traf == null) {
            return false;
        }
        var trun = this.getSubBox(traf, "trun");
        if (trun == null) {
            return false;
        }
        // ISO/IEC 14496-12:2012(E) .. pages 5 and 57
        // bytes: (size 4), (name 4), (version 1 + tr_flags 3)
        var flags = trun.slice(10, 13); // console.log(flags);
        var f = flags[1] & 4; // console.log(f);
        return f == 4;
    };
    return ffmpeg;
}());
exports.ffmpeg = ffmpeg;
