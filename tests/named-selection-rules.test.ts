import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import runtime from '../src/data/normal-npc-templates.json' with {type:'json'};
import {validateSelectionRules,satisfiesSelectionRules,orderSelectedTeam,type SelectionRules} from '../src/data/npc-selection-rules';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {namedTrainerSamples,trainerView} from '../src/data/trainer-catalog';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {TowerStore} from '../src/server/tower-store';
import {packTeam,starters} from '../src/data/teams';
import type {BattleLog} from '../src/battle/run';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {namedTrainerIntros} from '../src/data/named-trainer-intros';
import {namedBattleTelemetry} from '../scripts/lib/named-battle-telemetry';

test('selection validation rejects missing species, malformed lists and impossible merged constraints',()=>{
 const pool=['A','B','C','D'];
 for(const rules of [{required:['X']},{required:['A','B','C','D']},{atLeastOneOf:[]},{preferredLead:['X']},{preferredLast:['X']},{required:['A','A']},{preferredLead:['A'],preferredLast:['A']},{required:['A','B','C'],atLeastOneOf:['D']},{other:['A']},{required:'A'}])assert.throws(()=>validateSelectionRules(pool,rules as SelectionRules),/Invalid NPC selection rules/);
 assert.throws(()=>validateSelectionRules(pool,{required:['C','D']},['A','B']),/cannot fit/);
 assert.doesNotThrow(()=>validateSelectionRules(pool,{required:['A'],atLeastOneOf:['A','B']},['A','B']));
});

test('ordering only moves selected preferences, preserves random middle and resolves priority deterministically',()=>{
 const team=['A','B','C'];assert.equal(orderSelectedTeam(team,x=>x),team);
 assert.deepEqual(orderSelectedTeam(team,x=>x,{preferredLead:['X']}),team);
 assert.deepEqual(orderSelectedTeam(team,x=>x,{preferredLead:['B','A'],preferredLast:['C']}),['B','A','C']);
 assert.deepEqual(team,['A','B','C']);
});

test('Jasmine rules eliminate the passive trio while retaining seeded selection and order variation',()=>{
 const sample=namedTrainerSamples.find(s=>s.id==='named-jasmine')!,combinations=new Set<string>(),orders=new Set<string>();
 for(const floor of [5,45,55,95])for(let n=0;n<64;n++){
  const seed:[number,number,number,number]=[n,2,3,4],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),names=team.map(p=>p.name);
  assert.ok(names.includes('Steelix'));assert.ok(['Metagross','Empoleon','Magnezone'].some(name=>names.includes(name)));
  assert.deepEqual(generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),team);
  combinations.add([...names].sort().join(','));orders.add(names.join(','));
 }
 assert.ok(combinations.size>3);assert.ok(orders.size>combinations.size);
});

test('every applied runtime rule holds after final shuffle, with ace/carrier and floor builds intact',()=>{
 for(const sample of namedTrainerSamples)for(const floor of [5,45,50,55,95,100]){
  const template=normalNpcTemplate(sample.id,floor,sample.role);if(!template?.selectionRules)continue;
  validateSelectionRules(template.team.map(p=>p.species),template.selectionRules,[...template.required??[],template.ace,...template.signature?[template.signature.species]:[]]);
  for(let n=0;n<16;n++){
   const team=generateOpponentTeam(floor,[n,2,3,4],[],null,sample,CURRENT_PROGRESSION),names=team.map(p=>p.name);
   const rules:SelectionRules=template.selectionRules;
   assert.equal(names.length,3);assert.equal(new Set(names).size,3);assert.ok(names.includes(template.ace));assert.ok(satisfiesSelectionRules(names,rules));
   const lead=rules.preferredLead?.find(name=>names.includes(name)),last=rules.preferredLast?.find(name=>names.includes(name));
   if(lead)assert.equal(names[0],lead);if(last)assert.equal(names[2],last);
   for(const p of team)assert.deepEqual(p.moves,template.team.find(c=>c.species===p.name)!.profile.moves);
  }
 }
 for(const row of runtime)validateSelectionRules(row.team.map(p=>p.species),'selectionRules' in row?row.selectionRules:undefined,[...row.ace?[row.ace]:[],...row.signature?[row.signature.species]:[]]);
});

test('verified intros are opt-in and unverified/post-battle quotes are omitted',()=>{
 for(const [id,entry] of Object.entries(namedTrainerIntros))assert.equal(trainerView(namedTrainerSamples.find(s=>s.id===id)!).introduction,entry.text);
 for(const id of ['named-karen','named-jasmine','named-giovanni'])assert.equal(trainerView(namedTrainerSamples.find(s=>s.id===id)!).introduction,'');
});

test('a saved pre-rule opponent order survives reconnect, retry and replay without generation',async()=>{
 mkdirSync('.data/tests',{recursive:true});const path=`.data/tests/selection-${randomUUID()}.sqlite`;
 let store=new TowerStore(path);
 try{
  store.ensurePlayer('p');store.db.prepare('UPDATE players SET growth_points=500 WHERE id=?').run('p');store.permanentAction('p',randomUUID(),'buy','retry',1,null);
  const id=store.start('p',starters,'basic'),run=store.battle(id).run_id;
  // This order violates the new preferredLast rule and must remain a valid saved battle.
  const packed=packTeam(['Garchomp','Spiritomb','Lucario']);
  store.db.prepare('UPDATE battles SET opponent_team=?,boss=? WHERE id=?').run(packed,JSON.stringify({...trainerView(namedTrainerSamples.find(s=>s.id==='named-cynthia')!),introduction:''}),id);
  const snapshot=store.battle(id);store.close();store=new TowerStore(path);
  assert.equal(store.currentBattle('p')!.opponent_team,packed);
  const log=await runBattle({teams:{p1:snapshot.player_team,p2:packed},seed:JSON.parse(snapshot.seed),rule:'basic',trainerEquipment:JSON.parse(snapshot.trainer_equipment??'[]'),teraTickets:JSON.parse(snapshot.tera_tickets),upgrades:JSON.parse(snapshot.upgrades),player:new DamagePolicy(),opponent:new DamagePolicy()});
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
  const lost={...log,winner:'Tower AI'} as BattleLog;
  store.complete(id,lost,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:[],winner:'Tower AI',error:null});
  store.retry('p',run,id);store.close();store=new TowerStore(path);
  const next=store.enter('p',run,1,starters),saved=store.battle(next);
  assert.equal(saved.opponent_team,packed);assert.equal(saved.seed,snapshot.seed);assert.equal(saved.boss,snapshot.boss);
 }finally{store.close();}
});

test('gimmick telemetry counts actual protocol activation with turn and HP, not just a chosen action',()=>{
 const log={teams:{p2:packTeam(['Charizard','Blastoise','Venusaur'],{}, {Charizard:'Charizardite X'})},teraTickets:{p1:0,p2:0},winner:'Tower AI',publicProtocol:['|switch|p1a: Mimikyu|Mimikyu, L50|100/100','|switch|p2a: Charizard|Charizard, L50|100/100','|turn|2','|-damage|p2a: Charizard|50/100','|-mega|p2a: Charizard|Charizard|Charizardite X','|move|p2a: Charizard|Flamethrower|p1a: Mimikyu']} as BattleLog;
 const data=namedBattleTelemetry(log);assert.equal(data.available.length,1);assert.deepEqual(data.used[0],{kind:'mega',species:'Charizard',turn:2,hp:.5,targetHP:1,winner:'Tower AI'});
 assert.equal(namedBattleTelemetry({...log,publicProtocol:[]}).used.length,0);
});
