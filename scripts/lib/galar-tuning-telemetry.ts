import Showdown from 'pokemon-showdown';
import type {BattleLog} from '../../src/battle/run';

const id=(s:string)=>Showdown.toID(s.replace(/^move: |^ability: /,''));
const actor=(s:string)=>s.replace(/^p[12][a-z]?: /,'');
const hp=(s:string)=>{const [a,b]=s.split(' ')[0].split('/').map(Number);return b?a/b:a===0?0:1;};
const count=(map:Record<string,number>,key:string,n=1)=>{map[key]=(map[key]??0)+n;};
export function galarTuningTelemetry(log:BattleLog,ace:string){
 const out={moves:{} as Record<string,number>,effects:{} as Record<string,number>,weather:{} as Record<string,number>,items:{} as Record<string,number>,damage:{} as Record<string,number>,maxDamage:{} as Record<string,number>,firstMoves:{} as Record<string,number>,directKOs:{} as Record<string,number>,maxBy:{} as Record<string,number>,maxTurns:[] as number[],eligibleMaxTurns:0,aceEntered:false,aceFaintedWithoutMax:false,voluntary:0,pivots:0,entryOrder:[] as string[],issues:[] as string[],sashExtraActions:0,sashSavedEntries:0,actorActionTurns:{} as Record<string,number>,activeTurns:{} as Record<string,number>,hexOnStatus:0,calmMindSafe:0,swordsDanceWithDisguise:0,choiceLockViolations:0};
 const sideConditions=new Set<string>(),statuses=new Map<string,string>(),health=new Map<string,number>(),sash=new Set<string>(),saved=new Set<string>();
 const lastMoves=new Map<string,string>(),setup=new Set<string>(),brokenDisguise=new Set<string>(),maxed=new Set<string>(),lastDamage=new Map<string,{cause:string;owner:string}>();let lastTurn=0,turn=0,source='',move='',firstMove=true;
 const key=(s:string)=>s.replace(/^p([12])[a-z]?:/,'p$1:');
 for(const line of log.publicProtocol){
  const p=line.split('|'),kind=p[1],who=p[2]??'',name=actor(who),npc=who.startsWith('p2'),value=p[3]??'',k=key(who);
  if(kind==='turn'){turn=Number(who);lastTurn=turn;firstMove=true;}
  if(['switch','drag'].includes(kind)){
   health.set(k,hp(p[4]??'100/100'));sash.delete(k);saved.delete(k);lastMoves.delete(k);
   if(npc){const species=value.split(',')[0];out.entryOrder.push(species);out.aceEntered||=species===ace;}
  }
  if(kind==='move'){
   source=who;move=value;
   if(npc){count(out.moves,`${name}/${move}`);if(firstMove)count(out.firstMoves,name);if(move==='U-turn'||move==='Volt Switch')out.pivots++;
    if(sash.has(k)){out.sashExtraActions++;if(!saved.has(k)){out.sashSavedEntries++;saved.add(k);}}
    if(move==='Hex'&&statuses.has(key(p[4]??'')))out.hexOnStatus++;
    const prev=lastMoves.get(k);
    if(name==='Gardevoir'&&prev&&prev!==move&&move!=='Struggle')out.choiceLockViolations++;
    if(name==='Mimikyu'&&move==='Swords Dance'&&!brokenDisguise.has(k))out.swordsDanceWithDisguise++;
    if(['King\'s Shield','Destiny Bond','U-turn'].includes(move)&&prev===move)out.issues.push(`consecutive ${name}/${move} at ${turn}`);
    if(['Swords Dance','No Retreat','Quiver Dance','Bulk Up','Calm Mind','Shift Gear'].includes(move)){
     if(setup.has(k+':'+move))out.issues.push(`repeated setup ${name}/${move} at ${turn}`);setup.add(k+':'+move);
    }
    if(['Recover','Strength Sap'].includes(move)&&(health.get(k)??1)>.65)out.issues.push(`high-HP recovery candidate ${name}/${move} at ${turn}`);
    const targetSide=move==='Tailwind'?'p2':'p1';
    if(['Stealth Rock','Sticky Web','Tailwind'].includes(move)&&sideConditions.has(targetSide+':'+id(move)))out.issues.push(`duplicate field ${move} at ${turn}`);
    lastMoves.set(k,move);
   }
   firstMove=false;
  }
  if(kind==='-status'){statuses.set(k,value);if(who.startsWith('p1')&&source.startsWith('p2'))count(out.effects,'status:'+value);}
  if(kind==='-curestatus')statuses.delete(k);
  if(kind==='-weather'&&value!=='[upkeep]'&&p.slice(3).some(x=>x.includes('ability:'))&&p.slice(3).some(x=>x.includes('p2')))count(out.weather,who);
  if(kind==='-sidestart'||kind==='-sideend'){
   const field=who.slice(0,2)+':'+id(value);
   if(kind==='-sidestart'){sideConditions.add(field);count(out.effects,field);}else sideConditions.delete(field);
  }
  if(kind==='-start'&&npc&&value==='Dynamax'){count(out.maxBy,name);out.maxTurns.push(turn);maxed.add(k);}
  if(kind==='-end'&&npc&&value==='Dynamax')maxed.delete(k);
  if(kind==='-activate'&&npc&&value.includes('Disguise')){count(out.effects,'Disguise');brokenDisguise.add(k);}
  if(kind==='-activate'&&value.includes('Magic Bounce'))count(out.effects,'Magic Bounce');
  if(kind==='-ability'&&npc)count(out.effects,'ability:'+value);
  if(kind==='-formechange'&&npc)count(out.effects,'form:'+value);
  if(kind==='-boost'&&npc&&p.slice(5).some(x=>x.includes('Weakness Policy')))count(out.items,`${name}/Weakness Policy boost`);
  if(kind==='-enditem'&&npc){count(out.items,`${name}/${value}`);if(value==='Focus Sash')sash.add(k);}
  if(kind==='-damage'||kind==='-heal'){
   const previous=health.get(k)??1,current=hp(value),delta=Math.max(0,previous-current)*100;
   health.set(k,current);
   const from=p.slice(4).find(s=>s.startsWith('[from]'))??'';
   if(kind==='-damage'){
    const owner=!from&&source.startsWith('p2')?actor(source):from.includes('G-Max Wildfire')?'Charizard residual':npc&&from.includes('Life Orb')?name+' recoil':'';
    if(owner)count(out.damage,owner,delta);
    if(owner&&!from&&maxed.has(key(source)))count(out.maxDamage,owner,delta);
    lastDamage.set(k,{cause:from,owner});
   }
  }
  if(kind==='faint'){
   if(npc&&name===ace&&!out.maxBy[ace])out.aceFaintedWithoutMax=true;
   const hit=lastDamage.get(k);if(who.startsWith('p1')&&hit?.owner)count(out.directKOs,hit.owner);
  }
 }
 const seenActionTurns=new Set<string>(),seenActiveTurns=new Set<string>();
 for(const d of log.decisions.filter(d=>d.side==='p2')){
  const o=d.observation,own=o.ownTeam.find(p=>p.active),name=own?actor(own.ident):'';
  if(d.action.startsWith('switch ')&&o.legalActions.some(a=>a.command.startsWith('move ')))out.voluntary++;
  if(o.legalActions.some(a=>a.command.endsWith(' dynamax')))out.eligibleMaxTurns++;
  if(own&&o.legalActions.some(a=>a.command.startsWith('move '))){const k=name+':'+o.turn;if(!seenActiveTurns.has(k)){count(out.activeTurns,name);seenActiveTurns.add(k);}}
  if(own&&d.action.startsWith('move ')){
   const k=name+':'+o.turn;if(!seenActionTurns.has(k)){count(out.actorActionTurns,name);seenActionTurns.add(k);}
   const selected=o.legalActions.find(a=>a.command===d.action);if(selected?.label==='Calm Mind'&&hp(own.condition)>.65)out.calmMindSafe++;
  }
 }
 return {...out,turns:lastTurn};
}
