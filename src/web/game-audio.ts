import effectLevels from '../../public/audio/sfx/levels.json' with {type:'json'};
import {assetRegistry} from '../assets/registry';
import {scheduleEffect,type EffectOptions} from './sound-design';
// CC0 battle recordings and original synthesized result cues/effects. No Pokémon soundtrack is bundled.
import {musicScores,musicFiles,musicTrackLevels,type MusicTrack} from './music-score';
export type AudioLevels = {muted:boolean; effectsVolume:number; musicVolume:number};
let context: AudioContext | undefined;
let settings: AudioLevels = {muted:true,effectsVolume:40,musicVolume:30};
let musicGain: GainNode | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let active = false;
let activeTrack:MusicTrack|null=null;
let step = 0;
let nextTime = 0;
let cry: HTMLAudioElement | undefined;
let recording:HTMLAudioElement|undefined;
let recordingSource:MediaElementAudioSourceNode|undefined;
let musicOutput:AudioNode[]=[];
type MusicVoice={master:GainNode;fade:GainNode;output:AudioNode[];player?:HTMLAudioElement;source?:MediaElementAudioSourceNode;cleanup?:ReturnType<typeof setTimeout>;started:boolean};
let currentVoice:MusicVoice|undefined;
let previousVoice:MusicVoice|undefined;
const voices=new Set<MusicVoice>();
let musicBus:{context:BaseAudioContext;limiter:WaveShaperNode;duck:GainNode}|undefined;
let effectsGain:GainNode|undefined;
let effectEpoch=0,lastCursor=0;
const effectVoices=new Set<{stop:()=>void;dispose?:()=>void;cleanup:ReturnType<typeof setTimeout>}>();
const peakCurve=Float32Array.from({length:4097},(_,i)=>{const value=i/2048-1,a=Math.abs(value);return a<=.8 ? value : Math.sign(value)*(.8+.1*(1-((1-a)/.2)**2));});
function audioBus(ctx:BaseAudioContext){
 if(musicBus?.context!==ctx){const limiter=ctx.createWaveShaper(),duck=ctx.createGain();limiter.curve=peakCurve;limiter.connect(ctx.destination);duck.connect(limiter);musicBus={context:ctx,limiter,duck};}
 return musicBus;
}
function connectMusicOutput(ctx:BaseAudioContext,master:GainNode,track:MusicTrack) {
  const bus=audioBus(ctx);
  const fade=ctx.createGain(),level=ctx.createGain();
  level.gain.value=musicTrackLevels[track];
  master.connect(fade);fade.connect(level);level.connect(bus.duck);
  return [fade,level];
}
function disposeVoice(voice:MusicVoice) {
  if(voice.cleanup)clearTimeout(voice.cleanup);
  voice.player?.pause();
  if(voice.player){voice.player.onplaying=null;voice.player.onerror=null;voice.player.removeAttribute('src');voice.player.load();}
  voice.source?.disconnect();voice.master.disconnect();voice.output.forEach(node=>node.disconnect());voices.delete(voice);
}
function retireVoice(voice:MusicVoice,duration:number) {
  if(voice.cleanup)clearTimeout(voice.cleanup);
  const now=engine().currentTime;
  voice.fade.gain.cancelAndHoldAtTime(now);voice.fade.gain.linearRampToValueAtTime(0,now+duration);
  voice.cleanup=setTimeout(()=>disposeVoice(voice),duration*1000+80);
}
function beginTransition(voice:MusicVoice) {
  if(currentVoice!==voice || voice.started)return;
  voice.started=true;
  const now=engine().currentTime,duration=previousVoice ? 1.1 : .25;
  voice.fade.gain.setValueAtTime(0,now);voice.fade.gain.linearRampToValueAtTime(1,now+duration);
  if(previousVoice){retireVoice(previousVoice,duration);previousVoice=undefined;}
}
function detachPlayback() {
  if(timer)clearInterval(timer);timer=undefined;
  const detached=currentVoice;currentVoice=undefined;musicGain=undefined;musicOutput=[];recording=undefined;recordingSource=undefined;
  return detached;
}
type Instrument='lead'|'keys'|'pad'|'bass';
function instrument(note:number,at:number,duration:number,gain:GainNode,volume:number,kind:Instrument) {
  const ctx=engine(),envelope=ctx.createGain(),filter=ctx.createBiquadFilter();
  filter.type='lowpass';filter.Q.value=kind==='lead' ? .65 : .3;
  filter.frequency.setValueAtTime(kind==='bass' ? 650 : kind==='pad' ? 1600 : 3800,at);
  if(kind==='lead')filter.frequency.exponentialRampToValueAtTime(1700,at+duration);
  const attack=kind==='pad' ? .09 : kind==='lead' ? .025 : .006,release=kind==='pad' ? .25 : .07;
  envelope.gain.setValueAtTime(.0001,at);envelope.gain.linearRampToValueAtTime(volume,at+Math.min(attack,duration*.3));
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*(kind==='keys' ? .12 : .65)),at+duration);
  envelope.gain.exponentialRampToValueAtTime(.0001,at+duration+release);
  filter.connect(envelope);envelope.connect(gain);
  const voices=kind==='lead' || kind==='pad' ? 2 : 1;
  for(let i=0;i<voices;i++){
    const osc=ctx.createOscillator();osc.frequency.value=440*2**((note-69)/12);
    if(kind==='keys')osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(6),new Float32Array([0,1,.45,.18,.08,.025])));
    else osc.type=kind==='bass' ? 'triangle' : 'sawtooth';
    osc.detune.value=voices===2 ? (i===0 ? -6 : 6) : 0;osc.connect(filter);osc.start(at);osc.stop(at+duration+release+.01);
    osc.onended=()=>{osc.disconnect();if(i===voices-1){filter.disconnect();envelope.disconnect();}};
  }
}
export function stopCry() {if(cry){cry.pause();cry.removeAttribute('src');cry.load();cry=undefined;}}
// Only local, separately cleared recordings are used. No third-party cry is bundled.
export function playCry(id:number) {
  stopCry();
  if(settings.muted || !settings.effectsVolume || document.hidden) return;
  const file=assetRegistry.cry(id);if(!file)return;
  const candidate=new Audio(file); cry=candidate;
  candidate.volume=settings.effectsVolume/100;
  candidate.onerror=()=>{if(cry===candidate)stopCry();};
  candidate.onended=()=>{if(cry===candidate)stopCry();};
  void candidate.play().catch(()=>{if(cry===candidate)stopCry();});
}
function engine() {context ??= new AudioContext(); return context;}
function tone(note:number, at:number, duration:number, gain:GainNode, volume:number, wave:OscillatorType) {
  const ctx = engine(), osc = ctx.createOscillator(), envelope = ctx.createGain();
  osc.type = wave; osc.frequency.value = 440 * 2 ** ((note - 69) / 12);
  envelope.gain.setValueAtTime(.0001,at); envelope.gain.linearRampToValueAtTime(volume,at+.01);
  envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(envelope); envelope.connect(gain); osc.start(at); osc.stop(at+duration+.01);
  osc.onended = () => {osc.disconnect();envelope.disconnect();};
}
export function updateAudio(next:AudioLevels) {
  settings = next;
  if(context && effectsGain)effectsGain.gain.setTargetAtTime(next.muted?0:next.effectsVolume/100,context.currentTime,.012);
  if(next.muted || !next.effectsVolume)stopEffects();
  if(next.muted || !next.effectsVolume) stopCry();
  else if(cry) cry.volume=next.effectsVolume/100;
  if (context) for(const voice of voices) {
    // User volume is independent of transition fades, including outgoing tracks.
    voice.master.gain.cancelScheduledValues(context.currentTime);
    voice.master.gain.setTargetAtTime(next.muted ? 0 : next.musicVolume / 100,context.currentTime,.05);
  }
  if (active && !next.muted) void unlockAudio();
}
export async function unlockAudio() {
  try {await engine().resume(); if (active && !settings.muted) {
    startPlayback();
  }} catch { /* Browser autoplay or unavailable audio must never block play. */ }
}
function startPlayback() {
  if (!active || settings.muted || document.hidden) return;
  if(recording){void recording.play().catch(()=>{});return;}
  if(timer)return;
  const ctx = engine(),track=activeTrack ?? 'trainer'; musicGain ??= ctx.createGain();
  musicOutput=connectMusicOutput(ctx,musicGain,track);
  const gain=musicGain,voice:MusicVoice={master:gain,fade:musicOutput[0] as GainNode,output:musicOutput,started:false};
  currentVoice=voice;voices.add(voice);gain.gain.value=settings.musicVolume/100;voice.fade.gain.value=0;
  nextTime=ctx.currentTime+.03; step=0;
  const file=musicFiles[track];
  if(file){
    const player=new Audio(file);player.loop=true;player.preload='auto';recording=player;
    recordingSource=ctx.createMediaElementSource(player);recordingSource.connect(musicGain);
    voice.player=player;voice.source=recordingSource;player.onplaying=()=>beginTransition(voice);
    const failed=()=>{
      if(!voices.has(voice))return;
      if(currentVoice===voice){detachPlayback();if(previousVoice){retireVoice(previousVoice,.18);previousVoice=undefined;}}
      else if(previousVoice===voice)previousVoice=undefined;
      disposeVoice(voice);
    };
    player.onerror=failed;
    // Autoplay denial may be retried after a user gesture; a missing/invalid file cannot.
    void player.play().catch(error=>{if(error?.name!=='NotAllowedError')failed();});return;
  }
  beginTransition(voice);
  const score=musicScores[track]!,beat=30/score.bpm;
  const gentle=track==='reward' || track==='defeat',major=['reward','clear'].includes(track);
  const schedule = () => {
    if (document.hidden || settings.muted || settings.musicVolume === 0 || ctx.state !== 'running') return;
    if (nextTime < ctx.currentTime) nextTime=ctx.currentTime+.02;
    while (nextTime < ctx.currentTime+.2) {
      const note=score.melody[step%score.melody.length],chord=score.chords[Math.floor(step/8)%score.chords.length];
      const previous=score.melody[(step-1+score.melody.length)%score.melody.length];
      if(note!==-99 && (step===0 || note!==previous)){
        let held=1;while(held<4 && score.melody[(step+held)%score.melody.length]===note)held++;
        instrument(score.root+note,nextTime,beat*(held-.08),gain,.034,gentle ? 'keys' : 'lead');
        // A restrained echo creates depth without smearing the bass or drums.
        instrument(score.root+note,nextTime+beat*1.5,beat*.6,gain,.006,'keys');
      }
      const eighth=step%8;
      if([0,3,4,6].includes(eighth))instrument(score.root-24+chord+(eighth===6 ? 7 : 0),nextTime,beat*(eighth===0 ? 2.7 : .85),gain,.095,'bass');
      const third=major ? (chord===9 ? 3 : 4) : ([8,10].includes(chord) ? 4 : chord===7 ? 4 : 3);
      if(eighth===0)for(const interval of [0,third,7,major ? 11 : 10])instrument(score.root-12+chord+interval,nextTime,beat*7.5,gain,.007,'pad');
      if([2,5,7].includes(eighth))for(const interval of [third,7,12])instrument(score.root+chord+interval,nextTime,beat*.55,gain,.013,'keys');
      if(score.drums){
        if([0,3,4].includes(eighth) || (eighth===7 && Math.floor(step/8)%4===3))kick(nextTime,gain);
        if(eighth===2 || eighth===6){noise(nextTime,.13,.038,1100,gain);tone(38,nextTime,.1,gain,.025,'triangle');}
        noise(nextTime,eighth===7 ? .09 : .025,eighth%2===0 ? .015 : .008,7500,gain);
        if(Math.floor(step/8)%8===7 && eighth>=4)noise(nextTime,.06,.025,1800,gain);
      }
      step++; nextTime+=beat;
    }
  };
  schedule(); timer=setInterval(schedule,80);
}
export function stopMusic() {
  active=false; activeTrack=null;
  if(typeof document!=='undefined')delete document.body.dataset.musicTrack;
  detachPlayback();previousVoice=undefined;
  for(const voice of voices)retireVoice(voice,.18);
}
export function startMusic(track:MusicTrack='trainer') {
  if(active && activeTrack===track)return;
  const outgoing=detachPlayback();
  if(outgoing){if(previousVoice || !outgoing.started)retireVoice(outgoing,.18);else previousVoice=outgoing;}
  active=true;activeTrack=track;document.body.dataset.musicTrack=track;
  if(!settings.muted) void unlockAudio();
}
let drumBuffer:AudioBuffer|undefined;
function noise(at:number,duration:number,volume:number,frequency:number,gain:GainNode) {
  const ctx=engine();
  if(!drumBuffer){drumBuffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.15),ctx.sampleRate);const data=drumBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),envelope=ctx.createGain();
  source.buffer=drumBuffer;filter.type='highpass';filter.frequency.value=frequency;
  envelope.gain.setValueAtTime(volume,at);envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(filter);filter.connect(envelope);envelope.connect(gain);source.start(at);source.stop(at+duration);
  source.onended=()=>{source.disconnect();filter.disconnect();envelope.disconnect();};
}
function kick(at:number,gain:GainNode) {
  const ctx=engine(),osc=ctx.createOscillator(),envelope=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(135,at);osc.frequency.exponentialRampToValueAtTime(40,at+.1);
  envelope.gain.setValueAtTime(.12,at);envelope.gain.exponentialRampToValueAtTime(.0001,at+.13);osc.connect(envelope);envelope.connect(gain);osc.start(at);osc.stop(at+.14);osc.onended=()=>{osc.disconnect();envelope.disconnect();};
}
export function stopEffects(){
 effectEpoch++;if(context&&musicBus){const now=context.currentTime;musicBus.duck.gain.cancelAndHoldAtTime(now);musicBus.duck.gain.setTargetAtTime(1,now,.04);}
 for(const voice of effectVoices){voice.stop();voice.dispose?.();clearTimeout(voice.cleanup);}effectVoices.clear();
}
export function effect(kind:string,color='normal',options:EffectOptions={}) {
 if(settings.muted || !settings.effectsVolume || document.hidden)return;
 if(kind==='cursor'){const now=performance.now();if(now-lastCursor<65)return;lastCursor=now;}
 const epoch=effectEpoch;
 try{const ctx=engine();void ctx.resume().then(()=>{
  if(epoch!==effectEpoch || settings.muted || !settings.effectsVolume || document.hidden)return;
  const bus=audioBus(ctx);effectsGain??=ctx.createGain();if(!effectsGain.numberOfOutputs)return;
  effectsGain.disconnect();effectsGain.connect(bus.limiter);effectsGain.gain.setValueAtTime(settings.effectsVolume/100,ctx.currentTime);
  if(effectVoices.size>=8){const oldest=effectVoices.values().next().value!;oldest.stop();oldest.dispose?.();clearTimeout(oldest.cleanup);effectVoices.delete(oldest);}
  const level=ctx.createGain();level.gain.value=(effectLevels as Record<string,number>)[kind==='move'?'move-'+color:kind]??1;level.connect(effectsGain);
  const sound=scheduleEffect(ctx,level,kind,color,options),voice={stop:sound.stop,dispose:()=>setTimeout(()=>level.disconnect(),60),cleanup:setTimeout(()=>{level.disconnect();effectVoices.delete(voice);},(sound.duration+.1)*1000)};effectVoices.add(voice);
  if(kind.startsWith('tera-') || kind.startsWith('mega-') || kind.startsWith('dynamax-') || (kind==='hit' && options.impact && options.impact!=='weak')){
   const now=ctx.currentTime;bus.duck.gain.cancelAndHoldAtTime(now);bus.duck.gain.setTargetAtTime(.72,now,.025);bus.duck.gain.setTargetAtTime(1,now+Math.max(.15,sound.duration),.15);
  }
 }).catch(()=>{});}catch{ /* Sound must never block input or battle playback. */ }
}
export function pauseForVisibility() {
  if(document.hidden) {stopCry();stopEffects();for(const voice of voices){voice.player?.pause();if(voice.cleanup)disposeVoice(voice);}void context?.suspend();}
  else if(active&&!settings.muted) {void previousVoice?.player?.play().catch(()=>{});void unlockAudio();}
}
