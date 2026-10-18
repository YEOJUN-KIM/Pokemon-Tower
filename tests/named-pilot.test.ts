import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import rows from '../src/data/normal-npc-templates.json' with {type:'json'};
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {organizationGrunt,villainLeaders} from '../src/data/villain-organizations';
import {npcAi} from '../src/data/npc-ai';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {DamagePolicy} from '../src/battle/policy';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
import {isHeldItem} from '../src/data/held-items';

const samples=[...['falkner','whitney','clair'].map(id=>namedTrainerSamples.find(s=>s.id==='named-'+id)!),organizationGrunt('rocket'),villainLeaders.rocket.executive,villainLeaders.rocket.boss];
test('six pilot candidate pools are canonical, legal and playable at low/high floors with seeded selection',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const sample of samples){
  const source=normalNpcTemplate(sample.id,5,sample.role)!;assert.ok(source,sample.id);assert.ok(source.allFloors);assert.ok(source.team.length>=5);
  assert.deepEqual(normalNpcTemplate(sample.id,95,sample.role),source,'no early/late clone');
  for(const p of source.team){
   assert.ok(!p.item||isHeldItem(p.item),p.species+' supported item');
   assert.ok(isCollectibleSpecies(p.species),p.species);assert.equal(p.profile.moves.length,4);assert.equal(new Set(p.profile.moves).size,4);
   const errors=validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.profile.ability,moves:p.profile.moves,item:p.item},{});
   assert.equal(errors,null,`${sample.id} ${p.species}: ${errors}`);
  }
  const variations=new Set<string>();
  for(const floor of [5,45,55,80,100])for(let n=0;n<8;n++){
   const seed:[number,number,number,number]=[n,2,3,4],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION);
   assert.equal(team.length,3);assert.equal(new Set(team.map(p=>p.name)).size,3);
   if(source.ace)assert.ok(team.some(p=>p.name===source.ace));
   if(sample.id===villainLeaders.rocket.boss.id)assert.ok(team.some(p=>p.name==='Persian'));
   assert.deepEqual(generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),team);
   variations.add(team.map(p=>p.name).sort().join(','));
  }
  assert.ok(variations.size>1,sample.id+' variation');
 }
 assert.equal(rows.filter(r=>samples.some(s=>s.id===r.id)&&'allFloors' in r&&r.allFloors).length,6);
});

test('pilot AI ceilings and gym tiers keep v11 rules',()=>{
 assert.deepEqual(normalNpcTemplate('rocket-boss-giovanni',95,'villain'),normalNpcTemplate('named-giovanni',95,'villain'));
 assert.deepEqual(normalNpcTemplate('rocket-executive-archer',95,'villain'),normalNpcTemplate('named-archer',95,'villain'));
 for(const floor of [5,55,100]){
  for(const s of samples.slice(0,3))assert.equal(npcAi(floor,s).tier,floor<50?'tactical':'expert');
  assert.notEqual(npcAi(floor,samples[3]).tier,'expert');
  assert.equal(npcAi(floor,samples[4]).tier,'tactical');assert.equal(npcAi(floor,samples[5]).tier,'expert');
 }
});

for(const sample of samples)test(`${sample.id} actual v11 battle is legal, deterministic and replayable`,async()=>{
 const floor=55,seed:[number,number,number,number]=[1,2,3,4],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),source=normalNpcTemplate(sample.id,floor,sample.role)!;
 const p2=packTeam(team.map(p=>p.name),Object.fromEntries(team.map(p=>[p.name,p.profile!])),Object.fromEntries(team.map(p=>[p.name,p.item??''])));
 const log=await runBattle({seed,rule:'chaos',teams:{p1:packTeam(starters),p2},player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(floor,sample)),teraTickets:{p1:0,p2:source.signature?.rule==='tera'?1:0}});
 assert.ok(log.winner);for(const d of log.decisions)assert.ok(d.observation.legalActions.some(a=>a.command===d.action));
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
