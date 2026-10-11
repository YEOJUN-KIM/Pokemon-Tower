import Showdown from 'pokemon-showdown';
import {publicMoveEffectiveness} from '../../src/data/type-effectiveness';
import {validateProfile} from '../../src/server/training';
import {packTeam} from '../../src/data/teams';
import type {TrainingProfile} from '../../src/data/training';

export function auditProfile(species:string,p:TrainingProfile){
 const issues:{kind:string;detail:string}[]=[];
 try{validateProfile(species,p);}catch(e){issues.push({kind:'illegal-profile',detail:String(e)});}
 const moves=p.moves.map(m=>Showdown.Dex.moves.get(m));
 const attacks=moves.filter(m=>m.category!=='Status'&&!m.damage&&!m.damageCallback&&m.id!=='foulplay'&&m.id!=='bodypress');
 if(!moves.some(m=>m.category!=='Status'))issues.push({kind:'no-direct-attack',detail:'Support-only; requires an ally or indirect damage plan.'});
 const physical=attacks.length>0&&attacks.every(m=>m.category==='Physical');
 const special=attacks.length>0&&attacks.every(m=>m.category==='Special');
 if(physical&&p.evs.spa>p.evs.atk||special&&p.evs.atk>p.evs.spa)issues.push({kind:'training-category-mismatch',detail:physical?'Physical moves, more special investment.':'Special moves, more physical investment.'});
 const nature=Showdown.Dex.natures.get(p.nature);
 if(physical&&nature.minus==='atk'||special&&nature.minus==='spa')issues.push({kind:'nature-category-mismatch',detail:p.nature});
 if(moves.some(m=>m.id==='auroraveil')&&Showdown.toID(p.ability)!=='snowwarning')issues.push({kind:'veil-needs-team-snow',detail:'Check teammate weather; this is not automatically an error.'});
 if(moves.some(m=>m.id==='trickroom')&&p.evs.spe>0)issues.push({kind:'room-speed-review',detail:'Speed investment needs role review; not automatically an error.'});
 return issues;
}

// Offline diagnostics only. These known target abilities never become player policy input.
// Static attack availability is not a complete battle outcome predictor.
export function directAnswer(species:string,p:TrainingProfile,target:string,ability:string){
 const enemy=Showdown.Dex.species.get(target),a=Showdown.toID(ability),own=Showdown.toID(p.ability);
 const bypass=['moldbreaker','teravolt','turboblaze'].includes(own);
 return p.moves.filter(text=>{
  const m=Showdown.Dex.moves.get(text);if(m.category==='Status')return false;
  if(!bypass&&!m.ignoreAbility){
   if(a==='wellbakedbody'&&m.type==='Fire'||a==='eartheater'&&m.type==='Ground'||a==='soundproof'&&m.flags.sound||a==='bulletproof'&&m.flags.bullet||a==='windrider'&&m.flags.wind)return false;
  }
  return publicMoveEffectiveness({type:m.type,defending:enemy.types,ability,ownAbility:p.ability,move:m.id,ignoreAbility:!!m.ignoreAbility})>0;
 }).map(move=>({species,move}));
}
export function auditTeam(team:string[],profiles:Record<string,TrainingProfile>,targets:string[]){
 const issues=team.flatMap(n=>auditProfile(n,profiles[n]).map(i=>({...i,species:n})));
 if(team.length!==3||new Set(team).size!==3)issues.push({kind:'invalid-triple',detail:'Expected three distinct species.',species:''});
 try{
  const sets=Showdown.Teams.unpack(packTeam(team,profiles))!.map(s=>({...s,pokeball:'',evs:{hp:1,atk:0,def:0,spa:0,spd:0,spe:0}}));
  const errors=new Showdown.TeamValidator('gen9nationaldexag@@@Max Team Size = 3,Adjust Level = 50').validateTeam(sets);
  if(errors?.length)issues.push({kind:'illegal-team',detail:errors.join('; '),species:''});
 }catch(e){issues.push({kind:'illegal-team',detail:String(e),species:''});}
 const gaps=targets.flatMap(target=>{
  const abilities=[...new Set(Object.values(Showdown.Dex.species.get(target).abilities))];
  return abilities.filter(ability=>team.every(n=>directAnswer(n,profiles[n],target,ability).length===0)).map(ability=>({target,ability,kind:'no-static-direct-answer'}));
 });
 return {issues,gaps};
}
