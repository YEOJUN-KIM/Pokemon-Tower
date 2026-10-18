import Showdown from 'pokemon-showdown';
import type {Action,Observation} from './policy';

// Fill the variable-power gap in legalActions locally. It assigns Grass Knot /
// Low Kick zero because their cartridge basePower is zero. No archived scoring
// or shared request payload is changed.
function publicDamage(a:Action,move:ReturnType<typeof Showdown.Dex.moves.get>,o:Observation,z=false){
 const own=o.ownTeam.find(p=>p.active)!,target=Showdown.Dex.species.get(o.opponent!.species),attacker=Showdown.Dex.species.get(own.details.split(',')[0]);
 if(move.category==='Status')return 0;
 const defending=o.switching?.opponentTypes.length?o.switching.opponentTypes:target.types;
 const effectiveness=(types:string[])=>Showdown.Dex.getImmunity(move.type,types)?2**Showdown.Dex.getEffectiveness(move.type,types):0;
 const old=effectiveness(target.types),current=effectiveness(defending);
 if(!current)return 0;
 let power=move.basePower;
 if(['grassknot','lowkick'].includes(move.id))power=target.weightkg>=200?120:target.weightkg>=100?100:target.weightkg>=50?80:target.weightkg>=25?60:target.weightkg>=10?40:20;
 if(['heavyslam','heatcrash'].includes(move.id)){const ratio=attacker.weightkg/target.weightkg;power=ratio>=5?120:ratio>=4?100:ratio>=3?80:ratio>=2?60:40;}
 if(['eruption','waterspout','dragonenergy'].includes(move.id))power=Math.max(1,150*(hpFraction(own.condition)??1));
 if(move.id==='return')power=102;
 if(move.id==='punishment')power=60; // Opponent boosts are not exposed; assume zero.
 const accuracy=move.accuracy===true?1:move.accuracy/100;
 let value=a.estimatedDamage;
 if(!z&&move.basePower>0&&power!==move.basePower)value*=power/move.basePower;
 if(!move.basePower&&power>0 || z&&(move.basePower<=1||value===0) || !old&&power>0){
  const zPower=Showdown.Dex.moves.get(a.label).basePower;
  const effectivePower=z?(zPower>1?zPower:move.zMove?.basePower??power):power;
  const defense=Math.floor(((2*(move.category==='Physical'?target.baseStats.def:target.baseStats.spd)+31)*50)/100)+5;
  value=((22*effectivePower*(move.category==='Physical'?own.stats.atk:own.stats.spa)/defense)/50+2)*(attacker.types.includes(move.type)?1.5:1)*(old||current)*.925*(z?1:accuracy);
 }else if(z)value/=Math.max(.01,accuracy);
 if(old>0)value*=current/old;
 return Number.isFinite(value)?Math.max(0,value):0;
}

// Public condition formats only; unknown/malformed conditions are not full HP.
export function hpFraction(condition:string):number|null {
 if(/(?:^|\s)fnt(?:$|\s)/.test(condition))return 0;
 const value=condition.split(' ')[0];
 const ratio=value.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/),percent=value.match(/^(\d+(?:\.\d+)?)%$/);
 const n=ratio&&Number(ratio[2])>0?Number(ratio[1])/Number(ratio[2]):percent?Number(percent[1])/100:null;
 return n===null?null:Math.max(0,Math.min(1,n));
}
export function evaluateZOptions(o:Observation){
 const own=o.ownTeam.find(p=>p.active),enemy=o.opponent;
 if(!own||!enemy)return null;
 const fraction=hpFraction(enemy.condition),selfHP=hpFraction(own.condition);
 if(fraction===null||fraction<=0||selfHP===null||selfHP<=0)return null;
 // Same neutral level-50 HP assumption as the existing switching policy.
 const targetMax=Showdown.Dex.species.get(enemy.species).baseStats.hp+91,targetHP=targetMax*fraction;
 const normal=o.legalActions.filter(a=>/^move \d+$/.test(a.command));
 const bestNormal=Math.max(0,...normal.map(a=>publicDamage(a,Showdown.Dex.moves.get(a.label),o))),normalKO=bestNormal>=targetHP;
 const last=Showdown.Dex.moves.get(o.lastOpponentMove??''),allies=o.ownTeam.filter(p=>(hpFraction(p.condition)??0)>0).length;
 const danger=selfHP<.3 || selfHP<.5&&last.exists&&last.category!=='Status';
 const candidates=o.legalActions.filter(a=>a.command.endsWith(' zmove')).map(action=>{
  const base=normal.find(a=>a.command===action.command.replace(' zmove',''));
  const move=Showdown.Dex.moves.get(base?.label??own.moves?.[Number(action.command.split(' ')[1])-1]??''),status=move.category==='Status';
  // Z attacks always hit. Correct the legacy base-accuracy weighting locally;
  // archived policies keep their original observation scores.
  const damage=status?0:publicDamage(action,move,o,true),ordinaryDamage=base?publicDamage(base,move,o):0;
  const gain=damage-ordinaryDamage,effectiveGain=Math.min(damage,targetHP)-Math.min(bestNormal,targetHP);
  const zOnlyKO=!normalKO&&damage>=targetHP*1.1;
  return {action,base,move,status,damage,ordinaryDamage,gain,effectiveGain,zOnlyKO};
 });
 return {own,enemy,targetHP,targetMax,selfHP,bestNormal,normalKO,danger,allies,candidates};
}
export function chooseResourceZ(o:Observation,ordinary:string,tier:'tactical'|'expert'):string {
 const e=evaluateZOptions(o);if(!e)return ordinary;
 const selected=o.legalActions.find(a=>a.command===ordinary),selectedMove=Showdown.Dex.moves.get(selected?.label??'');
 const support=selectedMove.category==='Status'?(['recover','roost','slackoff','softboiled','strengthsap'].includes(selectedMove.id)?85:55):0;
 let best={command:ordinary,score:Math.max(Math.min(e.bestNormal,e.targetHP),support)};
 for(const c of e.candidates){
  if(tier==='tactical'&&c.base?.command!==ordinary&&!c.zOnlyKO&&!e.danger)continue;
  if(c.status){
   if(c.base?.command!==ordinary)continue;
   const extra=c.move.zMove,boosts=o.switching?.boosts??{};
   const heal=extra?.effect==='heal'&&e.selfHP<=.45;
   const boost=extra?.boost&&e.selfHP>.55&&Object.entries(extra.boost).some(([stat,n])=>Number(n)>0&&(boosts[stat]??0)<2);
   const clear=extra?.effect==='clearnegativeboost'&&Object.values(boosts).some(n=>n<0)&&e.selfHP>.4;
   if(heal||boost||clear)return c.action.command;
   continue;
  }
  if(e.normalKO||c.damage<=0||c.effectiveGain<=0)continue;
  const crisis=e.danger&&c.effectiveGain>=e.targetMax*.08;
  if(!c.zOnlyKO&&!crisis&&(c.effectiveGain<e.targetMax*.18||c.damage<e.bestNormal*1.35))continue;
  const cost=e.targetMax*(crisis?.06:e.allies===1?.10:.18);
  const score=Math.min(c.damage,e.targetHP)-cost+(c.zOnlyKO?e.targetMax*.5:0)+(crisis?e.targetMax*.12:0);
  if(score>best.score)best={command:c.action.command,score};
 }
 return best.command;
}
