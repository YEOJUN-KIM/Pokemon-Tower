import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {defaultProfile,validateProfile} from '../src/server/training';
import {profileForForm} from '../src/web/form-editor-data';
import {selectableForms} from '../src/data/selectable-forms';
const rapid=['Surging Strikes','Close Combat','Iron Head','Swords Dance'];
const single=['Wicked Blow','Sucker Punch','Iron Head','Swords Dance'];
function setup(store:TowerStore,owner:string){
 store.ensurePlayer(owner);store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,'Urshifu');
 store.db.prepare('UPDATE players SET growth_points=10000 WHERE id=?').run(owner);
 for(const move of new Set([...rapid,...single]))store.db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run(owner,'Urshifu',move);
 store.train(owner,'Urshifu',0,{...defaultProfile('Urshifu','Urshifu-Rapid-Strike'),moves:[...rapid]});
}
function entry(store:TowerStore,owner:string){return store.trainingCollection(owner).find(e=>e.species==='Urshifu')!;}
function change(store:TowerStore,owner:string,species:string){const before=entry(store,owner);store.train(owner,'Urshifu',before.revision,profileForForm(before,species));}

test('Urshifu shares growth while each style restores its own saved moves and tera type',()=>{
 const store=new TowerStore(':memory:');try{
  setup(store,'forms');change(store,'forms','Urshifu');
  let saved=entry(store,'forms');store.train('forms','Urshifu',saved.revision,{...saved.profile,moves:[...single],teraType:'Dark'});
  change(store,'forms','Urshifu-Rapid-Strike');saved=entry(store,'forms');
  assert.deepEqual(saved.profile.moves,rapid);assert.equal(saved.profile.teraType,'Fighting');
  const updated={...saved.profile,nature:'Adamant',evs:{...saved.profile.evs,atk:32,spe:32}};
  store.train('forms','Urshifu',saved.revision,updated);
  const before=entry(store,'forms'),snapshot=structuredClone(before.profile),preview=profileForForm(before,'Urshifu');
  assert.deepEqual(preview.moves,single);assert.equal(preview.nature,'Adamant');assert.deepEqual(preview.evs,updated.evs);assert.equal(preview.teraType,'Dark');assert.deepEqual(before.profile,snapshot);
  change(store,'forms','Urshifu');saved=entry(store,'forms');assert.deepEqual(saved.profile.moves,single);assert.equal(saved.profile.nature,'Adamant');assert.deepEqual(saved.profile.evs,updated.evs);
  assert.throws(()=>store.train('forms','Urshifu',before.revision,preview),/변경/);
  store.db.prepare('UPDATE players SET growth_points=20000 WHERE id=?').run('forms');
  // Seed an existing shiny record; permanent conversion has been retired.
  const prior=entry(store,'forms');store.db.prepare('UPDATE pokemon_training SET profile=?,revision=revision+1 WHERE player_id=? AND species=?').run(JSON.stringify({...prior.profile,shiny:true}),'forms','Urshifu');
  const shiny=entry(store,'forms');assert.ok(shiny.profile.shiny);const other=profileForForm(shiny,'Urshifu-Rapid-Strike');assert.ok(other.shiny);assert.deepEqual(other.moves,rapid);assert.deepEqual(other.ivs,shiny.profile.ivs);assert.equal(other.gender,shiny.profile.gender);
  const rows=store.db.prepare('SELECT form_species,settings FROM pokemon_form_training WHERE player_id=? ORDER BY form_species').all('forms');assert.equal(rows.length,2);
  assert.ok(rows.every(row=>!('ivs' in JSON.parse(row.settings as string))&&!('evs' in JSON.parse(row.settings as string))&&!('nature' in JSON.parse(row.settings as string))));
 }finally{store.close();}
});

test('all selectable family forms expose independent legal settings and keep shared draft training',()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('all-forms');store.db.prepare('UPDATE players SET growth_points=100000 WHERE id=?').run('all-forms');
  for(const base of new Set(Object.values(selectableForms).filter(f=>f.collection==='family').map(f=>f.baseSpecies)))store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run('all-forms',base);
  for(const entry of store.trainingCollection('all-forms'))for(const form of entry.formOptions??[]){
   assert.ok(form.settings);const next=profileForForm({...entry,profile:{...entry.profile,nature:'Adamant',evs:{...entry.profile.evs,hp:1}}},form.species);
   assert.equal(next.moves.length,4,form.species);assert.equal(new Set(next.moves).size,4,form.species);validateProfile(entry.species,next);
   assert.equal(next.nature,'Adamant');assert.equal(next.evs.hp,1);assert.equal(next.ability,form.settings.ability);
   const current=store.trainingCollection('all-forms').find(value=>value.species===entry.species)!;store.train('all-forms',entry.species,current.revision,next);
   const saved=store.trainingCollection('all-forms').find(value=>value.species===entry.species)!;assert.deepEqual(saved.profile.moves,next.moves);
  }
 }finally{store.close();}
});

test('independent Urshifu loadouts survive restart, switching back and repeated new games',()=>{
 const path=`.data/tests/urshifu-moves-${randomUUID()}.sqlite`;let store=new TowerStore(path);try{
  setup(store,'saved');change(store,'saved','Urshifu');const before=entry(store,'saved');store.train('saved','Urshifu',before.revision,{...before.profile,moves:[...single]});
  for(const [species,moves] of [['Urshifu-Rapid-Strike',rapid],['Urshifu',single],['Urshifu-Rapid-Strike',rapid]] as const){
   store.close();store=new TowerStore(path);change(store,'saved',species);
   const row=store.battle(store.start('saved',['Urshifu','Blastoise','Venusaur']));const set=Showdown.Teams.unpack(row.player_team)![0];
   assert.equal(set.species,species);assert.deepEqual(set.moves,moves);store.abandon('saved',row.run_id);
  }
 }finally{store.close();}
});

test('v36 migration preserves selected form loadout, shared stats and active battle snapshots, once',()=>{
 const path=`.data/tests/form-training-migration-${randomUUID()}.sqlite`;let store=new TowerStore(path);try{
  setup(store,'migration');const row=store.battle(store.start('migration',['Urshifu','Blastoise','Venusaur']));
  const before=entry(store,'migration').profile,packed=store.battle(row.id),runProfiles=store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(row.run_id)!.profiles;
  store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?)').run('migration','Gligar',JSON.stringify(defaultProfile('Charizard')),1);
  store.db.exec('DROP TABLE pokemon_form_training; PRAGMA user_version=36');store.close();store=new TowerStore(path);
  assert.deepEqual(entry(store,'migration').profile,before);assert.deepEqual(store.battle(row.id),packed);assert.equal(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(row.run_id)!.profiles,runProfiles);
  assert.deepEqual(store.history(row.id),[]);assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM pokemon_form_training WHERE player_id=?').get('migration')!.n,1);
  store.close();store=new TowerStore(path);assert.deepEqual(entry(store,'migration').profile,before);assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,42);assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});
