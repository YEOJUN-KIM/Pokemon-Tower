import test from 'node:test';
import assert from 'node:assert/strict';
import {TowerStore} from '../src/server/tower-store';
import {defaultProfile} from '../src/server/training';
import Showdown from 'pokemon-showdown';
import {finishChallengerBattle} from './challenger-fixture';

test('floor preparation reuses run training, keeps the current form and rejects stale/event/battle writes',()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('settings');store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('settings','Shaymin');
  store.db.prepare('UPDATE players SET growth_points=1000 WHERE id=?').run('settings');
  const original=store.trainingCollection('settings').find(e=>e.species==='Shaymin')!;
  store.train('settings','Shaymin',original.revision,defaultProfile('Shaymin','Shaymin-Sky'));
  const battle=store.start('settings',['Shaymin','Charizard','Blastoise']),run=store.battle(battle).run_id;
  store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(battle);store.db.prepare("UPDATE runs SET state='select',floor=2 WHERE id=?").run(run);
  const adjustment=store.view('settings').run!.adjustment!,entry=adjustment.entries.find(e=>e.species==='Shaymin')!,draft=structuredClone(entry.profile);
  draft.evs.atk++;draft.nature='Modest';[draft.moves[0],draft.moves[1]]=[draft.moves[1],draft.moves[0]];
  const request={id:run,floor:2,snapshot:adjustment.snapshot};
  store.train('settings','Shaymin',entry.revision,draft,request);
  const fresh=store.view('settings').run!.adjustment!,saved=fresh.entries.find(e=>e.species==='Shaymin')!;
  assert.equal(saved.profile.forme,'Shaymin-Sky');assert.equal(saved.profile.evs.atk,1);assert.equal(saved.profile.nature,'Modest');assert.deepEqual(saved.profile.moves,draft.moves);
  assert.equal(store.trainingCollection('settings').find(e=>e.species==='Shaymin')!.profile.forme,'Shaymin-Sky');
  assert.throws(()=>store.train('settings','Shaymin',entry.revision,draft,request),/변경/);
  const next={...request,snapshot:fresh.snapshot};
  assert.throws(()=>store.train('settings','Shaymin',saved.revision,{...defaultProfile('Shaymin'),ivs:saved.profile.ivs},next),/모습/);
  store.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status) VALUES ('pending',?,1,'mystery-chest','choice')").run(run);
  assert.equal(store.view('settings').run!.adjustment,null);assert.throws(()=>store.train('settings','Shaymin',saved.revision,draft,next),/정비/);
  store.db.prepare("UPDATE run_events SET status='complete' WHERE id='pending'").run();store.enter('settings',run,2,['Shaymin','Charizard','Blastoise']);
  assert.throws(()=>store.train('settings','Shaymin',saved.revision,draft,next),/정비/);
 }finally{store.close();}
});

test('run point edits validate against run IVs and preserve distinct permanent IVs and the created battle',()=>{
 for(const [runIV,permanentIV] of [[0,31],[31,3]]){
  const store=new TowerStore(':memory:');try{
   const owner='separate';store.ensurePlayer(owner);store.db.prepare('UPDATE players SET growth_points=1000 WHERE id=?').run(owner);
   const id=store.start(owner,['Charizard','Blastoise','Venusaur'],'basic'),battle=store.battle(id),originalTeam=battle.player_team;
   const profiles=JSON.parse(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(battle.run_id)!.profiles as string);profiles.Charizard.ivs.hp=runIV;
   store.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),battle.run_id);
   const permanent=defaultProfile('Charizard');permanent.ivs.hp=permanentIV;permanent.evs.hp=5;
   store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run(owner,'Charizard',JSON.stringify(permanent));
   finishChallengerBattle(store,id);store.db.prepare("UPDATE runs SET state='select',floor=2 WHERE id=?").run(battle.run_id);
   const adjustment=store.view(owner).run!.adjustment!,entry=adjustment.entries.find(e=>e.species==='Charizard')!,request={id:battle.run_id,floor:2,snapshot:adjustment.snapshot};
   assert.equal(entry.profile.ivs.hp,runIV);
   const invalid=structuredClone(entry.profile);invalid.ivs.hp=runIV===31?30:1;
   assert.throws(()=>store.train(owner,'Charizard',entry.revision,invalid,request),/개체값/);
   const draft=structuredClone(entry.profile);draft.evs.hp=7;store.train(owner,'Charizard',entry.revision,draft,request);
   const saved=store.view(owner),runProfile=saved.run!.adjustment!.entries.find(e=>e.species==='Charizard')!.profile;
   assert.equal(saved.growthPoints,993);assert.equal(runProfile.evs.hp,7);assert.equal(runProfile.ivs.hp,runIV);
   const collection=store.trainingCollection(owner).find(e=>e.species==='Charizard')!.profile;assert.equal(collection.evs.hp,7);assert.equal(collection.ivs.hp,permanentIV);
   assert.equal(store.battle(id).player_team,originalTeam);
   const next=store.enter(owner,battle.run_id,2,['Charizard','Blastoise','Venusaur']),team=Showdown.Teams.unpack(store.battle(next).player_team)!;
   assert.equal(team[0].evs!.hp,7);assert.equal(team[0].ivs!.hp,runIV);
  }finally{store.close();}
 }
});
