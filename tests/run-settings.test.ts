import test from 'node:test';
import assert from 'node:assert/strict';
import {TowerStore} from '../src/server/tower-store';
import {defaultProfile} from '../src/server/training';

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
