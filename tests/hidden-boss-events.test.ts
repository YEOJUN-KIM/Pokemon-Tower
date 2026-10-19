import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {starters} from '../src/data/teams';
import {towerThemes,type TowerTheme} from '../src/data/tower-themes';
import {HiddenBossEvents,hiddenBossEligible} from '../src/server/hidden-boss-events';
import {finishChallengerBattle} from './challenger-fixture';

import {hiddenBossFixture} from './hidden-boss-fixture';

test('hidden-boss event requires a supported chapter theme and its actual final champion',()=>{
 for(const theme of Object.keys(towerThemes) as TowerTheme[])for(const floor of [49,50,51,99,100]){
  assert.equal(hiddenBossEligible(theme,floor,towerThemes[theme].champion),['johto','kanto','unova','paldea'].includes(theme)&&floor%50===0);
  assert.equal(hiddenBossEligible(theme,floor,'named-red'),false);
 }
});

for(const theme of ['johto','kanto','paldea'] as const)for(const floor of [50,100])test(`${theme} ${floor}: champion → guaranteed event → healed same team → hidden battle → chapter completion, once`,async()=>{
 const f=hiddenBossFixture(theme,floor),s=f.store,service=new TowerService(s);try{
  const roster=s.view(f.owner).run!.roster,before=s.view(f.owner).coins;
  const receipt=finishChallengerBattle(s,f.champion);s.complete(f.champion,receipt.log,receipt.view);
  const view=s.view(f.owner),event=view.run!.event!;assert.equal(event.kind,'hidden-boss');assert.equal(view.run!.state,'select');assert.equal(view.run!.floor,floor);
  assert.equal(view.coins-before,s.battle(f.champion).reward);assert.deepEqual(view.run!.roster,roster);assert.deepEqual(view.run!.candidates,[]);
  assert.throws(()=>s.enter(f.owner,f.run,floor,starters));assert.throws(()=>s.recruit(f.owner,f.run,f.champion,null,null));
  assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM hidden_boss_events').get()!.n,1);
  s.chooseEvent(f.owner,f.run,event.id,'challenge');const battle=s.currentBattle(f.owner)!;s.chooseEvent(f.owner,f.run,event.id,'challenge');assert.equal(s.currentBattle(f.owner)!.id,battle.id);
  assert.equal(battle.stage,1);assert.equal(battle.floor,floor);assert.equal(JSON.parse(battle.trainer!).id,towerThemes[theme].final);
  const state=await service.state(f.owner);assert.equal(state.battle!.status,'waiting');assert.ok(state.battle!.team.every(p=>!p.condition.includes(' ')&&p.condition.split('/')[0]===p.condition.split('/')[1]));assert.ok(state.battle!.movePP!.every(p=>p.pp===p.maxpp));
  await service.dispose();finishChallengerBattle(s,battle.id);assert.equal(s.view(f.owner).run!.event!.phase,'reward');
  s.continueEvent(f.owner,f.run,event.id);assert.equal(s.view(f.owner).run!.floor,floor===50?51:100);assert.equal(s.view(f.owner).run!.state,floor===50?'select':'cleared');
  assert.equal(s.db.prepare('SELECT cleared_count FROM run_encounter_progress WHERE run_id=?').get(f.run)!.cleared_count,1);
  assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{await service.dispose();s.close();}
});

test('hidden event snapshot survives restart and loss/retry without changing opponent or rewards',()=>{
 const path=`.data/tests/hidden-${randomUUID()}.sqlite`,f=hiddenBossFixture('johto',50,path);let s=f.store;try{
  finishChallengerBattle(s,f.champion);const event=s.view(f.owner).run!.event!,snapshot=new HiddenBossEvents(s.db).row(event.id)!.snapshot_json;
  s.close();s=new TowerStore(path);assert.equal(new HiddenBossEvents(s.db).row(event.id)!.snapshot_json,snapshot);
  s.chooseEvent(f.owner,f.run,event.id,'challenge');const b=s.currentBattle(f.owner)!,before=s.view(f.owner).coins;
  finishChallengerBattle(s,b.id,'Tower AI');assert.equal(s.db.prepare('SELECT coins FROM players WHERE id=?').get(f.owner)!.coins,before);
  s.retry(f.owner,f.run,b.id);const next=s.enter(f.owner,f.run,50,starters);assert.equal(s.battle(next).opponent_team,b.opponent_team);assert.equal(new HiddenBossEvents(s.db).row(event.id)!.snapshot_json,snapshot);
 }finally{s.close();}
});

test('v44 migration creates event storage without changing active battles',()=>{
 const path=`.data/tests/hidden-migration-${randomUUID()}.sqlite`;let s=new TowerStore(path);try{
  s.ensurePlayer('old');const id=s.start('old',starters),before=s.battle(id);s.db.exec('DROP TABLE hidden_boss_events; PRAGMA user_version=44');s.close();s=new TowerStore(path);
  assert.equal(s.db.prepare('PRAGMA user_version').get()!.user_version,46);assert.deepEqual(s.battle(id),before);assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM hidden_boss_events').get()!.n,0);
 }finally{s.close();}
});
