import Showdown from 'pokemon-showdown';
import {publicMoveEffectiveness} from '../../src/data/type-effectiveness';

// Retrospective public-event diagnosis, not a decision policy or a proof of causation.
export function immuneLossSignals(team:any[],lines:string[]){
 const alive=new Set(team.map(s=>s.name||s.species));
 let own='',enemy='',types:string[]=[],ability='';
 const counts:Record<string,number>={};const bump=(key:string)=>counts[key]=(counts[key]??0)+1;
 const answers=(s:any)=>s.moves.some((text:string)=>{
  const m=Showdown.Dex.moves.get(text);if(m.category==='Status')return false;
  const a=Showdown.toID(ability),bypass=m.ignoreAbility||['moldbreaker','teravolt','turboblaze'].includes(Showdown.toID(s.ability));
  if(!bypass&&(a==='wellbakedbody'&&m.type==='Fire'||a==='eartheater'&&m.type==='Ground'||a==='soundproof'&&m.flags.sound||a==='bulletproof'&&m.flags.bullet||a==='windrider'&&m.flags.wind))return false;
  return publicMoveEffectiveness({type:m.type,defending:types,ability,ownAbility:s.ability,move:m.id,ignoreAbility:!!m.ignoreAbility})>0;
 });
 for(const l of lines){
  const [,event,actor,value]=l.split('|');
  if(['switch','drag','replace'].includes(event)){
   if(actor?.startsWith('p1'))own=actor.slice(actor.indexOf(':')+2);
   if(actor?.startsWith('p2')){enemy=value.split(',')[0];types=[...Showdown.Dex.species.get(enemy).types];const t=value.match(/tera:([^,]+)/);if(t&&t[1]!=='Stellar')types=[t[1]];ability='';}
  }
  if(event==='faint'&&actor?.startsWith('p1'))alive.delete(own);
  if(event==='-terastallize'&&actor?.startsWith('p2')&&value!=='Stellar')types=[value];
  if(event==='-formechange'&&actor?.startsWith('p2')){enemy=value;types=[...Showdown.Dex.species.get(enemy).types];ability='';}
  if(event==='-start'&&actor?.startsWith('p2')&&value==='typechange')types=l.split('|')[4].split('/');
  if(event==='-ability'&&actor?.startsWith('p2'))ability=value;
  if(event!=='-immune'||!actor?.startsWith('p2'))continue;
  const reveal=l.match(/\[from\] ability: ([^|]+)/);if(reveal)ability=reveal[1];
  if(!ability)continue;
  if(['Well-Baked Body','Earth Eater','Soundproof','Bulletproof','Wind Rider'].includes(ability))bump('public-ability-outside-current-policy-list');
  const remaining=team.filter(s=>alive.has(s.name||s.species)&&answers(s));
  if(remaining.length===0)bump('no-static-direct-answer-among-survivors');
  else if(remaining.some(s=>(s.name||s.species)===own))bump('static-answer-on-current-pokemon');
  else bump('static-answer-only-on-bench');
 }
 return counts;
}
