import {kalosTrainers} from '../src/data/kalos-trainers';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {hoennTrainers} from '../src/data/hoenn-trainers';
import {sinnohTrainers} from '../src/data/sinnoh-trainers';
import {unovaTrainers} from '../src/data/unova-trainers';
import preservation from './fixtures/kalos-preservation.json' with {type:'json'};
import {villainLeaders} from '../src/data/villain-organizations';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION,towerDifficulty} from '../src/data/tower-progression';
import {satisfiesSelectionRules} from '../src/data/npc-selection-rules';
import {npcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {DamagePolicy} from '../src/battle/policy';
import {packedNpcRule} from '../src/data/npc-gimmicks';

const ids=['magma-executive-tabitha','magma-executive-courtney'];
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
test('Magma and subsequent Sinnoh reviews preserve all other reviewed/runtime NPCs',()=>{
 const excluded=new Set([...kalosTrainers.map(t=>t.id),'named-lysandre',...ids,...sinnohTrainers.map(t=>t.id),...unovaTrainers.map(t=>t.id),'named-cyrus','named-ghetsis']);
 const sort=(a:{id:string;stage:string},b:{id:string;stage:string})=>(a.id+a.stage).localeCompare(b.id+b.stage);
 const runtime=JSON.parse(readFileSync('src/data/normal-npc-templates.json','utf8')).filter((s:{id:string})=>!excluded.has(s.id)).sort(sort);
 const source=JSON.parse(readFileSync('scripts/data/npc/normal-npc-samples.json','utf8')).samples.filter((s:{id:string})=>!excluded.has(s.id)).sort(sort);
 assert.equal(runtime.length,preservation.magma.count);assert.equal(source.length,preservation.magma.count);
 assert.equal(digest(runtime),preservation.magma.runtime);
 assert.equal(digest(source),preservation.magma.source);
});
function sampleFor(id:string){const group=villainLeaders.magma;return {...[group.executive,...group.executives!].find(s=>id.endsWith('-'+s.portrait))!,id};}
for(const id of ids){
 test(`${id}: Tactical uses Shadow Ball coverage against Espeon where Trick Room stayed idle`,async()=>{
  const sample=sampleFor(id);
  const snap=Array.from({length:128},(_,n)=>snapshotTrainerEventBattle(`claydol-slot:${id}:${n}`,sample,95,'basic',CURRENT_PROGRESSION)).find(s=>s.team[0].name==='Claydol')!;
  assert.ok(snap,'native selection must produce a Claydol lead');
  const current=Showdown.Teams.unpack(snap.opponentTeam)!;
  assert.deepEqual(current[0].moves.map(Showdown.toID),['earthpower','psychic','icebeam','shadowball']);
  const previous=structuredClone(current);previous[0].moves[3]='Trick Room';
  // Same teams, stats and seed isolate the fourth slot; no AI or selection changes.
  for(const [label,p2] of [['old',Showdown.Teams.pack(previous)],['new',snap.opponentTeam]] as const){
   const log=await runBattle({teams:{p1:packTeam(['Espeon','Corviknight','Gastrodon']),p2},seed:snap.seed,rule:'basic',opponentRule:packedNpcRule(snap.team.map(p=>({item:p.item??''})),0),player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(95,sample))});
   const first=log.decisions.find(d=>d.side==='p2'&&d.observation.opponent?.species==='Espeon'&&d.observation.ownTeam.some(p=>p.active&&p.details.startsWith('Claydol'))&&d.action.startsWith('move '))!;
   assert.ok(first);
   assert.equal(first.action,label==='old'?'move 1':'move 4');
   assert.ok(log.publicProtocol.some(line=>line.startsWith(`|move|p2a: Claydol|${label==='old'?'Earth Power':'Shadow Ball'}|`)),'chosen move must actually execute');
   assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
  }
 });
 test(`${id}: supported candidate sets and varied legal triples retain ace, floor budgets and native AI`,()=>{
  const s=sampleFor(id),validator=new Showdown.TeamValidator(FORMAT);
  const template=normalNpcTemplate(id,95,'villain')!;
  assert.equal(template.ace,'Camerupt');assert.equal(template.team.length,6);
  assert.ok(!template.team.some(p=>p.species==='Magcargo'));
  assert.deepEqual(template.signature,id.endsWith('courtney')?{rule:'mega',species:'Camerupt',item:'Cameruptite'}:null);
  for(const p of template.team){
   assert.equal(p.profile.statSystem,'points');assert.equal(new Set(p.profile.moves).size,4);
   assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.profile.ability,item:p.item,moves:p.profile.moves},{}),null,p.species);
  }
  const cactus=template.team.find(p=>p.species==='Cacturne')!;assert.equal(cactus.profile.ability,'Water Absorb');
  assert.ok(cactus.profile.moves.includes('Seed Bomb'));assert.ok(cactus.profile.moves.includes('Sucker Punch'));
  assert.equal(hoennTrainers.find(t=>t.id===id)!.ace,'Camerupt');
  for(const floor of [16,45,54,55,95]){
   assert.equal(npcAi(floor,s).tier,'tactical');const combinations=new Set<string>();
   for(let n=1;n<=128;n++){
    const seed:[number,number,number,number]=[n,floor,29,43],team=generateOpponentTeam(floor,seed,[],null,s,CURRENT_PROGRESSION),names=team.map(p=>p.name);
    assert.equal(team.length,3);assert.equal(new Set(names).size,3);assert.ok(names.includes('Camerupt'));
    assert.ok(satisfiesSelectionRules(names,template.selectionRules));assert.ok(names.some(n=>['Crobat','Cacturne'].includes(n)));
    if(names.includes('Crobat'))assert.equal(names[0],'Crobat');else if(names.includes('Claydol'))assert.equal(names[0],'Claydol');
    if(floor<55||id.endsWith('tabitha'))assert.ok(team.every(p=>p.item!=='Cameruptite'));
    else assert.equal(team.find(p=>p.name==='Camerupt')!.item,'Cameruptite');
    for(const p of team)assert.equal(Object.values(p.profile!.evs).reduce((a,b)=>a+b,0),towerDifficulty(floor).points);
    assert.deepEqual(team,generateOpponentTeam(floor,seed,[],null,s,CURRENT_PROGRESSION));
    combinations.add([...names].sort().join('/'));
   }
   assert.equal(combinations.size,7,'selection must not collapse to one fixed triple');
  }
 });
 test(`${id}: event snapshots preserve new sets, identity, v12 and legal deterministic battle replay`,async()=>{
  const sample=sampleFor(id);
  for(const floor of [45,95]){
   const snap=snapshotTrainerEventBattle('magma-executive-snapshot:'+id+':'+floor,sample,floor,'basic',CURRENT_PROGRESSION);
   assert.deepEqual(JSON.parse(JSON.stringify(snap)),JSON.parse(JSON.stringify(snapshotTrainerEventBattle('magma-executive-snapshot:'+id+':'+floor,sample,floor,'basic',CURRENT_PROGRESSION))));
   assert.equal(snap.aiVersion,'tower-policy-v12');assert.equal(snap.trainer.npcAi!.tier,'tactical');
   const team=Showdown.Teams.unpack(snap.opponentTeam)!;assert.equal(team.length,3);assert.ok(team.some(p=>p.species==='Camerupt'));
   const log=await runBattle({teams:{p1:packTeam(starters),p2:snap.opponentTeam},seed:snap.seed,rule:'basic',opponentRule:packedNpcRule(snap.team.map(p=>({item:p.item??''})),0),player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(floor,sample))});
   assert.ok(log.winner);for(const d of log.decisions)assert.ok(d.observation.legalActions.some(a=>a.command===d.action));
   assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
  }
 });
}
