import {readFileSync,writeFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {chromium} from '@playwright/test';

// Measure production result cues offline, alongside decoded recordings. This is a
// gated, frequency-weighted RMS comparison, not a certified LUFS measurement.
const code=readFileSync('src/web/music-score.ts','utf8').replace(/export /g,'')+'\n'+readFileSync('src/web/game-audio.ts','utf8').replace(/^import .*;$/gm,'').replace(/export /g,'');
const render=`
globalThis.connectMusicOutput=connectMusicOutput;

globalThis.renderResultCue=async function(track){
  const score=musicScores[track],duration=score.melody.length*30/score.bpm;
  const offline=new OfflineAudioContext(2,Math.ceil((duration+.5)*48000),48000);
  let now=0,scheduler;
  context=new Proxy(offline,{get(target,key){if(key==='state')return 'running';if(key==='currentTime')return now;const value=Reflect.get(target,key,target);return typeof value==='function' ? value.bind(target) : value;}});
  settings={muted:false,musicVolume:100,effectsVolume:0};active=true;activeTrack=track;
  timer=undefined;recording=undefined;musicGain=undefined;drumBuffer=undefined;
  const original=setInterval;globalThis.setInterval=(callback)=>{scheduler=callback;return 1;};
  try{startPlayback();while(now<duration){now+=.08;scheduler();}}finally{globalThis.setInterval=original;}
  return await offline.startRendering();
};`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();await page.addScriptTag({content:stripTypeScriptTypes(code+'\n'+render)});
  const sources=JSON.parse(readFileSync('public/audio/music-sources.json','utf8')),results=[];
  for(const id of ['trainer','elite','gym','villain','champion','rare','reward','clear','defeat']){
    const source=sources.find(s=>s.id===id),encoded=source ? readFileSync(source.path).toString('base64') : null;
    const result=await page.evaluate(async({id,encoded})=>{
      let buffer;
      if(encoded){const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const decoder=new AudioContext();buffer=await decoder.decodeAudioData(bytes.buffer);await decoder.close();}
      else buffer=await globalThis.renderResultCue(id);
      if(encoded){
        const playback=new OfflineAudioContext(buffer.numberOfChannels,buffer.length,buffer.sampleRate),player=playback.createBufferSource(),master=playback.createGain();
        player.buffer=buffer;player.connect(master);globalThis.connectMusicOutput(playback,master,id);player.start();buffer=await playback.startRendering();
      }
      let peak=0;for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));}
      const offline=new OfflineAudioContext(buffer.numberOfChannels,buffer.length,buffer.sampleRate),source=offline.createBufferSource(),shelf=offline.createBiquadFilter(),cut=offline.createBiquadFilter();
      source.buffer=buffer;shelf.type='highshelf';shelf.frequency.value=1500;shelf.gain.value=4;cut.type='highpass';cut.frequency.value=38;cut.Q.value=.5;
      source.connect(shelf);shelf.connect(cut);cut.connect(offline.destination);source.start();const weighted=await offline.startRendering();
      const blocks=[],size=Math.round(weighted.sampleRate*.4);
      for(let start=0;start<weighted.length;start+=size){let energy=0,count=0;for(let ch=0;ch<weighted.numberOfChannels;ch++){const data=weighted.getChannelData(ch);for(let i=start;i<Math.min(start+size,data.length);i++){energy+=data[i]*data[i];count++;}}blocks.push(energy/count);}
      const maximum=Math.max(...blocks),audible=blocks.filter(v=>v>maximum/100),rms=Math.sqrt(audible.reduce((sum,v)=>sum+v,0)/audible.length);
      return {id,duration:buffer.duration,peak,weightedRms:rms,weightedDb:20*Math.log10(rms)};
    },{id,encoded});
    results.push(result);console.log(`${id}: ${result.weightedDb.toFixed(2)} dB, peak ${result.peak.toFixed(3)}`);
  }
  const anchor=results.find(r=>r.id==='trainer').weightedRms;
  const report={method:'400 ms block RMS, 1500 Hz +4 dB shelf, 38 Hz highpass, -20 dB relative silence gate. Whole file/result loop. Not LUFS.',anchor:'trainer',tracks:results.map(r=>({...r,recommendedGain:Number((anchor/r.weightedRms).toFixed(3))}))};
  writeFileSync('artifacts/qa/audio/music-levels.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
