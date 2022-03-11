import { spawn } from "child_process";
import { promisify } from "util";
import { WebSocket } from "ws";
const MP4Box = require('./mp4box.all.js');

export class codec {
       
    rtspLinkOrVideo: string;
    sleep = promisify(setTimeout);
    codecInfo: string;
    pid:number;
    fragmentQueue: any[];
    stopProcess: boolean;
    filePos:number;
    mp4boxfile:any;
    wsConnList!: WebSocket;
    frag_duration: string = "60000";
    ffmpegLocation: string = "./ffmpeg/ffmpeg"
    constantRunning:boolean = false;

    constructor(rtspLinkOrVideo:string)
    {
        this.rtspLinkOrVideo = rtspLinkOrVideo;
        this.codecInfo = "a";
        this.pid = 0;
        this.fragmentQueue = Array();
        this.stopProcess = false;
        this.filePos = 0;
        this.mp4boxfile = MP4Box.createFile();
    }

    startRTSP()
    {
        const codecProc = spawn(this.ffmpegLocation, [
            "-i", this.rtspLinkOrVideo,
            "-c:v", "copy",                                              //Tell FFmpeg to copy the video stream as is (without decoding and encoding)                                                               
            "-an",                                                       //No audio
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-frag_duration", this.frag_duration,                        //Create fragments that are duration microseconds long
            "-fflags", "nobuffer",
            "-tune", "zerolatency",
            "-f", "mp4",                                                 //Define pipe format to be mp4
            "-"
        ]);

        this.pid = codecProc.pid!;
        console.log(this.pid);
        this.constantRunning = true;
        codecProc.stdout.on("data", (data) => {
            this.fragmentQueue.push(data);
        });
    }

    start()
    {
        const codecProc = spawn(this.ffmpegLocation, [
            "-stream_loop", "-1",
            "-i", this.rtspLinkOrVideo,
            "-c:v", "copy",                                              //Tell FFmpeg to copy the video stream as is (without decoding and encoding)                                                               
            "-an",                                                       //No audio
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-frag_duration", this.frag_duration,                        //Create fragments that are duration microseconds long
            "-fflags", "nobuffer",
            "-tune", "zerolatency",
            "-f", "mp4",                                                 //Define pipe format to be mp4
            "-"
        ]);

        this.pid = codecProc.pid!;
        codecProc.stdout.on("data", (data) => {
            this.fragmentQueue.push(data);
        });
    }

    exit()
    {
        if(this.constantRunning)
            process.kill(this.pid!,0);
        this.stopProcess = true;    
    }

    async getCodec()
    {
        this.onready(this);
        while (!this.stopProcess) {
            while (this.fragmentQueue.length > 0)
            {
                const data = this.fragmentQueue.shift();
                if(data)
                {
                var ab = data.buffer;
                ab.fileStart = this.filePos;
                this.filePos += ab.byteLength;
                this.mp4boxfile.appendBuffer(ab);
                }
                else{
                    this.mp4boxfile.flush();
                }
                await this.sleep(1);
            }
            await this.sleep(20);
        }
        return;
    }

    onready(e:codec)
    {
        this.mp4boxfile.onMoovStart = function () {
            console.log("Starting to receive File Information");
        }

        this.mp4boxfile.onError = function(e:any) {
            console.log("error",e);
        }

        this.mp4boxfile.onReady = function (info:any) {
            var mime = 'video/mp4; codecs=\"';
            for (var i = 0; i < info.tracks.length; i++) {
                if (i !== 0) mime += ',';
                mime+= info.tracks[i].codec;
            }
            mime += '\"';
            console.log(mime);
            e.codecInfo = mime;
            e.stopProcess = true;
            e.wsConnList.send(e.codecInfo);
            e.wsConnList.close();
            e.exit();
        };
    }

    toArrayBuffer(buffer:any) {
        var ab = new ArrayBuffer(buffer.length);
        var view = new Uint8Array(ab);
        for (var i = 0; i < buffer.length; ++i) {
            view[i] = buffer[i];
        }
        return ab;
    }

    typedArrayToBuffer(array: Uint8Array): ArrayBuffer {
        return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset)
    }
}
