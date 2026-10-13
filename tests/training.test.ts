import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {defaultProfile,trainingOptions} from '../src/server/training';
import {starters,packTeam} from '../src/data/teams';
import {statKeys,natures,trainedStat,type StatBlock} from '../src/data/training';
import {runBattle,replayBattle,FORMAT} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('6Z start, legal stat points/natures/moves/abilities, charged once and isolated from the active run',()=>{
  const store=new TowerStore(':memory:');try {
    store.ensurePlayer('training');store.db.prepare('UPDATE players SET growth_points=1000 WHERE id=?').run('training');
    const id=store.start('training',starters),row=store.battle(id);
    assert.ok(Object.values(Showdown.Teams.unpack(row.player_team)![0].ivs!).every(value=>value===0));
    const before=store.trainingCollection('training').find(entry=>entry.species==='Charizard')!;
    const edited=structuredClone(before.profile);edited.evs.spa=32;edited.evs.spe=32;edited.nature='Modest';edited.moves[3]='Earthquake';edited.ability='Solar Power';
    assert.ok(trainingOptions('Charizard').learnableMoves.includes('Earthquake'));
    assert.ok(!trainingOptions('Charizard').learnableMoves.includes('Surf'));
    assert.throws(()=>store.train('training','Charizard',0,edited),/해금/);
    store.db.prepare('INSERT INTO move_unlocks VALUES (?,?,?)').run('training','Charizard','Earthquake');
    store.train('training','Charizard',0,edited);
    assert.equal(store.view('training').growthPoints,836);
    assert.throws(()=>store.train('training','Charizard',0,edited),/이미 변경/);
    const invalid=structuredClone(edited);invalid.evs.hp=3;
    assert.throws(()=>store.train('training','Charizard',1,invalid),/66/);
    invalid.evs.hp=0;invalid.ivs.atk=31;
    assert.throws(()=>store.train('training','Charizard',1,invalid),/영입/);
    const wrongNature=structuredClone(edited);wrongNature.nature='Fake';
    assert.throws(()=>store.train('training','Charizard',1,wrongNature),/성격/);
    assert.equal(store.view('training').growthPoints,836);
    const current=Showdown.Teams.unpack(store.battle(id).player_team)![0];assert.equal(current.ability,'Blaze');assert.equal(current.evs?.spa ?? 0,0);assert.equal(current.nature,'Serious');
    const run=row.run_id;store.db.prepare("UPDATE runs SET floor=2,state='select' WHERE id=?").run(run);
    const second=store.enter('training',run,2,starters);assert.equal(Showdown.Teams.unpack(store.battle(second).player_team)![0].ability,'Blaze');
    store.abandon('training',run);const fresh=store.start('training',starters);
    const trained=Showdown.Teams.unpack(store.battle(fresh).player_team)![0];assert.equal(trained.ability,'Solar Power');assert.equal(trained.nature,'Modest');assert.equal(trained.evs!.spa,32);assert.ok(trained.moves.includes('Earthquake'));
  } finally{store.close();}
});

test('all 25 natures match official level-50 6V stats, while 6Z and all 66 points work in real battles and replay',async()=>{
  const species=Showdown.Dex.species.get('Charizard'),official=new Showdown.Battle({formatid:FORMAT});
  for(const nature of natures)for(const key of statKeys)for(const point of [0,1,31,32]) {
    const set=Showdown.Teams.unpack(packTeam(starters))![0];set.nature=nature.id;set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};
    set.evs![key]=point===0 ? 0 : point*8-4;
    assert.equal(trainedStat(species.baseStats[key],31,point,key,nature.id),official.statModify(species.baseStats,set,key),`${nature.id} ${key} ${point}`);
  }
  official.destroy();
  const profile=defaultProfile('Charizard');profile.evs={hp:2,atk:0,def:0,spa:32,spd:0,spe:32};profile.nature='Modest';
  const teams={p1:packTeam(starters,{Charizard:profile}),p2:packTeam(['Pikachu','Gyarados','Snorlax'])};
  const log=await runBattle({teams,player:new DamagePolicy(),opponent:new DamagePolicy()});
  const charizard=log.decisions.find(entry=>entry.side==='p1' && entry.observation.turn===1)!.observation.ownTeam[0];
  assert.equal(charizard.stats.spa,160);assert.equal(charizard.stats.atk,80);assert.equal(charizard.stats.spe,137);
  assert.equal(charizard.condition,'140/140');
  await replayBattle(log);
  profile.evs.hp=3;
  await assert.rejects(runBattle({teams:{...teams,p1:packTeam(starters,{Charizard:profile})},player:new DamagePolicy(),opponent:new DamagePolicy()}),/Invalid stat points/);
});

test('legacy collection EVs migrate once to points and neutral nature without changing an existing run or wallet',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try {
    store.ensurePlayer('legacy');store.db.prepare('UPDATE players SET growth_points=777 WHERE id=?').run('legacy');
    const profile=defaultProfile('Charizard');delete profile.statSystem;delete (profile as Partial<typeof profile>).nature;
    profile.evs={hp:4,atk:0,def:0,spa:252,spd:0,spe:252};profile.ivs.hp=31;
    store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run('legacy','Charizard',JSON.stringify(profile));
    const id=store.start('legacy',starters),team=store.battle(id).player_team;
    store.db.exec('PRAGMA user_version=6');store.close();store=new TowerStore(path);
    const migrated=store.trainingCollection('legacy').find(entry=>entry.species==='Charizard')!;
    assert.deepEqual(migrated.profile.evs,{hp:1,atk:0,def:0,spa:32,spd:0,spe:32});assert.equal(migrated.profile.nature,'Serious');
    assert.equal(migrated.profile.ivs.hp,31);assert.equal(migrated.revision,2);assert.equal(store.view('legacy').growthPoints,777);
    assert.equal(store.battle(id).player_team,team);
    store.close();store=new TowerStore(path);assert.equal(store.trainingCollection('legacy').find(entry=>entry.species==='Charizard')!.revision,2);
  }finally {store.close();}
});

test('recruitment merges each actual opponent IV, never lowers saved IVs and updates an owned member without duplicate slots',async()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try {
    store.ensurePlayer('capture');
    const old=defaultProfile('Raichu');old.ivs={hp:31,atk:12,def:2,spa:20,spd:0,spe:25};
    store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('capture','Raichu');
    store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run('capture','Raichu',JSON.stringify(old));
    const id=store.start('capture',['Raichu','Blastoise','Venusaur']),row=store.battle(id);
    const opponent=defaultProfile('Raichu');opponent.ivs={hp:3,atk:20,def:31,spa:2,spd:11,spe:28};
    // Known, real opponent IV fixture; legal player team remains the persisted snapshot.
    const opponentTeam=packTeam(['Raichu','Golem','Cloyster'],{Raichu:opponent});
    store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(opponentTeam,id);
    let won=false;
    for(let seed=1;seed<=50;seed++) {
      const log=await runBattle({teams:{p1:row.player_team,p2:opponentTeam},seed:[seed,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
      if(log.winner!=='Player')continue;
      store.db.prepare('UPDATE battles SET seed=? WHERE id=?').run(JSON.stringify(log.seed),id);
      store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});won=true;break;
    }
    assert.ok(won);assert.deepEqual(store.view('capture').run!.candidateIVs.Raichu,opponent.ivs);
    store.recruit('capture',row.run_id,id,'Raichu',null);
    const expected:StatBlock={hp:31,atk:20,def:31,spa:20,spd:11,spe:28};
    assert.deepEqual(store.trainingCollection('capture').find(entry=>entry.species==='Raichu')!.profile.ivs,expected);
    assert.equal(store.roster(row.run_id).length,3);
    assert.equal(store.view('capture').run!.lastIVGain!.changes.length,4);
    assert.throws(()=>store.recruit('capture',row.run_id,id,'Raichu',null),/이미 처리/);
    store.close();store=new TowerStore(path);
    assert.deepEqual(store.trainingCollection('capture').find(entry=>entry.species==='Raichu')!.profile.ivs,expected);
    const next=store.enter('capture',row.run_id,2,['Raichu','Blastoise','Venusaur']);
    assert.deepEqual(Showdown.Teams.unpack(store.battle(next).player_team)![0].ivs,expected);
    assert.ok(statKeys.every(key=>expected[key]>=old.ivs[key]));
  } finally{store.close();}
});
