import { spawn } from "child_process";
import { promisify } from "util";
import { WebSocket } from "ws";

export class ffmpeg{
fragmentQueue: any[];
rtspLinkOrVideo: string;
sleep = promisify(setTimeout);
frag_duration: string = "60000";
wsConnList: Map<number, WebSocket>;
pid: number;
isProcess:boolean;
ftyp: any = null;
moov: any = null;
moof: any = null;
wsConnDataRecord: Map<number, number>;
headersNotPresent:boolean;
ffmpegLocation:string = "ffmpeg";
constantRunning: boolean = false;

constructor(rtspLinkOrVideo: string)
{
    this.rtspLinkOrVideo = rtspLinkOrVideo;
    this.fragmentQueue = Array();
    this.wsConnList = new Map<number, WebSocket>();
    this.pid = 0;
    this.isProcess = true;
    this.wsConnDataRecord = new Map<number, number>();
    this.headersNotPresent = true;
}

startRTSP()
{
    const ffmpegProc = spawn(this.ffmpegLocation, [
        "-i", this.rtspLinkOrVideo,
        "-c:v", "copy",                                              //Tell FFmpeg to copy the video stream as is (without decoding and encoding)                                                               
        "-an",                                                       //No audio
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "-frag_duration", this.frag_duration,                        //Create fragments that are duration microseconds long
        "-fflags", "nobuffer",
        "-tune", "zerolatency",
        "-copytb", "1",
        "-f", "mp4",                                                  //Define pipe format to be mp4
        "-"
    ]);
    //ffmpeg -i rtsp://192.168.1.155:8080/h264_ulaw.sdp -c:v copy -an -movflags frag_keyframe+empty_moov+default_base_moof -frag_duration 60000 -fflags nobuffer -tune zerolatency -f mp4 -
    this.pid = ffmpegProc.pid!;
    console.log(this.pid);
    ffmpegProc.stdout.on("data", (data) => {
        // console.log(data);
        this.fragmentQueue.push(data);
        this.saveInitialFragment(data.buffer);
    });
    ffmpegProc.stderr.on("data", (data) => {
        //  console.log("error " +data);
    });
}    

start()
{
    const ffmpegProc = spawn(this.ffmpegLocation, [
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

    this.pid = ffmpegProc.pid!;
       
    ffmpegProc.stdout.on("data", (data) => {
        this.fragmentQueue.push(data);
        this.saveInitialFragment(data.buffer);
    });
}

exit()
{
    if(this.wsConnList.size == 0)
    {
        process.kill(this.pid!,0);
        this.isProcess = false;
    }
}
    
   async sendBufferData(){
       await this.sleep(10);
        while(this.isProcess) {
            this.exit();
            while (this.fragmentQueue.length > 0)
            {
            const data = this.fragmentQueue.shift();
            for (let [key,wsConn] of this.wsConnList)
            {   
                // if(this.headersNotPresent)
                // {
                    if (this.wsConnDataRecord.get(key)==0){
                        if (this.ftyp!=null){
                            wsConn.send(this.ftyp);
                            this.wsConnDataRecord.set(key, 1);
                        }                
                    }
                    else if (this.wsConnDataRecord.get(key)==1){
                        if (this.moov!=null){
                            wsConn.send(this.moov);
                        }
                        this.wsConnDataRecord.set(key, 2);
                    }
                    else if (this.wsConnDataRecord.get(key)==2){
                        if (this.getNameOfBox(data)=="moof" && this.hasFirstSampleFlag(new Uint8Array(data))){ 
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
            await this.sleep(1);
        }
            await this.sleep(50);
        }
    }

    saveInitialFragment(data: any){
        if (this.moof==null){
            if (this.getNameOfBox(data)=="ftyp") {
                console.log("got ftyp");
                this.ftyp=data;
            }
            else if (this.getNameOfBox(data)=="moov") {
                console.log("got moov");
                this.moov=data;
            }
            else if (this.getNameOfBox(data)=="moof") {
                console.log("got moof");
                this.moof=data;
            }
        }
    }

        //get ftyp, moov,moof box
    getNameOfBox(data:any){
        try {
            let packet = new Uint8Array(data);
            let res = this.getBox(packet, 0);
            return res[1];
        }
        catch (e){
            console.log(e);
            return null;
        }
    }
    
    toInt(arr:any, index:number) { // From bytes to big-endian 32-bit integer.  Input: Uint8Array, index
        let dv = new DataView(arr.buffer, 0);
        return dv.getInt32(index, false); // big endian
    }
    
    bytesToString(arr:any, fr:number, to:number) { // From bytes to string.  Input: Uint8Array, start index, stop index.
        return String.fromCharCode.apply(null, arr.slice(fr,to));
    }
    
    getBox(arr:any, i:number) { // input Uint8Array, start index
        return [this.toInt(arr, i), this.bytesToString(arr, i+4, i+8)]
    }
    
    getSubBox(arr:any, box_name:any) { // input Uint8Array, box name
        let i = 0;
        let res = this.getBox(arr, i);
        let main_length = res[0]; let name = res[1]; // this boxes length and name
        i = i + 8;
    
        let sub_box = null;
    
        while (i < main_length) {
            res = this.getBox(arr, i);
            let l = res[0]; name = res[1];
    
            if (box_name == name) {
                sub_box = arr.slice(i, i+Number(l))
            }
            i = i + Number(l);
        }
        return sub_box;
    }
    
    hasFirstSampleFlag(arr: any) { // input Uint8Array
            // [moof [mfhd] [traf [tfhd] [tfdt] [trun]]]
    
        let traf = this.getSubBox(arr, "traf");
        if (traf==null) { return false; }
    
        let trun = this.getSubBox(traf, "trun");
        if (trun==null) { return false; }
    
        // ISO/IEC 14496-12:2012(E) .. pages 5 and 57
        // bytes: (size 4), (name 4), (version 1 + tr_flags 3)
        let flags = trun.slice(10,13); // console.log(flags);
        let f = flags[1] & 4; // console.log(f);
        return f == 4;
    }  
}


