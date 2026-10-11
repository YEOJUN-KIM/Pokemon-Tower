import Showdown from 'pokemon-showdown';
import {CautiousSwitchingPolicy} from './switch-policy';
import {PublicImmunityV2} from './public-immunity-v2';
import {estimateDamage,type Observation,type OwnPokemon} from './policy';

const hp=(p:OwnPokemon)=>{const [n,d]=p.condition.split(' ')[0].split('/').map(Number);return d>0?n/d:0;};

// v8 only learns from its own side's public events. Older policy versions stay
// available for resumed games. Remap protocol actor IDs, never request payloads.
export class LearningOpponentPolicy extends CautiousSwitchingPolicy {
 private memory=new PublicImmunityV2();
 private learnedSwitches=0;
 private lastSwitch=-10;
 constructor(private side:'p1'|'p2'='p2'){super();}
 observePublicLine(line:string){
  if(!line.startsWith('|')||line.startsWith('|request|'))return;
  const normalized=this.side==='p1'?line:line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1'));
  this.memory.consume(normalized);
 }
 override choose(original:Observation):string{
  const canMove=original.legalActions.some(a=>a.command.startsWith('move '));
  const o=canMove&&(this.learnedSwitches>=4||original.turn-this.lastSwitch<3)?{...original,legalActions:original.legalActions.filter(a=>!a.command.startsWith('switch '))}:original;
  const own=o.ownTeam.find(p=>p.active);
  this.memory.observeOwn(own);
  if(!own||!o.opponent)return super.choose(o);
  const moves=o.legalActions.filter(a=>a.command.startsWith('move '));
  const blocked=(name:string,p=own)=>this.memory.blocked(name,p,o);
  const attacks=moves.filter(a=>Showdown.Dex.moves.get(a.label).category!=='Status');
  const hittable=attacks.filter(a=>!blocked(a.label));
  const receivers=o.legalActions.filter(a=>a.command.startsWith('switch ')).filter(a=>{
   const p=o.ownTeam[Number(a.command.split(' ')[1])-1];
   return p&&hp(p)>0&&(p.moves??[]).some(m=>Showdown.Dex.moves.get(m).category!=='Status'&&!blocked(m,p));
  });
  let action:string;
  if(moves.length&&attacks.length&&!hittable.length&&receivers.length&&this.learnedSwitches<4&&o.turn-this.lastSwitch>=3&&!o.switching?.maybeTrapped&&!o.switching?.dynamax){
   const safe=receivers.filter(a=>{
    const p=o.ownTeam[Number(a.command.split(' ')[1])-1];
    const hazards=o.switching?.hazards,types=p.terastallized&&p.terastallized!=='Stellar'?[p.terastallized]:Showdown.Dex.species.get(p.details.split(',')[0]).types;
    const id=Showdown.toID(p.ability),boots=Showdown.toID(p.item)==='heavydutyboots';
    const grounded=!types.includes('Flying')&&id!=='levitate'&&Showdown.toID(p.item)!=='airballoon';
    const rock=Showdown.Dex.getImmunity('Rock',types)?2**Showdown.Dex.getEffectiveness('Rock',types):0;
    const entry=!hazards||boots||id==='magicguard'?0:(hazards.stealthRock?rock/8:0)+(grounded?[0,1/8,1/6,1/4][hazards.spikes]:0);
    return hp(p)-entry>.25;
   });
   action=safe.sort((a,b)=>{
    const score=(cmd:string)=>{const p=o.ownTeam[Number(cmd.split(' ')[1])-1];return Math.max(0,...(p.moves??[]).filter(m=>!blocked(m,p)).map(m=>estimateDamage(m,p,o.opponent!.species)));};
    return score(b.command)-score(a.command);
   })[0]?.command??this.filteredChoice(o,blocked,receivers);
  }else action=this.filteredChoice(o,blocked,receivers);
  if(action.startsWith('switch ')&&moves.length){this.learnedSwitches++;this.lastSwitch=o.turn;}
  return action;
 }
 private filteredChoice(o:Observation,blocked:(name:string)=>boolean,receivers:Observation['legalActions']):string{
  // Keep forced replacement legal even if all remaining allies lack an answer.
  const forced=!o.legalActions.some(a=>a.command.startsWith('move '));
  const filtered=o.legalActions.filter(a=>a.command.startsWith('move ')?!blocked(a.label):!a.command.startsWith('switch ')||!receivers.length||receivers.some(r=>r.command===a.command));
  if(forced)return super.choose({...o,legalActions:filtered});
  const normals=filtered.filter(a=>/^move \d+$/.test(a.command));
  if(!normals.length){
   const attack=filtered.filter(a=>a.command.startsWith('move ')).sort((a,b)=>b.estimatedDamage-a.estimatedDamage)[0];
   if(attack)return attack.command;
   return super.choose({...o,legalActions:o.legalActions.filter(a=>!a.command.startsWith('switch '))});
  }
  // No useful move or safe switch may exist. The engine still requires a legal action.
  return super.choose({...o,legalActions:filtered.length?filtered:o.legalActions});
 }
}

