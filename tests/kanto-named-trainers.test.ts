import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import runtime from '../src/data/normal-npc-templates.json' with {type:'json'};
import {towerThemes} from '../src/data/tower-themes';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {satisfiesSelectionRules} from '../src/data/npc-selection-rules';
import {isHeldItem} from '../src/data/held-items';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {CURRENT_PROGRESSION,towerDifficulty} from '../src/data/tower-progression';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {npcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {DamagePolicy} from '../src/battle/policy';
import {packedNpcRule} from '../src/data/npc-gimmicks';

const theme=towerThemes.kanto,ids=[...theme.gyms,...theme.elites,theme.champion,theme.final];
for(const id of ids){
 const sample=namedTrainerSamples.find(s=>s.id===id)!;
 test(`${id}: reviewed original-inspired pool, floor scaling and deterministic seeded composition`,()=>{
  const source=normalNpcTemplate(id,5,sample.role)!;assert.ok(source.allFloors);assert.ok(source.select);assert.ok(source.team.length>=5&&source.team.length<=6);
  assert.equal(new Set(source.team.map(p=>p.item)).size,source.team.length);
  const validator=new Showdown.TeamValidator(FORMAT);
  for(const p of source.team){assert.ok(isCollectibleSpecies(p.species));assert.ok(isHeldItem(p.item));assert.equal(new Set(p.profile.moves).size,4);assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.profile.ability,item:p.item,moves:p.profile.moves},{}),null,p.species);}
  const combinations=new Set<string>(),orders=new Set<string>();
  for(const floor of [5,45,50,55,95,100])for(let n=0;n<16;n++){
   const seed:[number,number,number,number]=[n,2,3,4],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),names=team.map(p=>p.name);
   assert.equal(team.length,3);assert.equal(new Set(names).size,3);assert.ok(names.includes(source.ace));assert.ok(names.includes(source.signature!.species));assert.ok(satisfiesSelectionRules(names,source.selectionRules));
   assert.deepEqual(team,generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION));
   for(const p of team){assert.ok(source.team.some(s=>s.species===p.name));assert.equal(Object.values(p.profile!.evs).reduce((a,b)=>a+b,0),towerDifficulty(floor).points);assert.equal(p.profile!.nature,'Serious');}
   assert.equal(npcAi(floor,sample).tier,sample.role==='champion'||floor>=50?'expert':'tactical');
   combinations.add([...names].sort().join(','));orders.add(names.join(','));
  }
  assert.ok(combinations.size>1);assert.ok(orders.size>combinations.size);
 });
 test(`${id}: real v11 battle and replay preserve the selected team`,async()=>{
  const floor=55,seed:[number,number,number,number]=[1,2,3,4],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),signature=normalNpcTemplate(id,floor,sample.role)!.signature;
  const p2=packTeam(team.map(p=>p.name),Object.fromEntries(team.map(p=>[p.name,p.profile!])),Object.fromEntries(team.map(p=>[p.name,p.item??''])),team.filter(p=>p.gigantamax).map(p=>p.name)),tera=signature?.rule==='tera'?1:0;
  const log=await runBattle({seed,teams:{p1:packTeam(starters),p2},rule:'chaos',opponentRule:packedNpcRule(team.map(p=>({item:p.item??''})),tera),opponentTeraSpecies:tera?signature!.species:undefined,teraTickets:{p1:0,p2:tera},player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(floor,sample))});
  assert.ok(log.winner);for(const d of log.decisions)assert.ok(d.observation.legalActions.some(a=>a.command===d.action));
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 });
}

test('Kanto-only review never changes Johto or Rocket boss identities and builds',()=>{
 const hash=createHash('sha256').update(JSON.stringify(runtime.filter(r=>!ids.includes(r.id)))).digest('hex');
 assert.equal(hash,'1aae15069a564ed953f7780e77e5413ce029d3842558e0ad459e4fc3cfdcd5c1');
 assert.notDeepEqual(normalNpcTemplate('named-koga-kanto',95,'gym'),normalNpcTemplate('named-koga',95,'elite'));
 assert.notDeepEqual(normalNpcTemplate('named-lance-kanto',95,'elite'),normalNpcTemplate('named-lance',95,'champion'));
 assert.notDeepEqual(normalNpcTemplate('named-giovanni-gym',95,'gym'),normalNpcTemplate('named-giovanni',95,'villain'));
});

test('known Kanto move/role failures and passive trios cannot return',()=>{
 const sabrina=normalNpcTemplate('named-sabrina',95,'gym')!;
 assert.ok(sabrina.team.find(p=>p.species==='Alakazam')!.profile.moves.includes('Psychic'));
 for(const id of ids)for(const p of normalNpcTemplate(id,95)!.team)assert.ok(!p.profile.moves.some(m=>['Focus Punch','Belch','Steel Roller','Wring Out'].includes(m)),`${id}/${p.species}`);
 assert.equal(namedTrainerSamples.find(s=>s.id==='named-ltsurge')!.tactic,'speed');
});
