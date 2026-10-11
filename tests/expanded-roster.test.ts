import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {packTeam,pokemonSets,starters} from '../src/data/teams';
import {moveLearnsets} from '../src/server/move-learnsets';
import {defaultProfile,validateProfile} from '../src/server/training';
import {encounterPool,generateOpponentTeam,encounterRandom,opponentMoves} from '../src/server/opponent-team';
import {FORMAT,runBattle,replayBattle} from '../src/battle/run';
import {LEGACY_FORMAT} from '../src/data/battle-rules';
import {TowerPolicy} from '../src/battle/tower-policy';
import {DamagePolicy,type Observation} from '../src/battle/policy';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {species,describeLine} from '../src/web/catalog';

test('every default profile is self-taught, legal, untrained and has all six native base stats',()=>{
  for(const name of Object.keys(pokemonSets)) {
    const profile=defaultProfile(name);assert.deepEqual(validateProfile(name,profile),profile,name);
    assert.ok(profile.moves.length>=1 && profile.moves.length<=4,name);
    assert.ok(profile.moves.every(move=>moveLearnsets[name].selfMoves.includes(move)),name);
    assert.ok(Object.values(profile.ivs).every(value=>value===0),name);
    for(const n of [1,77,513])assert.equal(new Showdown.TeamValidator(FORMAT).validateSet({...structuredClone(pokemonSets[name]),moves:opponentMoves(name,encounterRandom([n,2,3,4]))},{}),null,name);
  }
  assert.deepEqual(defaultProfile('Ditto').moves,['Transform']);assert.deepEqual(defaultProfile('Unown').moves,['Hidden Power']);
});
test('encounters avoid the last three teams, scale across 100 floors and gate legendaries',()=>{
  assert.ok(encounterPool(1).length>100);assert.equal(encounterPool(100).length,612);
  assert.ok(!encounterPool(1).includes('Mewtwo'));assert.ok(encounterPool(20).includes('Mewtwo'));
  assert.ok(!encounterPool(20).includes('Mew'));assert.ok(encounterPool(30).includes('Mew'));
  const previous=[1,2,3].flatMap(n=>generateOpponentTeam(n,[n,2,3,4]).map(p=>p.name));
  const next=generateOpponentTeam(4,[9,2,3,4],previous);assert.ok(next.every(p=>!previous.includes(p.name)));
  assert.deepEqual(next,generateOpponentTeam(4,[9,2,3,4],previous));
});
test('reactive specialist policy uses public last move, heals when hurt and avoids repeated setup',()=>{
  const observation:Observation={turn:2,ownTeam:[{ident:'p2: Wobbuffet',details:'Wobbuffet, L50',condition:'200/250',active:true,stats:{atk:38,def:63,spa:38,spd:63,spe:38}}],opponent:{species:'Alakazam',condition:'100/100'},lastOpponentMove:'Psychic',legalActions:[{command:'move 1',label:'Counter',estimatedDamage:0},{command:'move 2',label:'Mirror Coat',estimatedDamage:0}]};
  assert.equal(new TowerPolicy().choose(observation),'move 2');observation.lastOpponentMove='Earthquake';assert.equal(new TowerPolicy().choose(observation),'move 1');
  const policy=new TowerPolicy();observation.ownTeam[0].details='Pyukumuku, L50';observation.ownTeam[0].condition='40/100';observation.legalActions=[{command:'move 1',label:'Recover',estimatedDamage:0},{command:'move 2',label:'Counter',estimatedDamage:0}];observation.lastOpponentMove='Psychic';assert.equal(policy.choose(observation),'move 1');
});
test('Shedinja keeps one HP with stat points and past-generation teams really battle and replay',async()=>{
  let hp='';const profile=defaultProfile('Shedinja');profile.evs.hp=32;profile.ivs.hp=31;
  const log=await runBattle({teams:{p1:packTeam(['Shedinja','Butterfree','Ditto'],{Shedinja:profile}),p2:packTeam(starters)},player:new TowerPolicy(),opponent:new TowerPolicy(),onPlayerLine:line=>{if(line.startsWith('|request|') && !hp){const request=JSON.parse(line.slice(9));hp=request?.side?.pokemon[0].condition ?? '';}}});
  assert.equal(hp,'1/1');await replayBattle(log);
});
test('a newly encountered species is recruitable, can be configured and carried into the next floor',async()=>{
  const store=new TowerStore(':memory:');try{
    store.ensurePlayer('expanded');const id=store.start('expanded',starters),row=store.battle(id);
    const team=packTeam(['Butterfree','Ditto','Unown']);store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(team,id);
    const log=await runBattle({teams:{p1:row.player_team,p2:team},seed:JSON.parse(row.seed),player:new TowerPolicy(),opponent:new TowerPolicy()});assert.equal(log.winner,'Player');
    store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
    store.recruit('expanded',row.run_id,id,'Ditto',null);
    const ditto=store.trainingCollection('expanded').find(entry=>entry.species==='Ditto')!;assert.ok(ditto);assert.deepEqual(ditto.profile.moves,['Transform']);assert.equal(species.Ditto.name,'메타몽');
    store.train('expanded','Ditto',ditto.revision,ditto.profile);
    const next=store.enter('expanded',row.run_id,2,['Ditto','Charizard','Blastoise']);assert.equal(Showdown.Teams.unpack(store.battle(next).player_team)![0].species,'Ditto');
  }finally{store.close();}
});
test('old OU battles keep their original format and AI when resumed with the expanded roster',async()=>{
  const store=new TowerStore(':memory:');store.ensurePlayer('legacy');const id=store.start('legacy',starters);
  store.db.prepare('UPDATE battles SET format=?,ai_version=?,opponent_team=? WHERE id=?').run(LEGACY_FORMAT,'damage-policy-v1',packTeam(['Pikachu','Golem','Cloyster']),id);
  const service=new TowerService(store);try{const state=await service.state('legacy');assert.equal(state.battle!.status,'waiting');const view=await service.action('legacy',id,state.battle!.requestId,state.battle!.actions[0].command);assert.notEqual(view.battle!.status,'error');}finally{await service.dispose();store.close();}
  const log=await runBattle({format:LEGACY_FORMAT,player:new DamagePolicy(),opponent:new DamagePolicy()});await replayBattle(log);
});
test('new ability activation labels are Korean and battle-only forms have sprite metadata',()=>{
  assert.match(describeLine('|-ability|p2a: Pelipper|Drizzle')!,/패리퍼.*잔비/);
  for(const form of ['Aegislash-Blade','Wishiwashi-School','Palafin-Hero','Mimikyu-Busted'])assert.ok(species[form]?.id,form);
});
