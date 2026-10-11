import Showdown from 'pokemon-showdown';
import type {Observation,OwnPokemon} from './policy';

const ident=(s:string)=>s.replace(/^p1a:/,'p1:');
const health=(s:string)=>{const match=/^(\d+)\/(\d+)/.exec(s);return match?{hp:Number(match[1]),max:Number(match[2])}:s.startsWith('0')?{hp:0,max:0}:null;};
type Evidence={own:string;move:string;category:string;wallAffected:boolean;turn:number;entry:number;attack:number;rawFraction:number;signature:string};
type Attack={id:number;move:string;category:string;wallAffected:boolean;crit:boolean;loss:Map<string,number>};

// Own HP and publicly announced attacks only. This never receives the enemy team/request.
export class ObservedDamage {
 private turn=0;
 private entry=0;
 private sequence=0;
 private attack:Attack|null=null;
 private own=new Map<string,{pokemon:OwnPokemon;signature:string}>();
 private hp=new Map<string,{hp:number;max:number}>();
 private walls=new Set<string>();
 private records:Evidence[]=[];
 private ignored={residual:0,critical:0,censored:0,unknown:0};
 private signature(p:OwnPokemon,o:Observation){return JSON.stringify([p.details,p.stats.def,p.stats.spd,p.item,p.ability,p.terastallized,p.active?o.switching?.boosts.def??0:0,p.active?o.switching?.boosts.spd??0:0,health(p.condition)?.max]);}
 observe(o:Observation){for(const p of o.ownTeam){this.own.set(p.ident,{pokemon:structuredClone(p),signature:this.signature(p,o)});const hp=health(p.condition);if(hp)this.hp.set(p.ident,hp);}this.turn=o.turn;}
 private resetEnemy(){this.entry++;this.records=[];this.attack=null;}
 private factor(category:string,ignore=false,prospective?:string){return !ignore&&(this.walls.has('auroraveil')||this.walls.has(category==='Physical'?'reflect':'lightscreen'))||prospective==='auroraveil'||prospective===(category==='Physical'?'reflect':'lightscreen')?.5:1;}
 consume(line:string){
  const p=line.split('|'),event=p[1];
  if(event==='turn'){this.turn=Number(p[2]);this.attack=null;return;}
  if(['switch','drag'].includes(event)){
   this.attack=null;
   if(p[2]?.startsWith('p2a:'))this.resetEnemy();
   if(p[2]?.startsWith('p1a:')){const h=health(p[4]??'');if(h)this.hp.set(ident(p[2]),h);}
   return;
  }
  if(p[2]?.startsWith('p2a:')&&(['-formechange','detailschange','-terastallize','-status','-curestatus','-clearboost'].includes(event)||['-boost','-unboost','-setboost'].includes(event)&&['atk','spa'].includes(p[3]))){this.resetEnemy();return;}
  if(event==='-clearallboost'){this.resetEnemy();this.own.clear();return;}
  if(p[2]?.startsWith('p1a:')&&(['-formechange','detailschange','-terastallize','-clearboost'].includes(event)||['-boost','-unboost','-setboost'].includes(event)&&['def','spd'].includes(p[3]))){this.own.delete(ident(p[2]));return;}
  if(['-sidestart','-sideend'].includes(event)&&p[2]?.startsWith('p1:')){const effect=Showdown.toID(p[3].replace(/^move: /,''));if(['reflect','lightscreen','auroraveil'].includes(effect)){if(event==='-sidestart')this.walls.add(effect);else this.walls.delete(effect);}return;}
  if(event==='move'){
   const move=Showdown.Dex.moves.get(p[3]);this.attack=p[2]?.startsWith('p2a:')&&move.exists&&move.category!=='Status'?{id:++this.sequence,move:move.name,category:move.category,wallAffected:!move.damage&&!move.damageCallback,crit:false,loss:new Map()}:null;return;
  }
  if(event==='-crit'&&p[2]?.startsWith('p1a:')&&this.attack){this.attack.crit=true;this.records=this.records.filter(r=>r.attack!==this.attack!.id);this.ignored.critical++;return;}
  if(!['-damage','-heal','-sethp'].includes(event)||!p[2]?.startsWith('p1a:'))return;
  const name=ident(p[2]),before=this.hp.get(name),after=health(p[3]);
  if(after)this.hp.set(name,{hp:after.hp,max:after.max||before?.max||0});
  if(event!=='-damage')return;
  if(p.slice(4).some(s=>s.startsWith('[from]'))){this.ignored.residual++;return;}
  const known=this.own.get(name),attack=this.attack;
  if(!attack||!known||!before||!after||before.max!==after.max&&after.hp!==0){this.ignored.unknown++;return;}
  if(attack.crit)return;
  if(after.hp===0){this.records=this.records.filter(r=>r.attack!==attack.id);this.ignored.censored++;return;}
  const loss=before.hp-after.hp;if(loss<=0)return;
  attack.loss.set(name,(attack.loss.get(name)??0)+loss);
  const record:Evidence={own:name,move:attack.move,category:attack.category,wallAffected:attack.wallAffected,turn:this.turn,entry:this.entry,attack:attack.id,rawFraction:attack.loss.get(name)!/before.max/(attack.wallAffected?this.factor(attack.category):1),signature:known.signature};
  this.records=this.records.filter(r=>!(r.attack===attack.id&&r.own===name));this.records.push(record);this.records=this.records.slice(-24);
 }
 estimate(p:OwnPokemon,o:Observation,ignoreWall=false,prospective?:string){
  const signature=this.signature(p,o),max=health(p.condition)?.max??0;
  const valid=this.records.filter(r=>r.own===p.ident&&r.entry===this.entry&&r.signature===signature&&o.turn-r.turn>=0&&o.turn-r.turn<=3);
  return Math.max(0,...valid.map(r=>r.rawFraction*max*(r.wallAffected?this.factor(r.category,ignoreWall,prospective):1)*1.1));
 }
 context(){return {entry:this.entry,records:this.records.map(r=>({...r})),ignored:{...this.ignored},ttl:3,buffer:1.1};}
}
