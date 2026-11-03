import Showdown from 'pokemon-showdown';
import {pokemonSets} from '../data/teams';
import {FORMAT} from '../data/battle-rules';
import {buildStage} from '../data/opponent-progression';
import type {NpcRank} from '../data/npc-ranks';
import type {TrainerTactic} from '../data/trainer-catalog';
import {moveLearnsets} from './move-learnsets';
import {npcAttackStyle} from './npc-builds';

export type NpcBuildRole='offensive'|'bulky-attacker'|'setup'|'pivot'|'status'|'screen'|'defensive'|'revenge';
const dex=Showdown.Dex,validator=new Showdown.TeamValidator(FORMAT);
const setup=new Set(['swordsdance','dragondance','bulkup','nastyplot','calmmind','quiverdance','shellsmash']);
const recovery=new Set(['recover','roost','softboiled','slackoff','strengthsap','synthesis','moonlight','morningsun','shoreup']);
const status=new Set(['toxic','willowisp','thunderwave','spore','sleeppowder','glare','leechseed','yawn']);
const pivot=new Set(['uturn','voltswitch','flipturn','partingshot']);
const screen=new Set(['reflect','lightscreen','auroraveil']);
const hazards=new Set(['stealthrock','spikes','toxicspikes','stickyweb']);
const unsafe=new Set(['focuspunch','dreameater','snore','lastresort','belch','synchronoise','steelroller','poltergeist','burnup','doubleshock','electroball','storedpower','powertrip','flail','reversal','spitup','naturalgift','fling','trumpcard','frustration','terablast']);
const specialists=new Set(['Ditto','Unown','Wobbuffet','Pyukumuku']);
type Move=ReturnType<typeof dex.moves.get>;
function practical(m:Move){return m.category!=='Status'&&!m.ohko&&!m.selfdestruct&&!m.mindBlownRecoil&&!m.flags.charge&&!m.flags.recharge&&!m.flags.futuremove&&!m.damage&&!m.damageCallback&&!unsafe.has(m.id)&&(m.basePower>=40||!!m.multihit||!!m.basePowerCallback);}
const power=(m:Move)=>m.multihit?m.basePower*(Array.isArray(m.multihit)?3:m.multihit):m.basePower||75;
const legalCache=new Map<string,Move[]>();
const roleCache=new Map<string,NpcBuildRole[]>();
function legal(name:string){let result=legalCache.get(name);if(!result){result=(moveLearnsets[name]?.legalMoves??pokemonSets[name].moves).map(m=>dex.moves.get(m));legalCache.set(name,result);}return result;}
function aligned(m:Move,style:string){return style==='mixed'||m.category===(style==='physical'?'Physical':'Special')||m.overrideOffensiveStat==='def';}
export function npcRoleOptions(name:string,floor:number):NpcBuildRole[]{
 const stage=buildStage(floor),key=name+':'+stage,cached=roleCache.get(key);if(cached)return cached;
 const s=dex.species.get(name).baseStats,moves=legal(name),ids=new Set(moves.map(m=>m.id));
 const roles:NpcBuildRole[]=[s.spe>=100?'revenge':s.hp+s.def+s.spd>=280?'bulky-attacker':'offensive'];
 if(s.spe<100&&moves.some(m=>practical(m)&&m.priority>0))roles.push('revenge');
 if(stage>=2&&moves.some(m=>setup.has(m.id)&&supportsSetup(name,m)))roles.push('setup');
 if(stage>=1&&moves.some(m=>status.has(m.id)))roles.push('status');
 if(stage>=3&&moves.some(m=>pivot.has(m.id)))roles.push('pivot');
 if(stage>=3&&s.hp+s.def+s.spd>=270&&moves.some(m=>recovery.has(m.id)))roles.push('defensive');
 if(stage>=3&&ids.has('reflect')&&ids.has('lightscreen')&&(s.spe>=90||s.hp+s.def+s.spd>=270))roles.push('screen');
 roleCache.set(key,roles);return roles;
}
export function planNpcRoles(names:string[],floor:number,random:()=>number):NpcBuildRole[]{
 const options=names.map(n=>npcRoleOptions(n,floor)),plans=options[0].flatMap(a=>options[1].flatMap(b=>options[2].map(c=>[a,b,c])));
 const max=Math.max(...plans.map(p=>new Set(p).size)),best=plans.filter(p=>new Set(p).size===max);
 return best[Math.floor(random()*best.length)];
}
function supportsSetup(name:string,m:Move){
 const style=npcAttackStyle(name),stat=style==='special'?'spa':'atk';
 return (m.boosts?.[stat]??0)>0||((m.boosts?.spe??0)>0&&style==='mixed');
}
const built=new Map<string,string[]>();
export function progressionMoves(name:string,floor:number,rank:NpcRank,tactic:TrainerTactic,random:()=>number,original:string[]=[],avoid:readonly NpcBuildRole[]=[],forcedRole?:NpcBuildRole){
 const stage=buildStage(floor),options=npcRoleOptions(name,floor);
 const preferred:NpcBuildRole=tactic==='setup'?'setup':tactic==='status'?'status':tactic==='bulk'?'defensive':tactic==='speed'?'revenge':'offensive';
 // Later teams choose complementary roles before repeating the class's favourite.
 const available=stage>=7?options.filter(r=>!avoid.includes(r)):options;
 const choices=available.length?available:options;
 const role=forcedRole??(choices.includes(preferred)&&random()<.5?preferred:choices[Math.floor(random()*choices.length)]);
 if(specialists.has(name))return {role,moves:[...pokemonSets[name].moves]};
 const key=JSON.stringify([name,stage,rank,role,original]);const cached=built.get(key);if(cached)return {role,moves:[...cached]};
 const species=dex.species.get(name),style=npcAttackStyle(name),all=legal(name),maxPower=stage===0?80:stage===1?90:stage===2?100:Infinity;
 let attacks=all.filter(m=>practical(m)&&aligned(m,style));
 const simple=attacks.filter(m=>power(m)<=maxPower&&!m.self?.boosts&&!m.recoil&&!['fakeout','firstimpression','upperhand','suckerpunch'].includes(m.id));
 if(stage<=2&&simple.length>=2)attacks=simple;
 const value=(m:Move)=>{
  const stab=species.types.includes(m.type),originalBonus=original.includes(m.name)?12:0;
  return Math.min(power(m),130)*(m.accuracy===true?1:m.accuracy/100)*(stab?1.4:1)*(m.recoil?.85:1)*(m.self?.boosts?.atk&&m.self.boosts.atk<0||m.self?.boosts?.spa&&m.self.boosts.spa<0?.82:1)+originalBonus+(role==='pivot'&&pivot.has(m.id)?60:0)+(role==='revenge'&&m.priority>0?25:0);
 };
 attacks.sort((a,b)=>value(b)-value(a)||a.id.localeCompare(b.id));
 const moves:string[]=[];
 const compatible=(m:Move)=>!moves.includes(m.name)&&!validator.validateSet({...structuredClone(pokemonSets[name]),moves:[...moves,m.name]},{});
 const add=(m:Move|undefined)=>{
  if(stage===0&&m&&m.category!=='Status'&&!species.types.includes(m.type)&&moves.some(n=>{const a=dex.moves.get(n);return a.category!=='Status'&&!species.types.includes(a.type)&&a.type!==m.type;}))return false;
  if(m&&compatible(m)){moves.push(m.name);return true;}return false;
 };
 add(attacks.find(m=>species.types.includes(m.type))??attacks[0]);
 if(role==='revenge'&&species.baseStats.spe<100)add(attacks.find(m=>m.priority>0));
 const attackTarget=stage===0?3:stage===1?3:2;
 const support=all.filter(m=>
  role==='setup'?setup.has(m.id)&&supportsSetup(name,m):role==='defensive'?recovery.has(m.id)||status.has(m.id):role==='status'?status.has(m.id):role==='screen'?screen.has(m.id)&&m.id!=='auroraveil':false
 ).sort((a,b)=>(role==='defensive'?Number(recovery.has(b.id))-Number(recovery.has(a.id)):0)||Number(original.includes(b.name))-Number(original.includes(a.name))||a.id.localeCompare(b.id));
 if(stage>=1&&support.length){
  const first=support.find(m=>role!=='setup'||attacks.filter(a=>(m.boosts?.[a.overrideOffensiveStat??(a.category==='Physical'?'atk':'spa')]??0)>0&&a.overrideOffensivePokemon!=='target').length>=2);
  add(first);
 }
 if(stage>=2){
  const covered=(m:Move)=>dex.types.all().filter(t=>dex.getImmunity(m.type,t.name)&&dex.getEffectiveness(m.type,t.name)>0&&!moves.some(n=>{const a=dex.moves.get(n);return a.category!=='Status'&&dex.getImmunity(a.type,t.name)&&dex.getEffectiveness(a.type,t.name)>0;})).length;
  const quality=rank==='master'?10:rank==='elite'?6:2;
  attacks.sort((a,b)=>(value(b)+covered(b)*quality)-(value(a)+covered(a)*quality)||a.id.localeCompare(b.id));
 }
 // Coverage evolves from one simple alternative into distinct, aligned attack types.
 for(const m of attacks){
  if(moves.filter(n=>dex.moves.get(n).category!=='Status').length>=attackTarget)break;
  if(moves.some(n=>{const a=dex.moves.get(n);return a.category!=='Status'&&a.type===m.type&&(a.priority>0)===(m.priority>0);}))continue;
  add(m);
 }
 if(stage>=3&&moves.length<4){
  const extra=role==='screen'?support.find(m=>!moves.includes(m.name)):role==='defensive'?support.find(m=>!moves.includes(m.name)&&!moves.some(n=>recovery.has(dex.moves.get(n).id)&&recovery.has(m.id))):role==='pivot'?all.find(m=>pivot.has(m.id)&&aligned(m,style)):undefined;
  add(extra);
 }
 // Hazards are an occasional support option, never required on every team.
 if(stage>=4&&['status','bulky-attacker'].includes(role)&&moves.length<4)add(all.find(m=>hazards.has(m.id)));
 if(stage>=3&&role==='offensive'&&moves.length<4&&['Chlorophyll','Solar Power','Swift Swim','Sand Rush','Slush Rush'].includes(pokemonSets[name].ability))add(all.find(m=>m.id===(pokemonSets[name].ability==='Swift Swim'?'raindance':pokemonSets[name].ability==='Sand Rush'?'sandstorm':pokemonSets[name].ability==='Slush Rush'?'snowscape':'sunnyday')));
 if(stage===0&&moves.length<4)add(all.find(m=>['protect','growl','tailwhip','leer','stringshot'].includes(m.id)));
 for(const m of attacks){if(moves.length===4)break;if(!moves.some(n=>dex.moves.get(n).category!=='Status'&&dex.moves.get(n).type===m.type))add(m);}
 for(const m of attacks){if(moves.length===4)break;add(m);}
 const boost=moves.map(n=>dex.moves.get(n)).find(m=>setup.has(m.id));
 if(boost){
  const benefits=(m:Move)=>m.category!=='Status'&&m.overrideOffensivePokemon!=='target'&&(boost.boosts?.[m.overrideOffensiveStat??(m.category==='Physical'?'atk':'spa')]??0)>0;
  for(let repair=0;repair<2&&moves.filter(n=>benefits(dex.moves.get(n))).length<2;repair++){
   let slot=-1;for(let i=moves.length-1;i>=0;i--)if(dex.moves.get(moves[i]).category!=='Status'&&!benefits(dex.moves.get(moves[i]))){slot=i;break;}
   const replacement=attacks.find(m=>benefits(m)&&!moves.includes(m.name)&&slot>=0&&!validator.validateSet({...structuredClone(pokemonSets[name]),moves:moves.map((n,i)=>i===slot?m.name:n)},{}));
   if(replacement)moves[slot]=replacement.name;else break;
  }
  if(moves.filter(n=>benefits(dex.moves.get(n))).length<2){moves.splice(moves.indexOf(boost.name),1);for(const m of attacks){if(moves.length===4)break;add(m);}}
 }
 // Unusual learnsets retain a legal attacking fallback, rather than an empty set.
 if(!moves.length)moves.push(...pokemonSets[name].moves);
 if(built.size>12000)built.clear();built.set(key,[...moves]);
 return {role,moves};
}
const typeItems:Record<string,string>={Normal:'Silk Scarf',Fire:'Charcoal',Water:'Mystic Water',Electric:'Magnet',Grass:'Miracle Seed',Ice:'Never-Melt Ice',Fighting:'Black Belt',Poison:'Poison Barb',Ground:'Soft Sand',Flying:'Sharp Beak',Psychic:'Twisted Spoon',Bug:'Silver Powder',Rock:'Hard Stone',Ghost:'Spell Tag',Dragon:'Dragon Fang',Dark:'Black Glasses',Steel:'Metal Coat',Fairy:'Fairy Feather'};
export function progressionItemCandidates(name:string,moves:string[],floor:number,rank:NpcRank,role:NpcBuildRole){
 const selected=moves.map(m=>dex.moves.get(m)),attacks=selected.filter(m=>m.category!=='Status'),physical=attacks.filter(m=>m.category==='Physical').length>=attacks.filter(m=>m.category==='Special').length;
 const stab=attacks.find(m=>dex.species.get(name).types.includes(m.type)),boost=typeItems[stab?.type??dex.species.get(name).types[0]],band=physical?'Muscle Band':'Wise Glasses';
 if(floor<=10)return ['Sitrus Berry'];
 if(floor<=20)return [boost,'Sitrus Berry','Lum Berry'];
 if(floor<=30)return [boost,band,'Sitrus Berry','Lum Berry'];
 if(floor<=40)return [...(['defensive','bulky-attacker','status'].includes(role)?['Leftovers']:[]),...(role==='screen'?['Light Clay']:[]),...(role==='pivot'?['Heavy-Duty Boots']:[]),band,boost,'Expert Belt','Sitrus Berry'];
 const s=dex.species.get(name).baseStats,hasStatus=selected.some(m=>m.category==='Status'),hasScreen=selected.some(m=>screen.has(m.id));
 const preferred=hasScreen?['Light Clay','Leftovers']:role==='defensive'||role==='status'?['Leftovers','Rocky Helmet']:role==='setup'?[...(s.hp+s.def+s.spd<270?['Focus Sash']:[]),'Lum Berry','Life Orb']:role==='pivot'?['Heavy-Duty Boots','Leftovers']:role==='bulky-attacker'?['Leftovers',...(!hasStatus?['Assault Vest']:[]),'Rocky Helmet']:role==='revenge'&&!hasStatus?['Choice Scarf',physical?'Choice Band':'Choice Specs']:['Life Orb',...(!hasStatus?[physical?'Choice Band':'Choice Specs']:[]),'Expert Belt'];
 return [...preferred,band,boost,'Expert Belt','Sitrus Berry'];
}
export function inferProgressionRole(name:string,moves:string[]):NpcBuildRole{
 const ids=moves.map(m=>dex.moves.get(m).id);
 if(ids.some(m=>screen.has(m)))return 'screen';
 if(ids.some(m=>setup.has(m)))return 'setup';
 if(ids.some(m=>pivot.has(m)))return 'pivot';
 if(ids.some(m=>recovery.has(m)))return 'defensive';
 if(ids.some(m=>status.has(m)||hazards.has(m)))return 'status';
 const s=dex.species.get(name).baseStats;
 return s.spe>=100||moves.some(m=>dex.moves.get(m).priority>0)?'revenge':s.hp+s.def+s.spd>=280?'bulky-attacker':'offensive';
}
export function progressionAbility(name:string,moves:string[],floor:number,original:string){
 if(floor<51)return original;
 const species=dex.species.get(name),selected=moves.map(m=>dex.moves.get(m));
 const options=Object.values(species.abilities);
 const preferred=options.includes('Grassy Surge')&&selected.some(m=>m.type==='Grass'&&m.category!=='Status')&&!selected.some(m=>m.id==='earthquake')?'Grassy Surge':options.includes('Electric Surge')&&selected.some(m=>m.type==='Electric'&&m.category!=='Status')?'Electric Surge':options.includes('Psychic Surge')&&selected.some(m=>m.type==='Psychic'&&m.category!=='Status')&&!selected.some(m=>m.priority>0)?'Psychic Surge':undefined;
 return preferred&&!validator.validateSet({...structuredClone(pokemonSets[name]),moves,ability:preferred},{})?preferred:original;
}
