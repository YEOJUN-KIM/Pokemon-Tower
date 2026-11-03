import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {buildTraining} from '../src/data/opponent-progression';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import {npcSamples} from '../src/data/npc-samples';
import {sampleRankWeights} from '../src/data/npc-ranks';
import {starters,packTeam,pokemonSets} from '../src/data/teams';
import {FORMAT,runBattle,replayBattle,type Seed} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {npcAi} from '../src/data/npc-ai';
import {towerThemes,type TowerTheme} from '../src/data/tower-themes';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {generateOpponentTeam,encounterPool,normalOpponentSpecies} from '../src/server/opponent-team';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {isNpcGimmickItem} from '../src/server/npc-progression-team';
import {inferProgressionRole} from '../src/server/npc-progression-builds';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {RunEvents} from '../src/server/run-events';
import {eventDefinitions} from '../src/data/run-events';
import {mirrorFixture} from './mirror-fixture';
import {addMirrorCandidate} from '../src/server/mirror-challenger';
const seed:Seed=[19,29,43,71],ranks=['normal','elite','master'] as const,dex=Showdown.Dex;
const setup=new Set(['swordsdance','dragondance','nastyplot','calmmind','bulkup','quiverdance','shellsmash']);
const validator=new Showdown.TeamValidator(FORMAT);

test('v2 early ranks, builds, items and AI obey the same learning gate across every class',()=>{
 for(const sample of npcSamples)for(const floor of [1,5,10,12,20]){
  const weights=sampleRankWeights(sample,floor,'normal',CURRENT_PROGRESSION);
  if(floor<=10){assert.equal(weights.master,0);assert.ok(weights.elite<.2);}
  for(const rank of ranks){
   const e=generateNpcEncounter(floor,seed,sample,rank,'chaos',CURRENT_PROGRESSION);
   assert.equal(e.gimmick,null);assert.ok(e.team.every(p=>!p.item||!isNpcGimmickItem(p.item)));
   assert.ok(e.team.every(p=>p.moves.every(m=>!setup.has(dex.moves.get(m).id))));
   if(floor<=10)for(const p of e.team){const types=dex.species.get(p.name).types;assert.ok(new Set(p.moves.map(m=>dex.moves.get(m)).filter(m=>m.category!=='Status'&&!types.includes(m.type)).map(m=>m.type)).size<=1);}
   assert.ok(e.team.every(p=>!p.item||!['Life Orb','Focus Sash','Choice Scarf','Choice Band','Choice Specs','Leftovers'].includes(p.item)));
   assert.equal(npcAi(floor,{kind:rank==='normal'?'normal':'elite',npcRank:rank,tactic:sample.tactic},{progression:CURRENT_PROGRESSION}).tier,floor<=10?'basic':'tactical');
  }
 }
});
test('all v2 floor/rank builds stay legal, coherent and within budgets, with real late role/item variety',()=>{
 const roles=new Set<string>(),items=new Set<string>();
 for(let floor=1;floor<=100;floor++)for(const rank of ranks)for(const sample of npcSamples.filter((_,i)=>i%4===floor%4)){
  const e=generateNpcEncounter(floor,seed,sample,rank,'basic',CURRENT_PROGRESSION);
  assert.equal(e.team.length,3);assert.equal(new Set(e.team.map(p=>p.name)).size,3);
  assert.equal(e.team.filter(p=>p.item).length,new Set(e.team.filter(p=>p.item).map(p=>p.item)).size);
  if(floor<50)assert.equal(e.gimmick,null);
  if(floor>=91&&rank==='master')assert.ok(e.gimmick);
  if(rank==='normal')assert.equal(e.gimmick,null);
  for(const p of e.team){
   assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.name]),moves:p.moves,ability:p.profile!.ability},{}),null,`${floor}/${rank}/${p.name}: ${p.moves}`);
   assert.equal(Object.values(p.profile!.evs).reduce((a,b)=>a+b,0),buildTraining(floor,rank).evBudget);
   assert.ok(Object.values(p.profile!.evs).every(v=>v>=0&&v<=32));
   const moves=p.moves.map(m=>dex.moves.get(m));
   if(['Choice Scarf','Choice Band','Choice Specs','Assault Vest'].includes(p.item??''))assert.ok(moves.every(m=>m.category!=='Status'));
   for(const m of moves.filter(m=>setup.has(m.id)))assert.ok(moves.filter(a=>a.category!=='Status'&&a.overrideOffensivePokemon!=='target'&&(m.boosts?.[a.overrideOffensiveStat??(a.category==='Physical'?'atk':'spa')]??0)>0).length>=2,`${p.name}: ${p.moves}`);
   if(floor>=71&&rank==='normal'){roles.add(inferProgressionRole(p.name,p.moves));if(p.item)items.add(p.item);assert.ok(p.item);}
  }
 }
 assert.ok(roles.size>=6,JSON.stringify([...roles]));assert.ok(items.size>=10,JSON.stringify([...items]));
});
test('all regions have an ace gimmick at 50/100, named early teams have none and preserve identities',()=>{
 for(const theme of Object.keys(towerThemes) as TowerTheme[])for(const floor of [5,10,25,40,45,50,55,90,100]){
  const trainer=towerTrainerEncounter(floor,'progression-test',theme,true)!;
  const sample=namedTrainerSamples.find(s=>s.id===trainer.boss.id)!;
  const snapshot=snapshotTrainerEventBattle(`gate:${theme}:${floor}`,sample,floor,'basic',CURRENT_PROGRESSION);
  assert.ok(snapshot.team.some(p=>p.name===normalNpcTemplate(sample.id,floor,sample.role,CURRENT_PROGRESSION)?.ace||p.name===sample.ace));
  if(floor<50){assert.equal(snapshot.trainer.gimmick,undefined);assert.ok(snapshot.team.every(p=>!p.item||!isNpcGimmickItem(p.item)));assert.ok(snapshot.team.every(p=>!p.gigantamax));}
  if(floor===50||floor===100){assert.ok(snapshot.trainer.gimmick,`${theme}/${floor}`);assert.equal(snapshot.trainer.npcAi!.tier,'expert');assert.ok(snapshot.team.every(p=>p.item));}
 }
 for(const name of ['Iron Crown','Iron Boulder','Raging Bolt','Gouging Fire']){assert.ok(normalOpponentSpecies(name));assert.ok(encounterPool(99,CURRENT_PROGRESSION).includes(name));}
});
test('v47 migration preserves a v1 run and battle byte-for-byte, new runs opt into v2',()=>{
 const path=`.data/tests/progression-${randomUUID()}.sqlite`;let store=new TowerStore(path);
 try{
  store.ensurePlayer('old');const first=store.battle(store.start('old',starters));store.db.prepare("UPDATE run_progression SET version='hundred-floor-v1' WHERE run_id=?").run(first.run_id);
  store.db.exec("CREATE TABLE old_progression(run_id TEXT PRIMARY KEY REFERENCES runs(id),version TEXT NOT NULL CHECK(version IN ('hundred-floor-v1'))) STRICT; INSERT INTO old_progression SELECT * FROM run_progression; DROP TABLE run_progression; ALTER TABLE old_progression RENAME TO run_progression; PRAGMA user_version=47;");
  const before=store.battle(first.id);store.close();store=new TowerStore(path);
  assert.deepEqual(store.battle(first.id),before);assert.equal(store.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(first.run_id)!.version,'hundred-floor-v1');
  store.ensurePlayer('new');const fresh=store.battle(store.start('new',starters));assert.equal(store.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(fresh.run_id)!.version,CURRENT_PROGRESSION);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});
test('v2 leaves shop ownership intact but locks player powers before 50; raids wait until after the first gate',async()=>{
 const store=new TowerStore(':memory:');let service:TowerService|undefined;
 try{
  store.ensurePlayer('lock');const first=store.battle(store.start('lock',starters,'chaos')),run=first.run_id;
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Charizard','Charizardite X');
  for(const floor of [2,50]){
   store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);store.enter('lock',run,floor,starters);service=new TowerService(store);
   const response=await service.state('lock');assert.equal(response.battle!.actions.some(a=>a.command.includes('mega')),floor===50);
   await service.dispose();service=undefined;
  }
  assert.equal(store.db.prepare('SELECT item FROM run_held_items WHERE run_id=?').get(run)!.item,'Charizardite X');
  const events=new RunEvents(store.db,()=>0,{'raid-encounter':eventDefinitions['raid-encounter']});events.enable(run);
  for(const after of [1,19,49,50]){events.encounter(run,after);assert.equal(events.view(run),null);}
  events.encounter(run,51);assert.equal(events.view(run)?.kind,'raid-encounter');
 }finally{await service?.dispose();store.close();}
});
test('opt-in support policy actually deploys a screen in the battle engine',async()=>{
 const log=await runBattle({seed,teams:{p1:packTeam(['Snorlax','Blastoise','Venusaur']),p2:packTeam(['Espeon','Blastoise','Venusaur'],{Espeon:{ivs:{hp:20,atk:20,def:20,spa:20,spd:20,spe:20},evs:{hp:10,atk:0,def:0,spa:10,spd:0,spe:10},moves:['Reflect','Light Screen','Psychic','Shadow Ball'],ability:'Synchronize',nature:'Serious',statSystem:'points'}})},player:new DamagePolicy(),opponent:createNpcPolicy({tier:'expert',tactic:'balanced',buildSupport:'v1'}),rule:'basic'});
 assert.ok(log.publicProtocol.some(l=>l.startsWith('|move|p2a: Espeon|Reflect')||l.startsWith('|move|p2a: Espeon|Light Screen')));
});
test('a live gated battle completes, saves and replays with the frozen effective rule',async()=>{
 const store=new TowerStore(':memory:'),service=new TowerService(store);
 try{
  store.ensurePlayer('complete');const id=store.start('complete',starters,'chaos'),run=store.battle(id).run_id;
  assert.equal(store.runRule(run),'chaos');assert.equal(store.battle(id).rule,'basic');
  let battle=(await service.state('complete')).battle!;
  for(let i=0;i<200&&battle.status!=='complete';i++){
   assert.notEqual(battle.status,'error',battle.error??'');
   const action=battle.actions.find(a=>a.command==='move 1')??battle.actions[0];assert.ok(action);
   await service.action('complete',id,battle.requestId,action.command);battle=(await service.state('complete')).battle!;
  }
  assert.equal(battle.status,'complete');assert.equal(store.battle(id).status,'complete');
  const log=JSON.parse(store.battle(id).log!);assert.equal(log.rule,'basic');await replayBattle(log);
 }finally{await service.dispose();store.close();}
});
test('v2 mirror offers wait for the gate and retain the v2 training/AI after it',()=>{
 const f=mirrorFixture(':memory:','mirror-v2',60,'chaos');
 try{
  f.store.db.prepare('UPDATE run_progression SET version=? WHERE run_id=?').run(CURRENT_PROGRESSION,f.run);
  const before=addMirrorCandidate(f.store.db,f.event.id,f.run,49,'chaos',f.normal,()=>0);assert.deepEqual(before,f.normal);
  const candidate=addMirrorCandidate(f.store.db,f.event.id,f.run,60,'chaos',f.normal,()=>0).find(c=>c.mirror)!;
  assert.ok(candidate);assert.equal(candidate.training.evBudget,buildTraining(60,'elite').evBudget);assert.equal(candidate.npcAi?.buildSupport,'v1');
 }finally{f.store.close();}
});
