import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {raidFixture,finishRaidBattle} from './raid-fixture';
import {TowerStore} from '../src/server/tower-store';
import {RaidEvents} from '../src/server/raid-events';
import {raidBossDefinitions,type RaidPhaseNumber} from '../src/data/raids';
import {resolveRaidRecruitSpecies,raidRecruitmentTeam,packedRaidRecruitment,raidPhaseByNumber} from '../src/server/raid-recruitment';
import {collectionSpecies} from '../src/data/selectable-forms';
import {defaultProfile,validateProfile} from '../src/server/training';
import {packPlayerTeam} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import type {BattleView} from '../src/shared/contracts';
import {saveTrainingForm} from '../src/server/storage/form-training';

const branches=[['volcarona','slither-wing','Slither Wing'],['volcarona','iron-moth','Iron Moth'],['kyurem','black','Kyurem-Black'],['kyurem','white','Kyurem-White']] as const;
function qaTeam(){
 const profiles=Object.fromEntries(['Mewtwo','Kyogre','Cloyster'].map(name=>{
  const p=defaultProfile(name);p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.evs={hp:32,atk:0,def:0,spa:32,spd:0,spe:2};p.runBonuses={hp:100,atk:100,def:100,spa:100,spd:100,spe:100};
  return [name,p];
 }));
 return packPlayerTeam(['Mewtwo','Kyogre','Cloyster'],profiles);
}

for(const [bossId,routeId,target] of branches)test(`${bossId}/${routeId}: saved P2 = played P2 = recruitment, survives retry, disk restart and normal next battle`,async()=>{
 const path=`.data/tests/raid-recruit-${randomUUID()}.sqlite`,f=raidFixture(path,routeId,bossId,routeId),base=collectionSpecies(target),forme=target===base?undefined:target;
 let store=f.store;
 try{
  const raw=store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json;
  assert.equal(f.snapshot.phases[1].species,target);assert.equal(resolveRaidRecruitSpecies(f.snapshot),target);
  assert.deepEqual(f.snapshot.recruitment,{mode:'phaseSpecies',phase:2});
  const recruit=Showdown.Teams.unpack(f.snapshot.recruitTeam)![0],normal=defaultProfile(base,forme);
  assert.equal(recruit.species,target);assert.equal(recruit.ability,normal.ability);assert.deepEqual(recruit.moves,normal.moves);assert.equal(recruit.item,'');assert.equal(recruit.gender,'N');
  assert.ok(!recruit.evs||Object.values(recruit.evs).every(n=>n===0));assert.deepEqual(recruit.ivs??f.snapshot.individual.ivs,f.snapshot.individual.ivs);
  store.chooseEvent(f.owner,f.run,f.event.id,'challenge');const first=store.currentBattle(f.owner)!.id;
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(f.run);
  finishRaidBattle(store,first,'Tower AI');store.retry(f.owner,f.run,first);
  const id=store.enter(f.owner,f.run,2,store.view(f.owner).run!.suggestedTeam);
  store.db.prepare('UPDATE battles SET player_team=? WHERE id=?').run(qaTeam(),id);
  store.close();store=new TowerStore(path);
  const events=new RaidEvents(store.db),saved=events.snapshot(events.forBattle(id)!);
  assert.equal(store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json,raw);
  const row=store.battle(id);
  const log=await runBattle({raid:saved,teams:{p1:row.player_team,p2:row.opponent_team},format:row.format,seed:JSON.parse(row.seed),rule:row.rule,upgrades:JSON.parse(row.upgrades),trainerEquipment:JSON.parse(row.trainer_equipment!),teraTickets:JSON.parse(row.tera_tickets),player:new DamagePolicy(),opponent:new DamagePolicy()});
  assert.equal(log.winner,'Player');assert.ok(log.publicProtocol.some(l=>l.startsWith('|switch|p2')&&l.includes('|'+target+',')&&l.includes('[raid]')));
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
  const view:BattleView={id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:[],winner:log.winner,error:null};
  store.complete(id,log,view);store.complete(id,log,view);
  let state=store.view(f.owner);assert.deepEqual(state.run!.candidates,[base]);assert.equal(state.run!.candidateDetails?.[base].forme,forme);
  assert.equal(state.run!.candidateDetails?.[base].ability,normal.ability);assert.deepEqual(state.run!.candidateMoves[base],normal.moves);
  if(base!==f.snapshot.species)assert.ok(!state.run!.candidates.includes(f.snapshot.species));
  store.close();store=new TowerStore(path);assert.equal(store.view(f.owner).run!.candidateDetails?.[base].forme,forme);
  store.recruit(f.owner,f.run,id,base,null);
  assert.throws(()=>store.recruit(f.owner,f.run,id,base,null));
  state=store.view(f.owner);assert.ok(state.run!.roster.includes(base));assert.equal(state.run!.partnerForms?.[base],forme);
  const entry=store.trainingCollection(f.owner).find(p=>p.species===base)!;
  assert.equal(entry.profile.forme,forme);assert.equal(entry.profile.ability,normal.ability);assert.deepEqual(entry.profile.moves,normal.moves);
  assert.ok(!state.unlocked.includes(target)||target===base);validateProfile(base,entry.profile);
  if(forme)assert.ok(store.db.prepare('SELECT 1 FROM pokemon_form_training WHERE player_id=? AND form_species=?').get(f.owner,forme));
  store.continueEvent(f.owner,f.run,f.event.id);
  const next=store.enter(f.owner,f.run,2,[base,'Blastoise','Venusaur']),set=Showdown.Teams.unpack(store.battle(next).player_team)![0];
  assert.equal(set.species,target);assert.equal(set.ability,normal.ability);
  store.close();store=new TowerStore(path);assert.equal(store.trainingCollection(f.owner).find(p=>p.species===base)!.profile.forme,forme);
  store.abandon(f.owner,f.run);const fresh=store.start(f.owner,[base,'Blastoise','Venusaur'],'basic');
  assert.equal(Showdown.Teams.unpack(store.battle(fresh).player_team)![0].species,target);
 }finally{store.close();}
});

test('only the two declared bosses opt into phase rewards; every other route still awards its base species',()=>{
 assert.deepEqual(raidBossDefinitions.filter(b=>b.recruitment?.mode==='phaseSpecies').map(b=>b.id).sort(),['kyurem','volcarona']);
 for(const boss of raidBossDefinitions.filter(b=>b.recruitment?.mode!=='phaseSpecies'))for(const route of boss.routes){
  const f=raidFixture(':memory:',boss.id,boss.id,route.id);
  try{
   assert.equal(resolveRaidRecruitSpecies(f.snapshot),boss.species);const original=f.snapshot.recruitTeam;
   assert.equal(packedRaidRecruitment(f.snapshot),original);
   f.store.chooseEvent(f.owner,f.run,f.event.id,'challenge');finishRaidBattle(f.store,f.store.currentBattle(f.owner)!.id);
   assert.deepEqual(f.store.view(f.owner).run!.candidates,[boss.species]);
   assert.equal(f.store.view(f.owner).run!.candidateDetails?.[boss.species].forme,undefined);
  }finally{f.store.close();}
 }
});

for(const [bossId,routeId,target] of branches)test(`legacy ${bossId}/${routeId} reads the saved branch without changing battle/replay snapshot`,()=>{
 const f=raidFixture(':memory:','legacy',bossId,routeId);
 try{
  const old=structuredClone(f.snapshot);delete old.recruitment;
  const baseline=Showdown.Teams.unpack(old.opponentTeam)![0];baseline.evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};baseline.moves=[...old.individual.moves];baseline.ability=old.individual.ability;
  old.recruitTeam=Showdown.Teams.pack([baseline]);const before=JSON.stringify(old);
  assert.equal(resolveRaidRecruitSpecies(old),target);const team=raidRecruitmentTeam(old);
  assert.equal(team[0].raidForme??team[0].species,target);assert.equal(JSON.stringify(old),before);
 }finally{f.store.close();}
});

test('human Phase numbers are validated; malformed rewards throw in development and log a safe production fallback',()=>{
 const f=raidFixture(':memory:','invalid','volcarona','slither-wing');
 try{
  assert.equal(raidPhaseByNumber(f.snapshot,2).species,'Slither Wing');
  for(const number of [0,-1,1.5,3,5])assert.throws(()=>raidPhaseByNumber(f.snapshot,number as RaidPhaseNumber),/Phase/);
  const broken=structuredClone(f.snapshot);broken.phases.splice(1);
  assert.throws(()=>resolveRaidRecruitSpecies(broken,{production:false}),/Phase 2 is missing/);
  const warnings:string[]=[];
  assert.equal(resolveRaidRecruitSpecies(broken,{production:true,warn:m=>warnings.push(m)}),'Volcarona');assert.equal(warnings.length,1);assert.match(warnings[0],/volcarona.*Phase 2.*Volcarona/);
  const fallback=raidRecruitmentTeam(broken,{production:true,warn:()=>{}})[0];assert.equal(fallback.species,'Volcarona');assert.equal(fallback.ability,'Flame Body');
  const invalid=structuredClone(f.snapshot);invalid.phases[1].species='Missing Species';assert.throws(()=>resolveRaidRecruitSpecies(invalid,{production:false}),/Unsupported/);
  invalid.phases[1].species='Metagross-Mega';assert.throws(()=>resolveRaidRecruitSpecies(invalid,{production:false}),/Unsupported/);
 }finally{f.store.close();}
});

for(const collectOnly of [false,true])test(`existing Kyurem form settings are updated to saved reward; collectOnly=${collectOnly}`,()=>{
 const f=raidFixture(':memory:','owned-kyurem','kyurem','black');
 try{
  const old={...defaultProfile('Kyurem','Kyurem-White'),shiny:true,evs:{hp:0,atk:0,def:0,spa:32,spd:0,spe:32}};
  old.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};
  f.store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(f.owner,'Kyurem');
  f.store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?)').run(f.owner,'Kyurem',JSON.stringify(old),1);
  saveTrainingForm(f.store.db,f.owner,'Kyurem',old);
  saveTrainingForm(f.store.db,f.owner,'Kyurem',{...defaultProfile('Kyurem','Kyurem-Black'),moves:['Ice Beam','Dragon Pulse','Earth Power','Protect']});
  f.store.chooseEvent(f.owner,f.run,f.event.id,'challenge');const id=f.store.currentBattle(f.owner)!.id;finishRaidBattle(f.store,id);
  const profiles=f.store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(f.run)!.profiles;
  f.store.recruit(f.owner,f.run,id,'Kyurem',null,undefined,collectOnly);
  const saved=f.store.trainingCollection(f.owner).find(p=>p.species==='Kyurem')!.profile,expected=defaultProfile('Kyurem','Kyurem-Black');
  assert.equal(saved.forme,'Kyurem-Black');assert.deepEqual(saved.moves,expected.moves);assert.equal(saved.ability,expected.ability);
  assert.deepEqual(saved.evs,old.evs);assert.deepEqual(saved.ivs,old.ivs);assert.equal(saved.shiny,true);
  if(collectOnly){assert.ok(!f.store.view(f.owner).run!.roster.includes('Kyurem'));assert.equal(f.store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(f.run)!.profiles,profiles);}
  else assert.equal(f.store.view(f.owner).run!.partnerForms?.Kyurem,'Kyurem-Black');
 }finally{f.store.close();}
});
