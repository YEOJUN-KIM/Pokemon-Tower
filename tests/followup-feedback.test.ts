import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {finishChallengerBattle} from './challenger-fixture';
import {starters} from '../src/data/teams';
import {towerThemes} from '../src/data/tower-themes';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {moveInfo} from '../src/data/move-info';
import {zCrystals} from '../src/data/z-crystals';

test('floor growth is immediately spendable and abandon never pays it twice',()=>{
 const s=new TowerStore(':memory:');try{
  s.ensurePlayer('p');const id=s.start('p',starters,'basic'),run=s.battle(id).run_id;
  finishChallengerBattle(s,id);assert.equal(s.view('p').growthPoints,20);
  finishChallengerBattle(s,id);assert.equal(s.view('p').growthPoints,20);
  s.recruit('p',run,id,null,null);
  const entry=s.trainingCollection('p').find(p=>p.species==='Charizard')!,profile=structuredClone(entry.profile);profile.evs.spa=1;
  s.train('p','Charizard',entry.revision,profile,{id:run,floor:s.view('p').run!.floor,snapshot:s.view('p').run!.adjustment!.snapshot});
  assert.ok(s.view('p').growthPoints<20);
  const before=s.view('p').growthPoints;s.abandon('p',run);assert.equal(s.view('p').growthPoints,before);
 }finally{s.close();}
});
test('boss growth pays 70 now; completion pays only its 100 point bonus',()=>{
 const s=new TowerStore(':memory:');try{
  s.ensurePlayer('p');const id=s.start('p',starters,'basic'),run=s.battle(id).run_id;
  s.db.prepare("UPDATE runs SET total_floors=1 WHERE id=?").run(run);
  s.db.prepare('UPDATE battles SET boss=? WHERE id=?').run(JSON.stringify({id:'fixture',name:'fixture',role:'champion'}),id);
  finishChallengerBattle(s,id);assert.equal(s.view('p').growthPoints,70);
  s.recruit('p',run,id,null,null);assert.equal(s.view('p').growthPoints,170);
  assert.equal(s.db.prepare('SELECT amount FROM growth_rewards WHERE run_id=?').get(run)!.amount,170);
 }finally{s.close();}
});
test('old active runs catch up once, settled saves and spending survive repeated reopen',()=>{
 const path=`.data/tests/growth-progress-${randomUUID()}.sqlite`;let s=new TowerStore(path);
 try{
  s.ensurePlayer('p');const id=s.start('p',starters,'basic'),run=s.battle(id).run_id;finishChallengerBattle(s,id);
  // An old active save has reward receipts but no incremental growth receipt.
  s.db.prepare('DELETE FROM run_growth_progress WHERE run_id=?').run(run);s.db.prepare("UPDATE players SET growth_points=0 WHERE id='p'").run();
  s.close();s=new TowerStore(path);assert.equal(s.view('p').growthPoints,20);
  s.db.prepare("UPDATE players SET growth_points=3 WHERE id='p'").run();s.close();s=new TowerStore(path);assert.equal(s.view('p').growthPoints,3);
  s.abandon('p',run);s.db.prepare('DELETE FROM run_growth_progress WHERE run_id=?').run(run);s.close();s=new TowerStore(path);assert.equal(s.view('p').growthPoints,3);
 }finally{s.close();}
});
test('growth payment failure rolls back the whole victory including all receipts',()=>{
 const s=new TowerStore(':memory:');try{
  s.ensurePlayer('p');const id=s.start('p',starters,'basic');
  s.db.exec("CREATE TRIGGER fail_growth BEFORE UPDATE OF growth_points ON players BEGIN SELECT RAISE(ABORT,'growth failure'); END");
  assert.throws(()=>finishChallengerBattle(s,id),/growth failure/);
  assert.equal(s.battle(id).status,'active');assert.equal(s.view('p').coins,0);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM run_growth_progress').get()!.n,0);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM rewards').get()!.n,0);
 }finally{s.close();}
});
test('all themed 50-floor champions and hidden bosses use final builds with reduced training',()=>{
 const ids=[...new Set(Object.values(towerThemes).flatMap(t=>[t.champion,t.final]))];
 for(const id of ids){
  const sample=namedTrainerSamples.find(s=>s.id===id)!;
  const template=normalNpcTemplate(id,50,sample.role)!;assert.ok(template.gate50,id);
  const team=generateOpponentTeam(50,[1,2,3,4],[],null,sample,CURRENT_PROGRESSION);
  assert.ok(team.some(p=>p.name===template.ace),id);
  for(const p of team){assert.ok(Object.values(p.profile!.ivs).every(n=>n<=24),id);assert.ok(Object.values(p.profile!.evs).reduce((a,b)=>a+b,0)<=46,id);assert.ok(p.item,id);}
  assert.equal(normalNpcTemplate(id,100,sample.role)?.gate50,undefined);
 }
 const n=namedTrainerSamples.find(s=>s.id==='named-n')!;
 assert.ok(generateOpponentTeam(50,[1,2,3,4],[],null,n,CURRENT_PROGRESSION).some(p=>p.name==='Zekrom'));
});
test('Z descriptions describe attacks and effects, crystals omit common use rules',()=>{
 for(const name of ['Inferno Overdrive','Extreme Evoboost','Clangorous Soulblaze','Guardian of Alola']){
  assert.ok(moveInfo[name].description.length>20);assert.doesNotMatch(moveInfo[name].description,/팀당|배틀 한 번/);
 }
 assert.match(moveInfo['Extreme Evoboost'].description,/2단계/);
 assert.match(moveInfo['Guardian of Alola'].description,/3\/4/);
 for(const crystal of Object.values(zCrystals))assert.doesNotMatch(crystal.description,/팀당|소모되지/);
});
