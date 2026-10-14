import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {allowedOpponentSpecies,evolvedOpponentSpecies,retainedUnevolvedOpponents} from '../src/data/opponent-species';
import {opponentProfile} from '../src/server/opponent-training';
import {generateOpponentTeam,encounterPool} from '../src/server/opponent-team';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {pokemonSets} from '../src/data/teams';
import {FORMAT} from '../src/data/battle-rules';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
import templates from '../src/data/normal-npc-templates.json' with {type:'json'};
import {TowerStore} from '../src/server/tower-store';
import {packTeam,starters} from '../src/data/teams';
import type {BattleLog} from '../src/battle/run';

test('first ten floors use six zero IVs and later floors and legacy profiles retain their ranges',()=>{
 const raw={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};
 for(let floor=1;floor<=10;floor++)assert.deepEqual(opponentProfile('Charizard',pokemonSets.Charizard.moves,floor,raw,'hundred-floor-v1').ivs,{hp:0,atk:0,def:0,spa:0,spd:0,spe:0});
 assert.ok(opponentProfile('Charizard',pokemonSets.Charizard.moves,11,raw,'hundred-floor-v1').ivs.atk>0);
 assert.ok(opponentProfile('Charizard',pokemonSets.Charizard.moves,5,raw,'legacy').ivs.atk>0);
});
test('new random pools use the collection evolution policy, including Red',()=>{
 const pool=encounterPool(100,'hundred-floor-v1');
 assert.deepEqual(new Set(pool.filter(name=>Showdown.Dex.species.get(name).nfe)),retainedUnevolvedOpponents);
 for(const name of ['Doublade','Torracat','Dragonair','Haunter','Gligar','Chansey','Dusclops'])assert.ok(!pool.includes(name));
 assert.ok(encounterPool(100,'legacy').includes('Doublade'));assert.equal(evolvedOpponentSpecies('Torracat'),'Incineroar');assert.equal(evolvedOpponentSpecies('Doublade'),'Aegislash');
 assert.equal(evolvedOpponentSpecies('Pikachu',true),'Pikachu');assert.equal(evolvedOpponentSpecies('Pikachu'),'Pikachu');
 assert.equal(evolvedOpponentSpecies('Gligar'),'Gliscor');assert.equal(evolvedOpponentSpecies('Chansey'),'Blissey');assert.equal(evolvedOpponentSpecies('Dusclops'),'Dusknoir');assert.equal(evolvedOpponentSpecies('Duraludon'),'Duraludon');
});
test('all named samples have three distinct legal allowed opponents after evolution and deduplication',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const sample of namedTrainerSamples){
  const team=generateOpponentTeam(50,[1,2,3,4],[],null,sample,'hundred-floor-v1');assert.equal(new Set(team.map(p=>p.name)).size,3);
  for(const entry of team){assert.ok(allowedOpponentSpecies(entry.name),sample.id+': '+entry.name);assert.equal(validator.validateSet({...structuredClone(pokemonSets[entry.name]),moves:entry.moves,...(entry.ability?{ability:entry.ability}:{}),item:entry.item==='Dynamax Band'?'':entry.item??''},{}),null,sample.id+': '+entry.name);}
 }
});

test('every live NPC template has three collectible members and an eligible gimmick carrier',()=>{
 assert.equal(templates.length,328);
 for(const row of templates){
  assert.equal(new Set(row.team.map(p=>p.species)).size,3,row.id);
  for(const member of row.team)assert.ok(isCollectibleSpecies(member.species),row.id+': '+member.species);
  assert.ok(isCollectibleSpecies(row.ace),row.id+' ace');
  assert.ok(row.team.some(p=>p.species===row.signature.species),row.id+' carrier');
 }
});

test('old Gligar battles keep their saved team; the next battle offers three collectible recruits',()=>{
 const store=new TowerStore(':memory:');
 try{
  store.ensurePlayer('evolution');
  const id=store.start('evolution',starters,'basic'),row=store.battle(id);
  const oldTeam=packTeam(['Gligar','Golem','Mamoswine']);
  store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(oldTeam,id);
  const log:BattleLog={schemaVersion:1,engineVersion:row.engine_version,format:row.format,teams:{p1:row.player_team,p2:oldTeam},seed:JSON.parse(row.seed),rule:row.rule,upgrades:JSON.parse(row.upgrades),teraTickets:JSON.parse(row.tera_tickets),decisions:[],publicProtocol:[],winner:'Player',turns:1};
  store.complete(id,log,{id,status:'complete',requestId:1,turn:1,team:[],opponent:null,actions:[],messages:[],winner:'Player',error:null});
  assert.deepEqual(store.view('evolution').run!.candidates,['Golem','Mamoswine']);
  store.recruit('evolution',row.run_id,id,null,null);
  const nextId=store.enter('evolution',row.run_id,2,starters),next=store.battle(nextId);
  const members=Showdown.Teams.unpack(next.opponent_team)!;
  assert.equal(members.length,3);assert.ok(members.every(p=>isCollectibleSpecies(p.species)));
  const nextLog:BattleLog={...log,teams:{p1:next.player_team,p2:next.opponent_team},seed:JSON.parse(next.seed),upgrades:JSON.parse(next.upgrades),teraTickets:JSON.parse(next.tera_tickets)};
  store.complete(nextId,nextLog,{id:nextId,status:'complete',requestId:1,turn:1,team:[],opponent:null,actions:[],messages:[],winner:'Player',error:null});
  assert.equal(store.view('evolution').run!.candidates.length,3);
  assert.equal(store.battle(id).opponent_team,oldTeam);
 }finally{store.close();}
});
