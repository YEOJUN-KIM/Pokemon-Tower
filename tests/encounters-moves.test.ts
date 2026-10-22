import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {randomUUID} from 'node:crypto';
import {generateOpponentTeam,opponentMoves,encounterRandom} from '../src/server/opponent-team';
import {pokemonSets,starters,packTeam} from '../src/data/teams';
import {floors} from '../src/data/floors';
import {TowerStore} from '../src/server/tower-store';
import {defaultProfile} from '../src/server/training';
import {runBattle,FORMAT,type Seed} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {classicCollection} from './classic-team-fixture';
import {starterBonusMoves} from '../src/data/starter-moves';

test('random encounters vary their leader and team, keep useful legal moves, and reproduce boss teams',()=>{
  const leads=new Set<string>(),teams=new Set<string>();
  for(let n=1;n<=60;n++) {
    const seed:Seed=[n,2,3,4],team=generateOpponentTeam(1,seed);
    leads.add(team[0].name);teams.add(team.map(entry=>entry.name).join(','));
    assert.equal(new Set(team.map(entry=>entry.name)).size,3);
    assert.deepEqual(generateOpponentTeam(1,seed),team);
    const profiles=Object.fromEntries(team.map(entry=>[entry.name,{...defaultProfile(entry.name),moves:entry.moves,evs:{hp:1,atk:0,def:0,spa:0,spd:0,spe:0}}]));
    const legal=Showdown.Teams.unpack(packTeam(team.map(entry=>entry.name),profiles))!;
    // Check learnability separately from this game's custom zero-IV training rules.
    for(const set of legal)set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};
    assert.equal(new Showdown.TeamValidator(FORMAT).validateTeam(legal),null);
    for(const entry of team){assert.equal(entry.moves.length,4);assert.equal(new Set(entry.moves).size,4);assert.ok(!entry.moves.includes('Tackle'));assert.ok(!entry.moves.includes('Swift'));}
  }
  assert.ok(leads.size>=6);assert.ok(teams.size>=30);
  for(const floor of [5,10])assert.deepEqual(generateOpponentTeam(floor,[99,2,3,4]),generateOpponentTeam(floor,[99,2,3,4]));
  for(const name of Object.keys(pokemonSets) as (keyof typeof pokemonSets)[]) {
    const a=opponentMoves(name,encounterRandom([1,2,3,4])),b=opponentMoves(name,encounterRandom([88,2,3,4]));
    assert.deepEqual(a.slice(0,2),b.slice(0,2));assert.equal(a.length,['Ditto','Unown'].includes(name) ? 1 : 4);
  }
  assert.equal(generateOpponentTeam(100,[1,2,3,4]).length,3);
});

test('new accounts equip starter recommendations and retain self moves; other locked moves cannot be injected',()=>{
  const store=new TowerStore(':memory:');try{
    store.ensurePlayer('new');store.db.prepare('UPDATE players SET growth_points=999 WHERE id=?').run('new');
    const entry=store.trainingCollection('new').find(entry=>entry.species==='Charizard')!;
    assert.deepEqual(entry.profile.moves,starterBonusMoves.Charizard);
    assert.ok(entry.selfMoves.every(move=>entry.unlockedMoves.includes(move)));assert.ok(!entry.unlockedMoves.includes('Earthquake'));
    const draft={...entry.profile,moves:[...entry.profile.moves]};draft.moves[3]='Earthquake';
    assert.throws(()=>store.train('new','Charizard',0,draft),/해금/);assert.equal(store.view('new').growthPoints,999);
    draft.moves[3]='Surf';assert.ok(!entry.learnableMoves.includes('Surf'));assert.throws(()=>store.train('new','Charizard',0,draft));
    draft.moves=[...entry.profile.moves];draft.moves[3]='Fire Spin';
    store.train('new','Charizard',0,draft);assert.equal(store.view('new').growthPoints,999);
  }finally{store.close();}
});

test('capture registers missing moves permanently, optionally swaps the run only, and rolls back invalid requests',async()=>{
  for(const equip of [false,true]) {
    const store=new TowerStore(':memory:');try{
      store.ensurePlayer('collector');classicCollection(store,'collector');
      const saved=store.trainingCollection('collector').find(entry=>entry.species==='Charizard')!;
      store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run('collector','Golem');
      const golem=store.trainingCollection('collector').find(entry=>entry.species==='Golem')!;
      const golemMoves=[...golem.profile.moves].reverse();
      store.train('collector','Golem',golem.revision,{...golem.profile,moves:golemMoves});
      const id=store.start('collector',starters),row=store.battle(id);
      const rival=defaultProfile('Charizard');rival.moves=['Flamethrower','Air Slash','Earthquake','Dragon Pulse'];
      const team=packTeam(['Charizard','Pikachu','Golem'],{Charizard:rival,Pikachu:defaultProfile('Pikachu'),Golem:defaultProfile('Golem')});
      store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(team,'[1,2,3,4]',id);
      const log=await runBattle({trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams:{p1:row.player_team,p2:team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});assert.equal(log.winner,'Player');
      store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
      const before=store.view('collector');assert.ok(before.run!.candidateMoves.Charizard.includes('Earthquake'));
      assert.deepEqual(before.run!.currentMoves.Golem,golemMoves,'a new teammate previews its saved archive loadout');
      for(const swap of [{move:'Surf',slot:0},{move:'Earthquake',slot:4},{move:'Flamethrower',slot:3}])assert.throws(()=>store.recruit('collector',row.run_id,id,'Charizard',null,swap));
      assert.deepEqual(store.view('collector'),before);assert.equal(store.trainingCollection('collector').find(entry=>entry.species==='Charizard')!.revision,saved.revision);
      store.recruit('collector',row.run_id,id,'Charizard',null,equip ? {move:'Earthquake',slot:3} : undefined);
      const collected=store.trainingCollection('collector').find(entry=>entry.species==='Charizard')!;
      assert.ok(collected.unlockedMoves.includes('Earthquake'));assert.deepEqual(collected.profile.moves,saved.profile.moves);
      assert.deepEqual(store.view('collector').run!.lastMoveGain?.moves,['Earthquake']);
      const next=store.enter('collector',row.run_id,2,starters),active=Showdown.Teams.unpack(store.battle(next).player_team)![0];
      assert.equal(active.moves[3],equip ? 'Earthquake' : saved.profile.moves[3]);
      assert.throws(()=>store.recruit('collector',row.run_id,id,'Charizard',null),/이미 처리/);
      assert.equal(store.view('collector').growthPoints,0);
    }finally{store.close();}
  }
});

test('archive-only collection preserves a full party while owning the chosen species, IVs and moves',async()=>{
  const store=new TowerStore(':memory:');try{
    const owner='archive';store.ensurePlayer(owner);classicCollection(store,owner);
    const id=store.start(owner,starters),row=store.battle(id);
    for(const [index,name] of ['Arcanine','Gyarados','Snorlax'].entries())store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(row.run_id,index+3,name);
    const rival=defaultProfile('Golem');rival.moves=['Earthquake','Stone Edge','Fire Punch','Explosion'];
    const team=packTeam(['Charizard','Pikachu','Golem'],{Charizard:defaultProfile('Charizard'),Pikachu:defaultProfile('Pikachu'),Golem:rival});
    store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(team,'[1,2,3,4]',id);
    const log=await runBattle({trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams:{p1:row.player_team,p2:team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});assert.equal(log.winner,'Player');
    store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
    const before=store.view(owner),profiles=store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(row.run_id);
    const training=store.db.prepare('SELECT * FROM pokemon_training WHERE player_id=? AND species!=?').all(owner,'Golem');
    assert.throws(()=>store.recruit(owner,row.run_id,id,'Golem',null,{move:'Fire Punch',slot:0},true));
    assert.throws(()=>store.recruit(owner,row.run_id,id,'Snorlax',null,undefined,true));
    assert.deepEqual(store.view(owner),before);
    store.recruit(owner,row.run_id,id,'Golem',null,undefined,true);
    const after=store.view(owner);assert.deepEqual(after.run!.roster,before.run!.roster);assert.deepEqual(after.unlocked,[...before.unlocked,'Golem']);
    assert.equal(after.run!.lastIVGain!.species,'Golem');assert.ok(after.run!.lastMoveGain!.moves.includes('Fire Punch'));
    assert.deepEqual(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(row.run_id),profiles);
    assert.deepEqual(store.db.prepare('SELECT * FROM pokemon_training WHERE player_id=? AND species!=?').all(owner,'Golem'),training);
    assert.throws(()=>store.recruit(owner,row.run_id,id,'Golem',null,undefined,true),/이미 처리/);
    assert.ok(store.trainingCollection(owner).find(entry=>entry.species==='Golem')!.unlockedMoves.includes('Fire Punch'));
  }finally{store.close();}
});

test('v7 migration retains existing default moves, balances, active battles and is idempotent',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('legacy');store.db.prepare('UPDATE players SET growth_points=456 WHERE id=?').run('legacy');
    const id=store.start('legacy',starters),battle=store.battle(id);store.db.exec('PRAGMA user_version=7');store.close();store=new TowerStore(path);
    assert.deepEqual(store.battle(id),battle);assert.equal(store.view('legacy').growthPoints,456);
    const profile=store.trainingCollection('legacy').find(entry=>entry.species==='Charizard')!;
    assert.deepEqual(profile.profile.moves,[...pokemonSets.Charizard.moves]);assert.ok(profile.unlockedMoves.includes('Dragon Pulse'));
    store.close();store=new TowerStore(path);assert.deepEqual(store.trainingCollection('legacy').find(entry=>entry.species==='Charizard'),profile);
  }finally{store.close();}
});

test('persisted random encounters never reroll on reopening a save',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{store.ensurePlayer('saved');const id=store.start('saved',starters),before=store.battle(id);store.close();store=new TowerStore(path);assert.deepEqual(store.battle(id),before);}finally{store.close();}
});
