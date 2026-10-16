import Showdown from 'pokemon-showdown';
import {pokemonSets} from '../data/teams';
import {FORMAT} from '../data/battle-rules';
import type {TrainerTactic} from '../data/trainer-catalog';
import {moveLearnsets} from './move-learnsets';

export type AttackStyle='physical'|'special'|'mixed';
type BuildRank='elite'|'master';
type Move=ReturnType<typeof Showdown.Dex.moves.get>;
const dex=Showdown.Dex,validator=new Showdown.TeamValidator(FORMAT);
// Preserve the existing generator's deliberate nonstandard win conditions.
const specialists=new Set(['Ditto','Unown','Wobbuffet','Pyukumuku']);
// Limit support to effects understood by the existing TowerPolicy battle AI.
const setup:Record<string,AttackStyle>={swordsdance:'physical',dragondance:'physical',bulkup:'physical',nastyplot:'special',calmmind:'special',quiverdance:'special',shellsmash:'mixed'};
const recovery=new Set(['recover','roost','softboiled','slackoff','strengthsap']);
const utility=new Set(['toxic','willowisp','thunderwave','leechseed']);
// These attacks require a partner move, item or turn state the generated build does not arrange.
const conditional=new Set(['focuspunch','dreameater','snore','lastresort','belch','fakeout','firstimpression','upperhand','synchronoise','steelroller','poltergeist','burnup','doubleshock','electroball','storedpower','powertrip','flail','reversal','spitup','naturalgift','fling','trumpcard','frustration']);
function power(m:Move){
 if(m.multihit)return m.basePower*(Array.isArray(m.multihit)?3:m.multihit);
 return m.basePower|| (m.basePowerCallback?75:0);
}
function practical(m:Move){return m.category!=='Status'&&!m.ohko&&!m.selfdestruct&&!m.mindBlownRecoil&&!m.flags.charge&&!m.flags.recharge&&!m.damage&&!m.damageCallback&&!conditional.has(m.id)&&power(m)>=40;}
function offensiveStats(name:string){
 const stats=dex.species.get(name).baseStats,ability=dex.abilities.get(pokemonSets[name]?.ability);
 return {atk:stats.atk*(['hugepower','purepower'].includes(ability.id)?2:1),spa:stats.spa};
}
function benefitsFrom(attack:Move,boost:Move){
 if(attack.overrideOffensivePokemon==='target')return false;
 const stat=attack.overrideOffensiveStat||(attack.category==='Physical'?'atk':'spa');
 return (boost.boosts?.[stat]??0)>0;
}
function attackValue(name:string,m:Move){
 const species=dex.species.get(name),stats=offensiveStats(name);
 const stat=m.overrideOffensivePokemon==='target'?100:m.overrideOffensiveStat?species.baseStats[m.overrideOffensiveStat]:m.category==='Physical'?stats.atk:stats.spa;
 const accuracy=m.accuracy===true?1:m.accuracy/100;
 const drops=m.self?.boosts;
 const lowersAttack=!!drops&&((m.category==='Physical'&&(drops.atk??0)<0)||(m.category==='Special'&&(drops.spa??0)<0));
 const stab=species.types.includes(m.type);
 const situational=m.basePowerCallback||m.onTry||m.onTryHit?0.85:1;
 return Math.min(125,power(m))*accuracy*(stab?1.35:m.type==='Normal'?0.65:0.9)*(stat/Math.max(stats.atk,stats.spa))*(m.recoil?0.85:1)*(lowersAttack?0.78:1)*(m.self?.volatileStatus==='lockedmove'?0.75:1)*(m.flags.futuremove?0.75:1)*situational+(m.priority>0?10:0);
}
type Pool={style:AttackStyle;attacks:Move[];support:Move[];hasStab:boolean};
const pools=new Map<string,Pool>();
function poolFor(name:string):Pool{
 const cached=pools.get(name);if(cached)return cached;
 const species=dex.species.get(name),stats=offensiveStats(name);
 const legal=(moveLearnsets[name]?.legalMoves??[]).map(m=>dex.moves.get(m));
 const all=legal.filter(practical).sort((a,b)=>attackValue(name,b)-attackValue(name,a)||a.name.localeCompare(b.name));
 const best=(category:string)=>Math.max(0,...all.filter(m=>m.category===category).map(m=>attackValue(name,m)));
 let style:AttackStyle=stats.atk>=stats.spa?'physical':'special';
 // A clear stat advantage wins if there is a usable attack; close stats use the actual movepool.
 if(Math.max(stats.atk,stats.spa)/Math.max(1,Math.min(stats.atk,stats.spa))<1.2)style=best('Physical')>best('Special')?'physical':'special';
 if(!all.some(m=>m.category===(style==='physical'?'Physical':'Special')))style=style==='physical'?'special':'physical';
 // Mixed requires near-equal stats AND different STAB types whose best attacks favor opposite sides.
 const preferred=species.types.map(type=>{
  const p=Math.max(0,...all.filter(m=>m.type===type&&m.category==='Physical').map(m=>attackValue(name,m)));
  const s=Math.max(0,...all.filter(m=>m.type===type&&m.category==='Special').map(m=>attackValue(name,m)));
  return p>s*1.2?'physical':s>p*1.2?'special':undefined;
 });
 if(Math.max(stats.atk,stats.spa)/Math.max(1,Math.min(stats.atk,stats.spa))<=1.1&&preferred.includes('physical')&&preferred.includes('special'))style='mixed';
 let attacks=all.filter(m=>style==='mixed'||m.category===(style==='physical'?'Physical':'Special'));
 // Keep distinct coverage before secondary same-type attacks. Retain priority as a distinct role.
 const primary=attacks.filter((m,i,a)=>a.findIndex(n=>n.type===m.type&&n.category===m.category&&(n.priority>0)===(m.priority>0))===i);
 const secondary=attacks.filter(m=>!primary.includes(m));
 attacks=[...primary.filter(m=>species.types.includes(m.type)),...primary.filter(m=>!species.types.includes(m.type)),...secondary].slice(0,12);
 const support=legal.filter(m=>recovery.has(m.id)||utility.has(m.id)||(setup[m.id]&&(setup[m.id]===style||setup[m.id]==='mixed')));
 const pool={style,attacks,support,hasStab:attacks.some(m=>species.types.includes(m.type))};pools.set(name,pool);return pool;
}

export function npcAttackStyle(name:string):AttackStyle{return poolFor(name).style;}

/** Select one EV attack stat from the final build without changing its tactic's weight ratios. */
export function npcBuildAttackStat(name:string,moves:string[]):'atk'|'spa'|undefined{
 const attacks=moves.map(m=>dex.moves.get(m)).filter(m=>practical(m)&&m.overrideOffensivePokemon!=='target'&&(!m.overrideOffensiveStat||m.overrideOffensiveStat==='atk'||m.overrideOffensiveStat==='spa'));
 const physical=attacks.filter(m=>(m.overrideOffensiveStat??(m.category==='Physical'?'atk':'spa'))==='atk');
 const special=attacks.filter(m=>!physical.includes(m));
 if(!attacks.length)return undefined; // Transform/Counter and defensive-stat specialists keep their fallback.
 if(physical.length!==special.length)return physical.length>special.length?'atk':'spa';
 const value=(selected:Move[])=>selected.reduce((sum,m)=>sum+attackValue(name,m),0);
 const physicalValue=value(physical),specialValue=value(special);
 if(physicalValue!==specialValue)return physicalValue>specialValue?'atk':'spa';
 const stats=offensiveStats(name);return stats.atk>=stats.spa?'atk':'spa';
}

/** Hard coherence rules, shared with report diagnostics. Showdown legality is checked separately. */
export function npcBuildIssues(name:string,moves:string[]):string[]{
 if(specialists.has(name))return [];
 const pool=poolFor(name),selected=moves.map(m=>dex.moves.get(m)),attacks=selected.filter(practical),issues:string[]=[];
 if(!attacks.length)issues.push('no practical attack');
 if(selected.some(m=>m.category!=='Status'&&!practical(m)))issues.push('impractical attack');
 if(pool.hasStab&&!attacks.some(m=>dex.species.get(name).types.includes(m.type)))issues.push('no practical STAB');
 if(attacks.some(m=>pool.style!=='mixed'&&m.category!==(pool.style==='physical'?'Physical':'Special')))issues.push('attack style mismatch');
 const boosts=selected.filter(m=>setup[m.id]);
 if(boosts.length>1)issues.push('duplicate setup');
 for(const m of boosts){
  const style=setup[m.id];
  if((style!=='mixed'&&style!==pool.style)||attacks.filter(a=>benefitsFrom(a,m)).length<2)issues.push('setup without aligned attacks');
 }
 if(selected.filter(m=>recovery.has(m.id)).length>1)issues.push('duplicate recovery');
 if(selected.filter(m=>utility.has(m.id)).length>1)issues.push('duplicate status utility');
 return issues;
}

function scoreBuild(name:string,moves:Move[],rank:BuildRank,tactic:TrainerTactic,original:string[]){
 const attacks=moves.filter(practical),master=rank==='master';
 let score=0;
 for(const m of moves){
  if(practical(m))score+=attackValue(name,m);
  else if(setup[m.id])score+=65+(tactic==='setup'?45:0)+(m.id==='shellsmash'||m.id==='quiverdance'?12:0);
  else if(recovery.has(m.id))score+=tactic==='bulk'?125:tactic==='status'?100:50;
  else score+=tactic==='status'?125:tactic==='bulk'?95:45;
  if(original.includes(m.name))score+=master?2:10;
 }
 for(let i=0;i<attacks.length;i++)for(let j=0;j<i;j++)if(attacks[i].type===attacks[j].type){
  const priorityRole=(attacks[i].priority>0)!==(attacks[j].priority>0);
  score-=priorityRole?10:master?100:65;
 }
 // Master evaluates coverage and setup payoff across the whole set, rather than four isolated scores.
 const types=new Set(attacks.map(m=>m.type));
 const covered=dex.types.all().filter(t=>[...types].some(type=>dex.getImmunity(type,t.name)&&dex.getEffectiveness(type,t.name)>0)).length;
 score+=covered*(master?5:1);
 if(master){
  const species=dex.species.get(name);
  score+=species.types.filter(type=>attacks.some(m=>m.type===type)).length*15;
  for(const m of moves.filter(m=>setup[m.id])){
   score+=attacks.filter(a=>benefitsFrom(a,m)).length*5;
   score-=attacks.filter(a=>benefitsFrom(a,m)&&a.self?.boosts&&Object.values(a.self.boosts).some(v=>typeof v==='number'&&v<0)).length*20;
  }
 }
 return score;
}
const builds=new Map<string,string[]>();
/** Pure correction layer: no encounter RNG consumed; membership, IV rolls and saved teams are untouched. */
export function improveNpcMoves(name:string,original:string[],rank:BuildRank,tactic:TrainerTactic):string[]{
 if(specialists.has(name))return [...original];
 const key=JSON.stringify([name,original,rank,tactic]),cached=builds.get(key);if(cached)return [...cached];
 const pool=poolFor(name),candidates=[...pool.attacks,...pool.support];
 const combinations:{moves:Move[];score:number}[]=[];
 const count=Math.min(4,candidates.length);
 function choose(start:number,moves:Move[]){
  if(moves.length===count){
   if(!npcBuildIssues(name,moves.map(m=>m.name)).length)combinations.push({moves:[...moves],score:scoreBuild(name,moves,rank,tactic,original)});
   return;
  }
  for(let i=start;i<=candidates.length-(count-moves.length);i++){moves.push(candidates[i]);choose(i+1,moves);moves.pop();}
 }
 choose(0,[]);
 combinations.sort((a,b)=>b.score-a.score||a.moves.map(m=>m.name).join().localeCompare(b.moves.map(m=>m.name).join()));
 for(const build of combinations){
  const moves=build.moves.map(m=>m.name);
  if(!validator.validateSet({...structuredClone(pokemonSets[name]),moves},{})){
   if(builds.size>=512)builds.delete(builds.keys().next().value!);
   builds.set(key,moves);return [...moves];
  }
 }
 // Species without an ordinary attacking movepool retain the generator's legal specialist fallback.
 return [...original];
}
