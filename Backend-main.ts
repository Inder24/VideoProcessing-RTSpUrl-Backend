import  {WebSocket, WebSocketServer } from "ws";
import * as http from "http";
import { ffmpeg} from "./ffmpeg";
import {codec} from "./codec";
import {transcoder} from "./transcoder";


const wss = new WebSocketServer({
    port: 8187
});

const wss2 = new WebSocketServer({
    port: 8185
});

const wss3 = new WebSocketServer({
    port: 8190
});

const wsConnList = new Map<number, WebSocket>();
const ffmpegList = new Map<string, ffmpeg>();

wss.on("connection",(wsClient: WebSocket, request: http.IncomingMessage) => {

    const wsId = Date.now();

    let myffmpeg: ffmpeg;

    wsClient.on('message', (data) => {
        console.log('received %s', data);
    });

    wsClient.on('close', () => {
        wsClient.removeAllListeners();
        if (wsConnList.has(wsId)) {
            console.log("Removed " + wsId);
            wsConnList.delete(wsId);
        }
        ffmpegList.forEach((obj)=>{
            if (obj.wsConnList.has(wsId)){
                obj.wsConnList.delete(wsId);
                obj.wsConnDataRecord.delete(wsId);
            }
        })
    });
     
    wsConnList.set(wsId, wsClient);

    console.log("Connected " + wsId);

    let url: string = request.url as string;
    let rtspLink: string = url.substring(1);
    console.log(rtspLink);
    if (!ffmpegList.has(rtspLink))
    {
        myffmpeg = new ffmpeg(rtspLink);
        ffmpegList.set(rtspLink, myffmpeg);
        myffmpeg.wsConnList.set(wsId, wsClient);
        myffmpeg.wsConnDataRecord.set(wsId, 0);

        myffmpeg.startRTSP();
        myffmpeg.sendBufferData();
    }
    else if (ffmpegList.has(rtspLink))
    {
        myffmpeg = ffmpegList.get(rtspLink)!;

        if(myffmpeg.isProcess == false)
        {
          myffmpeg = new ffmpeg(rtspLink);
          myffmpeg.wsConnList.set(wsId, wsClient);
          myffmpeg.wsConnDataRecord.set(wsId, 0);
          myffmpeg.startRTSP();
          myffmpeg.sendBufferData();
        }  
        else
        {      
          myffmpeg.wsConnList.set(wsId, wsClient);
          myffmpeg.wsConnDataRecord.set(wsId, 0);
        }
    }
});

wss2.on("connection", (wsClient: WebSocket, request: http.IncomingMessage) => {
    let mycodec: codec;
    wsClient.on('message', (data) => {
        console.log('received %s', data);
    });
    let url: string = request.url as string;

    let getValue: string = url.substring(1);

    console.log(getValue);

    mycodec = new codec(getValue);
    mycodec.startRTSP();  
    mycodec.wsConnList = wsClient;
    mycodec.getCodec();
});



wss3.on("connection", (wsClient: WebSocket, request: http.IncomingMessage) => {
    let mytranscoder: transcoder;
    let oldUrl: string ="";
    let newUrl: string="";
    let receivedValue: boolean = false;
    wsClient.on('message', (data) => {
        let output = data.toString().split('rtsp');
        if(output[0][2] === 'o')
            oldUrl = "rtsp" +output[1].slice(0,-2);
        else
        { newUrl = "rtsp" +output[1].slice(0,-2);
          receivedValue = true;
        }
    });
    if(receivedValue)
    {
        mytranscoder = new transcoder(oldUrl,newUrl);
        mytranscoder.startRTSP(); 
    }
});
