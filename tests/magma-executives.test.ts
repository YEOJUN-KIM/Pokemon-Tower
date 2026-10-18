import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {hoennTrainers} from '../src/data/hoenn-trainers';
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
test('only the two Magma executives change relative to 5325869: all other reviewed/runtime NPCs stay fixed',()=>{
 const runtime=JSON.parse(readFileSync('src/data/normal-npc-templates.json','utf8')).filter((s:{id:string})=>!ids.includes(s.id));
 const source=JSON.parse(readFileSync('scripts/data/npc/normal-npc-samples.json','utf8')).samples.filter((s:{id:string})=>!ids.includes(s.id));
 assert.equal(runtime.length,282);assert.equal(source.length,282);
 assert.equal(digest(runtime),'2eb532e4104000909689ae971f5c956f49615577e5b9309f80f3578ec83713a6');
 assert.equal(digest(source),'7f5b0d122eb581a84ecb4b0c88fe81b1f3a82fd9c0909b98948a22b2f5bd723b');
});
function sampleFor(id:string){const group=villainLeaders.magma;return {...[group.executive,...group.executives!].find(s=>id.endsWith('-'+s.portrait))!,id};}
for(const id of ids){
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

