import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {chromium} from '@playwright/test';
const source=stripTypeScriptTypes(readFileSync('src/web/sound-design.ts','utf8').replace(/export /g,''));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.addScriptTag({content:source+`;globalThis.soundCatalog=effectPreviews;globalThis.renderSound=async function(kind,color,options){const ctx=new OfflineAudioContext(1,57600,48000);scheduleEffect(ctx,ctx.destination,kind,color,options,0);const buffer=await ctx.startRendering();return Array.from(buffer.getChannelData(0));};`});
 const catalog=await page.evaluate(()=>globalThis.soundCatalog),levels={},report={sampleRate:48000,original:true,clips:[]};
 const clips=new Map();
 for(const [id,cue] of Object.entries(catalog)){
  const data=await page.evaluate(c=>globalThis.renderSound(c.kind,c.color,c.options),cue);let peak=0,squares=0,active=0;for(const n of data){peak=Math.max(peak,Math.abs(n));if(Math.abs(n)>.001){squares+=n*n;active++;}}
  const rms=Math.sqrt(squares/Math.max(1,active)),key=cue.kind==='move'?'move-'+cue.color:cue.kind;
  levels[key]??=Math.min(3.2,.075/Math.max(.001,rms),.65/Math.max(.001,peak));
  const gain=levels[key];report.clips.push({id,name:cue.name,key,rawPeak:peak,rawRMS:rms,gain,outputPeak:peak*gain});clips.set(id,data.map(n=>n*gain));
 }
 for(const key of Object.keys(levels)){const group=report.clips.filter(c=>c.key===key),peak=Math.max(...group.map(c=>c.rawPeak));const previous=levels[key];levels[key]=Math.min(previous,.65/Math.max(.001,peak));for(const clip of group){clip.gain=levels[key];clip.outputPeak=clip.rawPeak*clip.gain;clips.set(clip.id,clips.get(clip.id).map(n=>n*clip.gain/previous));}}
 mkdirSync('public/audio/sfx',{recursive:true});mkdirSync('artifacts/audio',{recursive:true});
 writeFileSync('public/audio/sfx/levels.json',JSON.stringify(levels,null,2));writeFileSync('artifacts/audio/effect-levels.json',JSON.stringify(report,null,2));
 const ids=['cursor','click','cancel','move-fire','move-water','move-electric','hit','strong','mega','megaBurst','dynamax','dynamaxGrow'];let samples=[];
 for(const id of ids){const clip=clips.get(id);let end=clip.length;while(end>0&&Math.abs(clip[end-1])<.0001)end--;samples.push(...clip.slice(0,end),...Array(16800).fill(0));}
 const wav=Buffer.alloc(44+samples.length*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);samples.forEach((n,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,n)) *32767),44+i*2));writeFileSync('artifacts/audio/effects-preview.wav',wav);console.log(JSON.stringify({clips:report.clips.length,duration:samples.length/48000,maxPeak:Math.max(...report.clips.map(c=>c.outputPeak)),levels}));
}finally{await browser.close();}
