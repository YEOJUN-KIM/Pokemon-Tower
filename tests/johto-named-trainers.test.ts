import {createHash} from 'node:crypto';
import runtime from '../src/data/normal-npc-templates.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {npcAi} from '../src/data/npc-ai';
import {CURRENT_PROGRESSION,towerDifficulty} from '../src/data/tower-progression';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {DamagePolicy} from '../src/battle/policy';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
import {isHeldItem} from '../src/data/held-items';

const aces={bugsy:'Scizor',morty:'Gengar',chuck:'Poliwrath',jasmine:'Steelix',pryce:'Mamoswine',will:'Xatu',koga:'Crobat',bruno:'Machamp',karen:'Umbreon'};
for(const [id,ace] of Object.entries(aces)){
 const sample=namedTrainerSamples.find(s=>s.id==='named-'+id)!;
 test(`${id}: legal HGSS pool, guaranteed ace, variation and unchanged tier/scaling rules`,()=>{
  const source=normalNpcTemplate(sample.id,5,sample.role)!;assert.ok(source?.allFloors);assert.ok(source.select);
  assert.equal(source.team.length,id==='morty'?5:6);assert.equal(source.ace,ace);assert.ok(source.required?.includes(ace));
  const validator=new Showdown.TeamValidator(FORMAT);
  for(const p of source.team){
   assert.ok(isCollectibleSpecies(p.species),p.species);assert.ok(!p.item||isHeldItem(p.item),p.species+': '+p.item);
   assert.equal(p.profile.moves.length,4);assert.equal(new Set(p.profile.moves).size,4);
   assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.profile.ability,item:p.item,moves:p.profile.moves},{}),null,p.species);
  }
  const combinations=new Set<string>();
  for(const floor of [5,49,50,55,95,100]){
   assert.deepEqual(normalNpcTemplate(sample.id,floor,sample.role),source);
   assert.equal(npcAi(floor,sample).tier,floor<50?'tactical':'expert');
   for(let n=0;n<12;n++){
    const seed:[number,number,number,number]=[n,2,3,4],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION);
    assert.equal(team.length,3);assert.equal(new Set(team.map(p=>p.name)).size,3);assert.ok(team.some(p=>p.name===ace));
    assert.deepEqual(generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),team);
    for(const p of team){assert.ok(source.team.some(c=>c.species===p.name));assert.equal(Object.values(p.profile!.evs).reduce((a,b)=>a+b,0),Math.min(66,towerDifficulty(floor).points));}
    combinations.add(team.map(p=>p.name).sort().join(','));
   }
  }
  assert.ok(combinations.size>1);
 });
 test(`${id}: actual v11 battle finishes with legal actions and deterministic replay`,async()=>{
  const floor=55,seed:[number,number,number,number]=[1,2,3,4],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),signature=normalNpcTemplate(sample.id,floor,sample.role)!.signature;
  const p2=packTeam(team.map(p=>p.name),Object.fromEntries(team.map(p=>[p.name,p.profile!])),Object.fromEntries(team.map(p=>[p.name,p.item??''])),team.filter(p=>p.gigantamax).map(p=>p.name));
  const log=await runBattle({seed,rule:'chaos',teams:{p1:packTeam(starters),p2},player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(floor,sample)),opponentTeraSpecies:signature?.rule==='tera'?signature.species:undefined,teraTickets:{p1:0,p2:signature?.rule==='tera'?1:0}});
  assert.ok(log.winner);for(const d of log.decisions)assert.ok(d.observation.legalActions.some(a=>a.command===d.action));
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 });
}

// Frozen before the Johto expansion: protect every move, item and profile of the original six.
test('original six pilot runtime definitions remain byte-equivalent as structured data',()=>{
 const hashes={"named-falkner":"6dcf3e1be5c294fcc480a2350e7f472185a12600d2dfbf79e232141043c99c56","named-whitney":"c8c7af80a8baf93d79e3ec0d628e0b851d8ec3b06a23287e3e3b4c35f373128f","named-clair":"0d7a59eb5035f49a8ea8c62b9d7b64a83feb26bdeb74a4288f06bfce3f8391eb","rocket-grunt":"f56e7468bf9043b7354100afffc28e38a0c465afc298147916f39a2570534775","named-archer":"b3e3fbf2433d57220318287c469d66d1be9bd4b3b0f97bd9d4a87a97e43fb1a2","named-giovanni":"a9bcba5948932fbabe8d3463295395acbff2b10fc0fa975ae323248a037742e3"};
 for(const [id,hash] of Object.entries(hashes)){assert.equal(createHash('sha256').update(JSON.stringify(runtime.find(r=>r.id===id))).digest('hex'),hash,id);}
});
