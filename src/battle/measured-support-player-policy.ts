import Showdown from 'pokemon-showdown';
import {CautiousSwitchingPolicy} from './switch-policy';
import {estimateDamage,type Observation,type OwnPokemon,type Action} from './policy';

const fraction=(condition:string)=>{const [n,d]=condition.split(' ')[0].split('/').map(Number);return d>0?n/d:0;};
const id=Showdown.toID;
const stage=(n:number)=>n>=0?(2+n)/2:2/(2-n);
const screens=new Set(['reflect','lightscreen','auroraveil']);
const setups=new Set(['swordsdance','dragondance','nastyplot','calmmind','bulkup','quiverdance','shellsmash']);
const types=(p:OwnPokemon)=>p.terastallized&&p.terastallized!=='Stellar'?[p.terastallized]:Showdown.Dex.species.get(p.details.split(',')[0]).types;
const effectiveness=(attack:string,defending:string[])=>Showdown.Dex.getImmunity(attack,defending)?2**Showdown.Dex.getEffectiveness(attack,defending):0;

// v10 is an opt-in DATA-COLLECTION PLAYER; frozen v9 is preserved. The live opponent and saved v7/v8 are unchanged.
export class MeasuredSupportPlayerPolicy extends CautiousSwitchingPolicy {
 private turn=0;
 private walls=new Map<string,number>();
 private roomUntil=0;
 private snow=false;
 private lastOwn:OwnPokemon|undefined;
 private enemyBoosts:Record<string,number>={};
 private attempts=new Map<string,number>();
 private supportDeparted=new Map<string,number>();
 private supportSwitches=0;
 private lastSwitch=-10;
 decisionReason='preview';
 consumePublicLine(line:string){
  const p=line.split('|'),event=p[1];
  if(!['turn','move','switch','drag','-sidestart','-sideend','-fieldstart','-fieldend','-weather','-boost','-unboost','-setboost','-clearboost','-clearallboost'].includes(event))return;
  if(event==='turn')this.turn=Number(p[2]);
  if(event==='move'&&p[2]?.startsWith('p1a:'))this.attempts.set(p[2].replace(/^p1a:/,'p1:')+':'+id(p[3]),this.turn);
  if(['switch','drag'].includes(event)&&p[2]?.startsWith('p2a:'))this.enemyBoosts={};
  if(['-boost','-unboost','-setboost'].includes(event)&&p[2]?.startsWith('p2a:')){
   const n=Number(p[4]);this.enemyBoosts[p[3]]=Math.max(-6,Math.min(6,event==='-setboost'?n:(this.enemyBoosts[p[3]]??0)+(event==='-unboost'?-n:n)));
  }
  if((event==='-clearboost'&&p[2]?.startsWith('p2a:'))||event==='-clearallboost')this.enemyBoosts={};
  if(['-sidestart','-sideend'].includes(event)&&p[2]?.startsWith('p1:')){
   const effect=id((p[3]??'').replace(/^move: /,''));
   if(screens.has(effect)){if(event==='-sideend')this.walls.delete(effect);else this.walls.set(effect,this.turn+(id(this.lastOwn?.item)==='lightclay'?8:5));}
  }
  if(event==='-fieldstart'&&id((p[2]??'').replace(/^move: /,''))==='trickroom')this.roomUntil=this.turn+5;
  if(event==='-fieldend'&&id((p[2]??'').replace(/^move: /,''))==='trickroom')this.roomUntil=0;
  if(event==='-weather')this.snow=['Snow','Hail'].includes(p[2]);
 }
 observeOwnPokemon(p:OwnPokemon|undefined){this.lastOwn=p;}
 context(){return {turn:this.turn,screens:Object.fromEntries([...this.walls].map(([k,n])=>[k,Math.max(0,n-this.turn)])),trickRoomTurns:Math.max(0,this.roomUntil-this.turn),snow:this.snow,opponentBoosts:{...this.enemyBoosts},voluntarySwitches:this.supportSwitches,lastSwitchTurn:this.lastSwitch,departedTurns:Object.fromEntries(this.supportDeparted),recentOwnMoves:Object.fromEntries(this.attempts)};}
 private covered(category:string){return (this.walls.get('auroraveil')??0)>this.turn||(this.walls.get(category==='Physical'?'reflect':'lightscreen')??0)>this.turn;}
 private speed(p:OwnPokemon,o:Observation){return p.stats.spe*stage(p.active?(o.switching?.boosts.spe??0):0)*(p.condition.includes('par')?.5:1);}
 private enemySpeed(o:Observation){return (Showdown.Dex.species.get(o.opponent!.species).baseStats.spe+20)*stage(this.enemyBoosts.spe??0)*(o.opponent!.condition.includes('par')?.5:1);}
 private incoming(p:OwnPokemon,o:Observation,ignoreWall=false,prospectiveScreen?:string){
  const enemy=Showdown.Dex.species.get(o.opponent!.species),last=Showdown.Dex.moves.get(o.lastOpponentMove??''),defending=types(p),ability=id(p.ability);
  const enemyTypes=o.switching?.opponentTypes.length?o.switching.opponentTypes:enemy.types;
  const categories=['Physical','Special'].filter(c=>enemy.baseStats[c==='Physical'?'atk':'spa']>=Math.max(enemy.baseStats.atk,enemy.baseStats.spa)*.65);
  const fallback=enemyTypes.flatMap(type=>categories.map(category=>({type,power:100,category})));
  const threats=last.exists&&last.category!=='Status'?[...fallback,{type:last.type,power:last.basePower||80,category:last.category}]:fallback;
  return Math.max(0,...threats.map(m=>{
   if((m.type==='Ground'&&(ability==='levitate'||id(p.item)==='airballoon'))||(m.type==='Fire'&&ability==='flashfire')||(m.type==='Water'&&['waterabsorb','stormdrain','dryskin'].includes(ability))||(m.type==='Electric'&&['voltabsorb','lightningrod','motordrive'].includes(ability)))return 0;
   const attackKey=m.category==='Physical'?'atk':'spa',defKey=m.category==='Physical'?'def':'spd';
   const attack=((enemy.baseStats[attackKey]+52)*1.1)*stage(this.enemyBoosts[attackKey]??0)*(m.category==='Physical'&&o.opponent!.condition.includes('brn')?.5:1);
   const defense=p.stats[defKey]*stage(p.active?(o.switching?.boosts[defKey]??0):0);
   const stab=enemyTypes.includes(m.type)?1.5:1;
   return ((22*m.power*attack/Math.max(1,defense))/50+2)*stab*effectiveness(m.type,defending)*((prospectiveScreen==='auroraveil'||prospectiveScreen===(m.category==='Physical'?'reflect':'lightscreen')||!ignoreWall&&this.covered(m.category))?.5:1);
  }));
 }
 private attackEstimate(a:Action,p:OwnPokemon,o:Observation){
  const m=Showdown.Dex.moves.get(a.label);if(m.category==='Status')return 0;
  const target=Showdown.Dex.species.get(o.opponent!.species),visible=o.switching?.opponentTypes.length?o.switching.opponentTypes:target.types;
  const native=effectiveness(m.type,target.types),changed=effectiveness(m.type,visible);
  let value=estimateDamage(m.name,p,target.name);
  if(!native){const defense=target.baseStats[m.category==='Physical'?'def':'spd']+20;value=((22*(m.basePower||50)*p.stats[m.category==='Physical'?'atk':'spa']/defense)/50+2)*changed;}
  else value*=changed/native;
  value*=stage(p.active?(o.switching?.boosts[m.category==='Physical'?'atk':'spa']??0):0);
  if(m.category==='Physical'&&p.condition.includes('brn')&&id(p.ability)!=='guts')value*=.5;
  return value;
 }
 private entry(p:OwnPokemon,o:Observation){
  if(id(p.item)==='heavydutyboots'||id(p.ability)==='magicguard')return 0;
  const h=o.switching?.hazards;if(!h)return 0;
  const grounded=!types(p).includes('Flying')&&id(p.ability)!=='levitate'&&id(p.item)!=='airballoon';
  return (h.stealthRock?effectiveness('Rock',types(p))/8:0)+(grounded?[0,1/8,1/6,1/4][h.spikes]:0);
 }
 private bestAttack(p:OwnPokemon,o:Observation){return Math.max(0,...(p.moves??[]).map(name=>this.attackEstimate({command:'',label:name,estimatedDamage:0},p,o)));}
 recordDecision(action:string,o:Observation){
  if(action.startsWith('switch ')&&o.legalActions.some(a=>a.command.startsWith('move '))){
   this.supportSwitches++;this.lastSwitch=o.turn;const own=o.ownTeam.find(p=>p.active);if(own)this.supportDeparted.set(own.ident,o.turn);
  }
 }
 private finish(action:string,reason:string,o:Observation){
  this.decisionReason=reason;this.recordDecision(action,o);
  return action;
 }
 private attackCommand(a:Action,o:Observation){
  for(const suffix of ['mega','terastallize','dynamax'])if(o.legalActions.some(b=>b.command===a.command+' '+suffix))return a.command+' '+suffix;
  return a.command;
 }
 override choose(original:Observation):string {
  const own=original.ownTeam.find(p=>p.active);this.lastOwn=own;this.turn=original.turn;
  const canSwitch=this.supportSwitches<4&&original.turn-this.lastSwitch>=3&&!original.switching?.maybeTrapped&&!original.switching?.dynamax;
  const o=canSwitch?original:{...original,legalActions:original.legalActions.filter(a=>!a.command.startsWith('switch ')||!original.legalActions.some(m=>m.command.startsWith('move ')))};
  if(!own||!o.opponent||!o.legalActions.some(a=>a.command.startsWith('move ')))return this.finish(super.choose(o),'preview-or-forced',o);
  const asleep=own.condition.includes('slp')||own.condition.includes('frz');
  const moves=o.legalActions.filter(a=>/^move \d+$/.test(a.command));
  const attacks=moves.filter(a=>Showdown.Dex.moves.get(a.label).category!=='Status').sort((a,b)=>this.attackEstimate(b,own,o)-this.attackEstimate(a,own,o));
  const targetHP=(Showdown.Dex.species.get(o.opponent.species).baseStats.hp+91)*fraction(o.opponent.condition);
  if(!asleep&&attacks[0]&&this.attackEstimate(attacks[0],own,o)>=targetHP)return this.finish(this.attackCommand(attacks[0],o),'finishing-hit',o);
  const maxHP=Number(own.condition.split(' ')[0].split('/')[1])||100,rawRisk=this.incoming(own,o,true)/maxHP;
  const alive=o.ownTeam.filter(p=>fraction(p.condition)>0);
  const screen=moves.find(a=>{
   const m=Showdown.Dex.moves.get(a.label);if(!screens.has(m.id)||asleep||alive.length<2||(this.walls.get(m.id)??0)>o.turn)return false;
   if(o.turn-(this.attempts.get(own.ident+':'+m.id)??-10)<3)return false;
   if(m.id==='auroraveil'&&!this.snow)return false;
   if(['brickbreak','psychicfangs','defog'].includes(id(o.lastOpponentMove??'')))return false;
   const target=Showdown.Dex.species.get(o.opponent!.species),last=Showdown.Dex.moves.get(o.lastOpponentMove??''),physical=last.exists&&last.category!=='Status'?last.category==='Physical':target.baseStats.atk>=target.baseStats.spa;
   if(m.id!=='auroraveil'&&m.id!==(physical?'reflect':'lightscreen'))return false;
   const fast=id(own.ability)==='prankster'||this.speed(own,o)>this.enemySpeed(o);
   const projected=fast?this.incoming(own,o,false,m.id)/maxHP:rawRisk;
   return rawRisk>=.12&&fraction(own.condition)-projected>.2;
  });
  if(screen)return this.finish(screen.command,'safe-screen',o);
  const protectedTurns=Math.max(0,...[...this.walls.values()].map(n=>n-o.turn));
  const setter=(own.moves??[]).some(m=>screens.has(id(m)));
  const usefulProtection=this.incoming(own,o)<this.incoming(own,o,true)*.85;
  if(setter&&usefulProtection&&protectedTurns>=3&&!['atk','spa'].some(s=>(o.switching?.boosts[s]??0)>0)){
   const receivers=o.legalActions.filter(a=>a.command.startsWith('switch ')).map(action=>({action,p:o.ownTeam[Number(action.command.split(' ')[1])-1]})).filter(({p})=>p&&fraction(p.condition)-this.entry(p,o)>=.5&&o.turn-(this.supportDeparted.get(p.ident)??-10)>=4);
   const best=receivers.map(c=>({...c,attack:this.bestAttack(c.p,o),risk:this.incoming(c.p,o)/(Number(c.p.condition.split(' ')[0].split('/')[1])||100),setup:(c.p.moves??[]).some(m=>setups.has(id(m)))})).filter(c=>c.risk<.25&&fraction(c.p.condition)-this.entry(c.p,o)-2*c.risk>.3&&!/slp|frz/.test(c.p.condition)&&!(c.p.condition.includes('brn')&&c.p.stats.atk>c.p.stats.spa&&id(c.p.ability)!=='guts')&&c.attack>0&&(c.setup||c.attack>this.bestAttack(own,o)*1.25)).sort((a,b)=>(b.attack+(b.setup?50:0)-b.risk*100)-(a.attack+(a.setup?50:0)-a.risk*100))[0];
   if(best)return this.finish(best.action.command,'screen-handoff',o);
  }
  const risk=this.incoming(own,o)/maxHP;
  const room=moves.find(a=>id(a.label)==='trickroom');
  if(room&&!asleep&&this.roomUntil<=o.turn&&fraction(own.condition)-risk>.55&&risk<.25&&alive.filter(p=>this.speed(p,o)<this.enemySpeed(o)).length>=2&&alive.every(p=>this.speed(p,o)<this.enemySpeed(o))&&o.turn-(this.attempts.get(own.ident+':trickroom')??-10)>=3)return this.finish(room.command,'safe-trick-room',o);
  const setup=moves.find(a=>{
   const m=Showdown.Dex.moves.get(a.label);if(!setups.has(m.id)||asleep||fraction(own.condition)<.55||fraction(own.condition)-2*risk<.4||risk>.25||o.turn-(this.attempts.get(own.ident+':'+m.id)??-10)<5)return false;
   if(m.id==='shellsmash'&&risk>.15)return false;
   if(own.condition.includes('brn')&&m.boosts?.atk&&!m.boosts?.spa&&id(own.ability)!=='guts')return false;
   if(protectedTurns>0&&!usefulProtection)return false;
   const boostedHit=attacks[0]?this.attackEstimate(attacks[0],own,o)*1.5:0;
   if(attacks[0]&&this.attackEstimate(attacks[0],own,o)>=targetHP*.55)return false;
   if(boostedHit<=0)return false;
   return (m.boosts?.atk&&attacks.some(a=>Showdown.Dex.moves.get(a.label).category==='Physical')&&(o.switching?.boosts.atk??0)<2)||(m.boosts?.spa&&attacks.some(a=>Showdown.Dex.moves.get(a.label).category==='Special')&&(o.switching?.boosts.spa??0)<2);
  });
  if(setup)return this.finish(setup.command,protectedTurns>0?'screen-setup':'safe-setup',o);
  // Do not let the legacy status scorer attempt a rejected unsafe setup or a useless wall.
  const safe={...o,legalActions:o.legalActions.filter(a=>!a.command.startsWith('move ')||!screens.has(id(a.label))&&!setups.has(id(a.label))&&id(a.label)!=='trickroom')};
  return this.finish(super.choose(safe.legalActions.length?safe:o),'attack-recover-or-retreat',o);
 }
}
