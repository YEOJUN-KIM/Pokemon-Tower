import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {validateProfile} from '../src/server/training';
import {moveLearnsets} from '../src/server/move-learnsets';
import {packTeam} from '../src/data/teams';

const source='artifacts/support-recheck-climb-cases.json';
const original=JSON.parse(readFileSync(source,'utf8'));
const corrected=structuredClone(original);
const changes:any[]=[];
for(const c of corrected){
 if(c.id==='espeon-screen'){
  // Preserve both screens, Baton Pass, U-turn and both sweepers' setup moves.
  c.moves.Gyarados[1]='Crunch';c.profiles.Gyarados.moves[1]='Crunch';
  changes.push({caseId:c.id,species:'Gyarados',before:'Ice Fang',after:'Crunch',reason:'Team-wide Wonder Guard coverage; trades Ice coverage for Dark coverage.'});
 }
 for(const [name,attack,nature] of [['Azumarill','atk','Adamant'],['Torkoal','spa','Quiet']] as const){
  const p=c.profiles[name];if(!p)continue;
  const before=structuredClone(p);
  const other=attack==='atk'?'spa':'atk';p.evs[attack]=p.evs[other];p.evs[other]=0;p.nature=nature;
  changes.push({caseId:c.id,species:name,before,after:structuredClone(p),reason:'Training follows the actual attacking move category, preserving total points and speed.'});
 }
}
const audit:any[]=[];
for(const c of [ ...original.map((c:any)=>({...c,version:'original'})),...corrected.map((c:any)=>({...c,version:'corrected'}))]){
 const mismatches:any[]=[];
 for(const name of c.team){
  const p=c.profiles[name];assert.deepEqual(p.moves,c.moves[name]);validateProfile(name,p);
  assert.equal(Object.values(p.evs).reduce((s:number,n:any)=>s+n,0),66);
  for(const m of p.moves)assert(moveLearnsets[name].legalMoves.includes(m),name+' cannot learn '+m);
  const attacks=p.moves.map((m:string)=>Showdown.Dex.moves.get(m)).filter((m:any)=>m.category!=='Status'&&m.id!=='foulplay');
  if(attacks.length&&attacks.every((m:any)=>m.category==='Physical')&&p.evs.spa>p.evs.atk)mismatches.push(name);
  if(attacks.length&&attacks.every((m:any)=>m.category==='Special')&&p.evs.atk>p.evs.spa)mismatches.push(name);
 }
 const packed=packTeam(c.team,c.profiles,c.items);
 const errors=new Showdown.TeamValidator('gen9nationaldexag@@@Max Team Size = 3,Adjust Level = 50').validateTeam(Showdown.Teams.unpack(packed)!.map(s=>({...s,pokeball:'',evs:{hp:1,atk:0,def:0,spa:0,spd:0,spe:0}})));
 assert(!errors?.length,JSON.stringify(errors));
 const shedinjaAnswers=c.team.flatMap((n:string)=>c.moves[n].filter((m:string)=>{const move=Showdown.Dex.moves.get(m);return move.category!=='Status'&&Showdown.Dex.getEffectiveness(move.type,Showdown.Dex.species.get('Shedinja'))>0&&Showdown.Dex.getImmunity(move.type,Showdown.Dex.species.get('Shedinja'));}).map((m:string)=>n+': '+m));
 audit.push({version:c.version,caseId:c.id,mismatches,shedinjaAnswers});
}
assert.equal(changes.length,3);assert(audit.filter(a=>a.version==='corrected').every(a=>a.mismatches.length===0&&a.shedinjaAnswers.length>0));
writeFileSync('artifacts/support-corrected-climb-cases.json',JSON.stringify(corrected,null,2));
const files=[source,'artifacts/support-corrected-climb-cases.json','scripts/simulate-immunity-climb.ts','src/battle/matchup-aware-support-player-policy.ts'];
writeFileSync('artifacts/support-correction-manifest.json',JSON.stringify({changes,audit,files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),notes:'Only experimental player fixtures corrected. Same policy, enemy, courses, economy. No live save changes.'},null,2));
console.log(JSON.stringify({changes:changes.map(c=>({caseId:c.caseId,species:c.species,reason:c.reason})),audit},null,2));
