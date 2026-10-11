import Showdown from 'pokemon-showdown';
import {statKeys,trainedStat,type TrainingProfile} from '../../src/data/training';

export type Profiles=Record<string,TrainingProfile>;
const typeNames=['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
const screens=new Set(['reflect','lightscreen','auroraveil']);
const setups=new Set(['swordsdance','dragondance','nastyplot','calmmind','bulkup','quiverdance','shellsmash']);
const heals=new Set(['recover','roost','softboiled','slackoff','strengthsap','moonlight','morningsun','synthesis','rest']);
const effect=(attack:string,types:string[])=>Showdown.Dex.getImmunity(attack,types)?2**Showdown.Dex.getEffectiveness(attack,types):0;

function features(name:string,p:TrainingProfile){
 const species=Showdown.Dex.species.get(name),moves=p.moves.map(m=>Showdown.Dex.moves.get(m));
 const stats=Object.fromEntries(statKeys.map(k=>[k,trainedStat(species.baseStats[k],p.ivs[k],p.evs[k]+(p.runBonuses?.[k]??0),k,p.nature)])) as Record<typeof statKeys[number],number>;
 const attacks=moves.filter(m=>m.category!=='Status');
 const strength=(category:string)=>Math.max(0,...attacks.filter(m=>m.category===category).map(m=>(m.basePower||50)*(m.accuracy===true?1:m.accuracy/100)*(species.types.includes(m.type)?1.5:1)*(m.flags.charge?.5:1)*(category==='Physical'?stats.atk:stats.spa)/100));
 const ability=Showdown.toID(p.ability);
 const resistance=(type:string)=>((type==='Ground'&&ability==='levitate')||(type==='Fire'&&ability==='flashfire')||(type==='Water'&&['waterabsorb','stormdrain','dryskin'].includes(ability))||(type==='Electric'&&['voltabsorb','lightningrod','motordrive'].includes(ability)))?0:effect(type,species.types);
 const attackTypes=[...new Set(attacks.filter(m=>m.basePower>=50||m.damage).map(m=>m.type))];
 return {name,stats,types:species.types,ability,physical:strength('Physical'),special:strength('Special'),attackTypes,resistance,
  pairedScreens:moves.some(m=>m.id==='auroraveil')||moves.some(m=>m.id==='reflect')&&moves.some(m=>m.id==='lightscreen'),screen:moves.some(m=>screens.has(m.id)),room:moves.some(m=>m.id==='trickroom'),setup:moves.some(m=>setups.has(m.id)),
  heal:moves.some(m=>heals.has(m.id)),pivot:moves.some(m=>['uturn','voltswitch','flipturn','partingshot'].includes(m.id)),
  rain:ability==='drizzle'||moves.some(m=>m.id==='raindance'),sun:ability==='drought'||moves.some(m=>m.id==='sunnyday'),
  veil:moves.some(m=>m.id==='auroraveil'),snow:['snowwarning'].includes(ability)||moves.some(m=>['snowscape','hail'].includes(m.id)),
  roles:[...(moves.some(m=>screens.has(m.id))?['screens']:[]),...(moves.some(m=>m.id==='trickroom')?['trick-room']:[]),...(moves.some(m=>heals.has(m.id))?['recovery']:[]),...(moves.some(m=>setups.has(m.id))?['setup']:[])]};
}
function scoreFeatures(team:ReturnType<typeof features>[]){
 let score=team.reduce((n,p)=>n+(p.stats.hp+p.stats.def+p.stats.spd+Math.max(p.stats.atk,p.stats.spa)*1.4+p.stats.spe*.6)/20+Math.max(p.physical,p.special)/25+(p.heal?3:0)+(p.pivot?2:0),0);
 for(const type of typeNames){
  const threats=team.map(p=>p.resistance(type)),best=Math.min(...threats),weak=threats.filter(n=>n>=2).length;
  score+=(best===0?2.5:best<1?1.5:best===1?0:-3)-(weak>=2?3*(weak-1):0);
  const coverage=Math.max(0,...team.flatMap(p=>p.attackTypes.map(attack=>effect(attack,[type]))));
  score+=coverage>=2?1.5:coverage===0?-3:0;
 }
 if(team.some(p=>p.physical>=100)&&team.some(p=>p.special>=100))score+=5;
 const setters=team.filter(p=>p.screen&&(!p.veil||p.snow||team.some(q=>q.snow)));
 if(setters.some(p=>p.pairedScreens))score+=4;
 if(setters.length){score+=4+team.filter(p=>!setters.includes(p)&&p.setup).length*6;score-=Math.max(0,setters.length-1)*4;}
 const room=team.filter(p=>p.room);
 if(room.length){const slow=team.filter(p=>p.stats.spe<=105&&Math.max(p.physical,p.special)>=90).length,fast=team.filter(p=>p.stats.spe>=155).length;score+=slow>=2?12+slow*2-fast*8:-5;}
 if(team.some(p=>p.rain))score+=team.filter(p=>p.ability==='swiftswim'||p.types.includes('Water')).length*3;
 if(team.some(p=>p.sun))score+=team.filter(p=>['chlorophyll','solarpower'].includes(p.ability)||p.types.includes('Fire')).length*3;
 return score;
}
export function evaluateTeam(names:string[],profiles:Profiles){
 if(names.length!==3||new Set(names).size!==3||names.some(n=>!profiles[n]))throw Error('Expected three owned species');
 return scoreFeatures(names.map(n=>features(n,profiles[n])));
}
export function compositionRoles(name:string,p:TrainingProfile){return features(name,p).roles;}
export function compositionNeeds(names:string[],profiles:Profiles){
 const team=names.map(n=>features(n,profiles[n]));
 return {sharedWeaknesses:typeNames.filter(t=>team.filter(p=>p.resistance(t)>=2).length>=2&&!team.some(p=>p.resistance(t)<1)),
  offensiveCoverage:typeNames.filter(t=>team.some(p=>p.attackTypes.some(a=>effect(a,[t])>=2))),roles:[...new Set(team.flatMap(p=>p.roles))]};
}
export function selectCompositionTeam(profiles:Profiles){
 const names=Object.keys(profiles);if(names.length<3)throw Error('Expected at least three species');
 const all=Object.fromEntries(names.map(n=>[n,features(n,profiles[n])]));
 let best:string[]=[],score=-Infinity;
 for(let a=0;a<names.length-2;a++)for(let b=a+1;b<names.length-1;b++)for(let c=b+1;c<names.length;c++){
  const team=[names[a],names[b],names[c]],value=scoreFeatures(team.map(n=>all[n]));
  if(value>score+1e-9){best=team;score=value;}
 }
 // Put a useful field setter first; otherwise retain the input order for stable comparisons.
 return best.sort((a,b)=>Number(all[b].room||all[b].screen)-Number(all[a].room||all[a].screen));
}
// Keep at least one real attack and value support only when the other two can use it.
export function selectCompositionMoves(name:string,p:TrainingProfile,available:string[],allies:Profiles){
 const species=Showdown.Dex.species.get(name),others=Object.entries(allies).filter(([n])=>n!==name).map(([n,q])=>features(n,q));
 const pool=[...new Set(available)],chosen:string[]=[];
 const value=(text:string)=>{
  const m=Showdown.Dex.moves.get(text);
  if(m.category!=='Status'){
   const stat=m.category==='Physical'?'atk':'spa',attack=trainedStat(species.baseStats[stat],p.ivs[stat],p.evs[stat]+(p.runBonuses?.[stat]??0),stat,p.nature);
   const repeated=chosen.some(text=>{const d=Showdown.Dex.moves.get(text);return d.category!=='Status'&&d.type===m.type;});
   return (m.basePower||50)*(species.types.includes(m.type)?1.5:1)*attack/100*(m.accuracy===true?1:m.accuracy/100)*(m.flags.charge?.5:1)*(repeated?.45:1);
  }
  if(screens.has(m.id))return m.id==='auroraveil'&&Showdown.toID(p.ability)!=='snowwarning'&&!others.some(q=>q.snow)?5:85+others.filter(q=>q.setup).length*25;
  if(m.id==='trickroom')return others.filter(q=>q.stats.spe<=105).length>=1&&others.filter(q=>q.stats.spe>=155).length===0?125:5;
  if(heals.has(m.id))return 90;
  if(setups.has(m.id))return 100;
  if(['willowisp','thunderwave','toxic','leechseed'].includes(m.id))return 70;
  return 10;
 };
 const attack=pool.filter(m=>Showdown.Dex.moves.get(m).category!=='Status').sort((a,b)=>value(b)-value(a))[0];
 if(attack)chosen.push(attack);
 // Preserve complementary walls as a support role, with an attack still required.
 if(others.length>=2&&pool.some(m=>Showdown.toID(m)==='reflect')&&pool.some(m=>Showdown.toID(m)==='lightscreen')){
  for(const id of ['reflect','lightscreen']){const m=pool.find(m=>Showdown.toID(m)===id)!;if(!chosen.includes(m))chosen.push(m);}
 }
 while(chosen.length<Math.min(4,pool.length)){const next=pool.filter(m=>!chosen.includes(m)).sort((a,b)=>value(b)-value(a))[0];chosen.push(next);}
 return chosen;
}

export function recruitForComposition(profiles:Profiles,candidates:{species:string;moves:string[];ivs?:Partial<TrainingProfile['ivs']>}[],makeProfile:(name:string)=>TrainingProfile){
 const beforeTeam=selectCompositionTeam(profiles),before=evaluateTeam(beforeTeam,profiles),beforeNeeds=compositionNeeds(beforeTeam,profiles);
 const options=candidates.map(candidate=>{
  const name=candidate.species,p=structuredClone(profiles[name]??makeProfile(name));
  for(const stat of statKeys)p.ivs[stat]=Math.max(p.ivs[stat],candidate.ivs?.[stat]??31);
  p.moves=selectCompositionMoves(name,p,[...p.moves,...candidate.moves],profiles);
  const next={...profiles,[name]:p},team=selectCompositionTeam(next),score=evaluateTeam(team,next);
  return {species:name,profile:p,team,score,gain:score-before,roles:compositionRoles(name,p),owned:!!profiles[name]};
 }).sort((a,b)=>b.gain-a.gain||a.species.localeCompare(b.species));
 const best=options.find(c=>c.gain>(c.owned?1e-6:.75)&&c.team.includes(c.species));
 let removed:string|undefined;
 if(best){
  profiles[best.species]=best.profile;
  if(Object.keys(profiles).length>6){
   const reserve=Object.keys(profiles).filter(n=>!best.team.includes(n));
   removed=reserve.map(name=>({name,score:Math.max(...best.team.map((_,i)=>evaluateTeam(best.team.map((n,j)=>i===j?name:n),profiles)))})).sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name))[0].name;
   delete profiles[removed];
  }
 }
 return {selected:best?.species??null,removed,beforeTeam,afterTeam:selectCompositionTeam(profiles),beforeScore:before,afterScore:best?.score??before,beforeNeeds,afterNeeds:compositionNeeds(selectCompositionTeam(profiles),profiles),
  candidates:options.map(({profile:_,team:__,...c})=>c)};
}
