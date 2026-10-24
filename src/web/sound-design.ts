// Original procedural sound design: filtered noise, frequency sweeps and layered transients.
import type {SoundCue} from './move-presentation';
export type EffectOptions={category?:string;power?:number;impact?:'weak'|'strong'|'critical';cue?:SoundCue;speed?:1|2|4};
type Layer={wave:OscillatorType|'noise';from:number;to:number;duration:number;volume:number;delay?:number;attack?:number;filter?:BiquadFilterType};
const tone=(from:number,to:number,duration:number,volume=.14,wave:OscillatorType='sine',delay=0,attack=.004):Layer=>({wave,from,to,duration,volume,delay,attack});
const hiss=(from:number,to:number,duration:number,volume=.16,delay=0,filter:BiquadFilterType='bandpass',attack=.006):Layer=>({wave:'noise',from,to,duration,volume,delay,filter,attack});
export const effectTypeNames:Record<string,string>={normal:'노말',fire:'불꽃',water:'물',grass:'풀',electric:'전기',ice:'얼음',fighting:'격투',poison:'독',ground:'땅',flying:'비행',psychic:'에스퍼',bug:'벌레',rock:'바위',ghost:'고스트',dragon:'드래곤',dark:'악',steel:'강철',fairy:'페어리'};
export const effectPreviews:Record<string,{name:string;kind:string;color?:string;options?:EffectOptions}>={
 cursor:{name:'커서 이동',kind:'cursor'},click:{name:'결정',kind:'click'},cancel:{name:'취소',kind:'cancel'},hit:{name:'일반 피격',kind:'hit'},strong:{name:'효과가 굉장한 피격',kind:'hit',options:{impact:'strong'}},critical:{name:'급소 피격',kind:'hit',options:{impact:'critical'}},weak:{name:'효과가 약한 피격',kind:'hit',options:{impact:'weak'}},heal:{name:'회복',kind:'heal'},switch:{name:'포켓몬 등장',kind:'switch'},faint:{name:'기절',kind:'faint'},up:{name:'능력 상승',kind:'stat-up'},down:{name:'능력 하락',kind:'stat-down'},mega:{name:'메가진화 충전',kind:'mega-charge'},megaBurst:{name:'메가진화 해방',kind:'mega-burst'},dynamax:{name:'다이맥스 에너지',kind:'dynamax-ball'},dynamaxGrow:{name:'다이맥스 등장',kind:'dynamax-grow'},victory:{name:'승리',kind:'victory'},defeat:{name:'패배',kind:'defeat'},partner:{name:'동료 영입',kind:'partner'},...Object.fromEntries(Object.entries(effectTypeNames).map(([color,name])=>['move-'+color,{name:name+' 기술',kind:'move',color}]))};
export function effectLayers(kind:string,color='normal',options:EffectOptions={}):Layer[]{
 if(kind==='cursor')return [tone(900,700,.045,.07)];
 if(kind==='click')return [tone(1000,1300,.075,.1),tone(1700,1500,.08,.04,'sine',.025)];
 if(kind==='cancel')return [tone(700,350,.1,.1)];
 if(kind==='hit'){const weak=options.impact==='weak',strong=options.impact==='strong'||options.impact==='critical',critical=options.impact==='critical';const duration=weak?.34:strong?1.05:.57,strength=weak?.6:critical?1.3:strong?1.15:1;return [tone(155,38,.18,.2*strength,'triangle'),hiss(3600,450,duration,.18*strength),...(strong?[hiss(2800,500,.46,.08,.13),tone(95,30,.42,.08,'triangle',.1)]:[]),...(critical?[hiss(5300,1200,.08,.12),tone(650,150,.12,.09,'sawtooth')]:[])];}
 if(kind==='heal'||kind==='partner'||kind==='victory')return [tone(660,660,.23,.11,'sine'),tone(830,830,.27,.09,'sine',.08),tone(990,990,.34,.09,'sine',.16),...(kind==='victory'?[tone(1320,1320,.45,.08,'triangle',.24)]:[])];
 if(kind==='defeat'||kind==='faint')return [tone(330,90,kind==='faint'?.42:.6,.13,'triangle'),hiss(700,180,.3,.07)];
 if(kind==='stat-up'||kind==='stat-down'){const up=kind==='stat-up';return [tone(up?260:900,up?1100:220,.3,.1,'sine'),hiss(up?600:2200,up?2500:400,.26,.08)];}
 if(kind==='switch'||kind==='dynamax-recall'||kind==='dynamax-end')return [hiss(2000,500,.25,.13),tone(500,kind==='switch'?1200:160,.24,.07,'sine')];
 if(kind==='tera-charge')return [tone(350,1400,.65,.08,'sine'),tone(525,2100,.65,.045,'sine',.04),hiss(900,5000,.6,.045,0,'highpass')];
 if(kind==='tera-shell')return [tone(1400,1600,.55,.05,'sine'),tone(2100,2400,.55,.025,'sine',.07)];
 if(kind==='tera-burst')return [hiss(7000,2500,.32,.085),tone(1800,3000,.34,.05,'sine')];
 if(kind==='tera-reveal')return [tone(660,660,.5,.06,'triangle'),tone(990,990,.5,.04,'sine',.07),tone(1320,1320,.55,.025,'sine',.14)];
 if(kind==='mega-charge')return [hiss(300,2600,.9,.13,0,'bandpass',.7),tone(200,650,.9,.08,'sine',0,.7),tone(300,980,.9,.04,'sine',0,.7)];
 if(kind==='mega-shell')return [tone(650,780,.6,.06,'sine',0,.06),tone(980,1170,.6,.04,'sine',0,.06)];
 if(kind==='mega-burst')return [hiss(5000,1400,.35,.15),tone(1300,1900,.3,.08,'sine'),tone(1900,2600,.32,.05,'sine',.025)];
 if(kind==='mega-flash')return [];
 if(kind==='mega-reveal')return [tone(440,440,.4,.08,'triangle'),tone(660,660,.42,.05,'sine'),tone(880,880,.5,.04,'sine',.04)];
 if(kind==='dynamax-ball')return [hiss(180,1600,.8,.15,0,'lowpass',.55),tone(55,140,.8,.16,'triangle',0,.4)];
 if(kind==='dynamax-release')return [hiss(2400,400,.4,.18),tone(120,35,.38,.18,'sine')];
 if(kind==='dynamax-grow')return [tone(65,28,1,.2,'triangle'),hiss(500,100,.8,.18,0,'lowpass'),tone(160,70,.7,.07,'sine',.12)];
 if(kind!=='move')return [];
 if(options.cue==='Rumble')return [hiss(280,90,.5,.23,0,'lowpass'),tone(65,28,.42,.15,'triangle')];
 if(options.cue==='Rush')return [hiss(2800,700,.18,.12),tone(200,70,.12,.08,'triangle',.1)];
 if(options.cue==='Voice')return [tone(340,680,.32,.08,'triangle'),tone(510,1020,.3,.05,'sine',.06)];
 if(options.cue==='Impact')return [hiss(1200,2800,.22,.12),tone(160,70,.15,.09,'triangle',.1)];
 if(options.cue==='Support')return [tone(420,820,.28,.08),hiss(600,1600,.28,.08)];
 if(options.category==='Status')return [tone(420,820,.28,.08),hiss(600,1600,.28,.08)];
 const types:Record<string,Layer[]>={
 normal:[hiss(1200,2800,.22,.12),tone(160,70,.15,.09,'triangle',.1)],
 fire:[hiss(450,1400,.42,.16,0,'lowpass'),hiss(520,1600,.34,.12,.07,'lowpass'),hiss(400,1250,.3,.1,.14,'lowpass'),tone(100,45,.35,.1,'triangle')],
 water:[hiss(800,2600,.42,.16),tone(420,180,.15,.07,'sine',.04),tone(550,250,.15,.06,'sine',.17)],
 grass:[hiss(2800,900,.17,.12),hiss(2300,600,.2,.11,.13),tone(360,600,.3,.06)],
 electric:[tone(1400,180,.09,.09,'sawtooth'),hiss(5200,2600,.06,.14),tone(1800,260,.08,.08,'sawtooth',.1),hiss(4000,1500,.22,.12,.28),tone(160,40,.18,.12,'triangle',.28)],
 ice:[tone(1800,2400,.28,.08),tone(2600,3200,.3,.04,'sine',.06),hiss(6500,3200,.22,.09)],
 fighting:[hiss(900,2200,.12,.14),tone(210,50,.19,.17,'triangle',.08)],
 poison:[tone(180,90,.2,.09),tone(290,130,.2,.09,'triangle',.12),hiss(450,1100,.33,.1)],
 ground:[hiss(280,90,.5,.23,0,'lowpass'),tone(65,28,.42,.15,'triangle')],
 flying:[hiss(1400,4800,.4,.18,0,'highpass'),tone(320,720,.27,.04)],
 psychic:[tone(320,960,.4,.1),tone(480,1440,.43,.07,'sine',.02),hiss(600,2600,.36,.06)],
 bug:[tone(2400,1500,.08,.07,'triangle'),tone(2800,1900,.08,.07,'triangle',.09),hiss(4200,2200,.2,.08,.08)],
 rock:[hiss(800,250,.3,.2),hiss(2300,600,.1,.13,.1),tone(90,40,.3,.11,'triangle')],
 ghost:[tone(620,230,.45,.09,'sine',0,.12),tone(930,340,.42,.05,'sine',.02,.13),hiss(1200,400,.4,.07,0,'bandpass',.2)],
 dragon:[tone(240,70,.42,.08,'sawtooth'),hiss(700,2100,.4,.15),tone(90,50,.4,.12,'triangle')],
 dark:[hiss(1700,300,.32,.15),tone(220,50,.38,.12,'triangle')],
 steel:[tone(900,860,.3,.09),tone(1540,1480,.26,.055),tone(2390,2310,.22,.04),hiss(4200,1500,.09,.1)],
 fairy:[tone(880,880,.32,.09),tone(1320,1320,.28,.06,'sine',.08),tone(1760,1760,.32,.04,'sine',.15)],
 };
 const layers=types[color]??types.normal;const weight=Math.max(.75,Math.min(1.15,(options.power??80)/100));
 return layers.map(l=>({...l,volume:l.volume*weight}));
}
const buffers=new WeakMap<BaseAudioContext,AudioBuffer>();
export function scheduleEffect(ctx:BaseAudioContext,output:AudioNode,kind:string,color='normal',options:EffectOptions={},at=ctx.currentTime){
 const speed=options.speed??1;
 const layers=effectLayers(kind,color,options).map(layer=>({...layer,duration:layer.duration/speed,delay:(layer.delay??0)/speed,attack:layer.attack===undefined?undefined:layer.attack/speed})),group=ctx.createGain();group.connect(output);const sources:AudioScheduledSourceNode[]=[],nodes:AudioNode[]=[group];let remaining=layers.length;
 const duration=Math.max(0,...layers.map(l=>(l.delay??0)+l.duration));
 const clean=()=>{if(--remaining<=0)nodes.forEach(n=>n.disconnect());};
 for(const l of layers){const start=at+(l.delay??0),envelope=ctx.createGain();nodes.push(envelope);envelope.connect(group);envelope.gain.setValueAtTime(.0001,start);envelope.gain.linearRampToValueAtTime(l.volume,start+Math.min(l.attack??.004,l.duration*.85));envelope.gain.exponentialRampToValueAtTime(.0001,start+l.duration);
 let source:AudioScheduledSourceNode;
 if(l.wave==='noise'){let buffer=buffers.get(ctx);if(!buffer){buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*1.5),ctx.sampleRate);const data=buffer.getChannelData(0);let state=1729;for(let i=0;i<data.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;data[i]=state/2147483648-1;}buffers.set(ctx,buffer);}const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter();noise.buffer=buffer;filter.type=l.filter??'bandpass';filter.Q.value=.75;filter.frequency.setValueAtTime(l.from,start);filter.frequency.exponentialRampToValueAtTime(l.to,start+l.duration);noise.connect(filter);filter.connect(envelope);nodes.push(filter);source=noise;
 }else{const osc=ctx.createOscillator();osc.type=l.wave;osc.frequency.setValueAtTime(l.from,start);osc.frequency.exponentialRampToValueAtTime(l.to,start+l.duration);osc.connect(envelope);source=osc;}
 sources.push(source);nodes.push(source);source.onended=clean;source.start(start);source.stop(start+l.duration+.015);
 }
 if(!layers.length)group.disconnect();
 return {duration,stop:()=>{const now=ctx.currentTime;group.gain.cancelScheduledValues(now);group.gain.setTargetAtTime(0,now,.008);for(const source of sources)try{source.stop(now+.04);}catch{}}};
}
