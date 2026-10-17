import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import Showdown from 'pokemon-showdown';
import {CURRENT_PROGRESSION,towerDifficulty,opponentTeraTickets,eliteChance} from '../src/data/tower-progression';
import {towerThemes,type TowerTheme} from '../src/data/tower-themes';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {opponentProfile} from '../src/server/opponent-training';
import {generateOpponentTeam,encounterPool,selectTrainerSample} from '../src/server/opponent-team';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {statKeys,type StatBlock} from '../src/data/training';
import {runBattle,FORMAT} from '../src/battle/run';
import {SwitchingPolicy} from '../src/battle/switch-policy';
import {megaStones,DYNAMAX_ITEM,canEquipGimmick} from '../src/data/gimmicks';

test('second climb opens below the fiftieth floor, surpasses it at one hundred and stays within legal stat points',()=>{
 const first=towerDifficulty(50),rest=towerDifficulty(51),end=towerDifficulty(100);
 for(const key of ['bstCeiling','ivCap','points'] as const){assert.ok(rest[key]<first[key]);assert.ok(towerDifficulty(60)[key]<first[key]);assert.ok(end[key]>first[key]);}
 const ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;
 for(let floor=1;floor<=100;floor++){
  const profile=opponentProfile('Charizard',['Flamethrower','Air Slash','Dragon Pulse','Roost'],floor,ivs,CURRENT_PROGRESSION);
  assert.equal(Object.values(profile.evs).reduce((s,n)=>s+n,0),towerDifficulty(floor).points);
  assert.ok(Object.values(profile.evs).every(n=>n>=0&&n<=32));
  assert.ok(Object.values(profile.ivs).every(n=>n<=towerDifficulty(floor).ivCap));
  if(floor!==51)assert.ok(towerDifficulty(floor).points>=towerDifficulty(Math.max(1,floor-1)).points);
 }
 assert.throws(()=>towerDifficulty(101));assert.throws(()=>towerDifficulty(0));
 assert.equal(opponentTeraTickets(5,'named'),0);assert.equal(opponentTeraTickets(20,'named'),1);
 assert.equal(opponentTeraTickets(50,'normal'),0);assert.equal(opponentTeraTickets(100,'normal'),0);assert.equal(opponentTeraTickets(81,'elite'),1);assert.ok(eliteChance(51)<eliteChance(50));assert.ok(eliteChance(100)>eliteChance(50));
});

test('both regional chapters have distinct gyms and elite draws and every second-chapter milestone finishes a legal battle',async()=>{
 for(const theme of Object.keys(towerThemes) as TowerTheme[]){
  const config=towerThemes[theme],run='hundred-'+theme;
  assert.equal(new Set([55,65,75,85,95].map(f=>towerTrainerEncounter(f,run,theme)!.boss.id)).size,5);
  assert.equal(new Set([60,70,80].map(f=>towerTrainerEncounter(f,run,theme)!.boss.id)).size,3);
  assert.equal(towerTrainerEncounter(90,run,theme)!.boss.id,config.champion);
  assert.equal(towerTrainerEncounter(100,run,theme)!.boss.id,config.final);
  for(const floor of [55,60,70,80,90,100]){
   const trainer=towerTrainerEncounter(floor,run,theme)!,team=generateOpponentTeam(floor,[1,2,3,4],[],trainer,undefined,CURRENT_PROGRESSION);
   const profiles=Object.fromEntries(team.map(p=>[p.name,{...opponentProfile(p.name,p.moves,floor,{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},CURRENT_PROGRESSION),...(p.ability?{ability:p.ability}:{})}]));
   const packed=packTeam(team.map(p=>p.name),profiles,Object.fromEntries(team.map(p=>[p.name,p.item??''])));
   const log=await runBattle({teams:{p1:packTeam(starters),p2:packed},player:new SwitchingPolicy(),opponent:new SwitchingPolicy(),teraTickets:{p1:1,p2:1},seed:[1,2,3,4]});
   assert.ok(log.winner);assert.equal(Showdown.Teams.unpack(packed)!.length,3);
  }
 }
});

test('relaxed normal pools always provide three eligible partners and preserve legality through all one hundred floors',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 for(let floor=1;floor<=100;floor++)for(let n=1;n<=4;n++){
  const seed:[number,number,number,number]=[n,2,3,4],sample=selectTrainerSample(floor,seed,[],CURRENT_PROGRESSION);
  const team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION);
  assert.equal(new Set(team.map(p=>p.name)).size,3);assert.ok(team.every(p=>encounterPool(floor,CURRENT_PROGRESSION).includes(p.name)));
  const profiles=Object.fromEntries(team.map(p=>[p.name,opponentProfile(p.name,p.moves,floor,{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},CURRENT_PROGRESSION)]));
  const sets=Showdown.Teams.unpack(packTeam(team.map(p=>p.name),profiles))!;
  // Cartridge IV origin guarantees are separate from the tower collection's IV growth.
  sets.forEach(p=>{p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.evs={hp:1,atk:0,def:0,spa:0,spd:0,spe:0};p.pokeball='';});
  assert.equal(validator.validateTeam(sets),null,`${floor}: ${sample.id}`);
 }
});

test('real v20 migration preserves fifty-floor saves and future old difficulty, while new saves get the hundred-floor curve',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
 try{
  store.ensurePlayer('old');const battle=store.battle(store.start('old',starters)),run=battle.run_id;
  store.db.prepare('UPDATE runs SET total_floors=50 WHERE id=?').run(run);
  const before=store.view('old');store.close();
  const legacy=new DatabaseSync(path);legacy.exec('PRAGMA foreign_keys=OFF; BEGIN; DROP TABLE run_progression; DROP TABLE run_npc_rules;');
  const sql=(legacy.prepare("SELECT sql FROM sqlite_master WHERE name='runs'").get() as {sql:string}).sql;
  legacy.exec(sql.replace(/CREATE TABLE (?:"runs"|runs)/,'CREATE TABLE legacy_runs').replace('DEFAULT 100','DEFAULT 50').replace('BETWEEN 1 AND 100','BETWEEN 1 AND 50'));
  legacy.exec("INSERT INTO legacy_runs SELECT * FROM runs; DROP TABLE runs; ALTER TABLE legacy_runs RENAME TO runs; CREATE UNIQUE INDEX one_active_run ON runs(player_id) WHERE state IN ('select','battle','recruit'); PRAGMA user_version=20; COMMIT;");legacy.close();
  store=new TowerStore(path);assert.deepEqual(store.view('old'),{...before,totalFloors:100});assert.deepEqual(store.battle(battle.id),battle);
  assert.equal(store.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(run),undefined);
  store.db.prepare("UPDATE runs SET floor=23,state='select' WHERE id=?").run(run);
  const old=Showdown.Teams.unpack(store.battle(store.enter('old',run,23,starters)).opponent_team)!;
  assert.ok(old.every(p=>Object.values(p.evs as StatBlock).reduce((s,n)=>s+n,0)===13));
  store.ensurePlayer('new');const fresh=store.battle(store.start('new',starters));
  assert.equal(store.view('new').run!.totalFloors,100);
  assert.equal(store.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(fresh.run_id)!.version,CURRENT_PROGRESSION);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,43);
 }finally{store.close();}
});

test('normal trainers never receive gimmicks, later elite frequency rises, and elite gear is compatible and varied',()=>{
 let mega=0,dynamax=0,earlyElite=0,lateElite=0;
 for(let n=1;n<=256;n++)for(const floor of [25,49,51,99]){
  const seed:[number,number,number,number]=[n,2,3,4],sample=selectTrainerSample(floor,seed,[],CURRENT_PROGRESSION);
  const team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION);
  if(sample.kind==='normal'){assert.equal(opponentTeraTickets(floor,sample.kind),0);assert.ok(team.every(p=>!p.item));}
  else{
   if(floor===49)earlyElite++;if(floor===99)lateElite++;
   assert.equal(opponentTeraTickets(floor,sample.kind),1);
   if(floor===51)assert.ok(team.every(p=>!p.item));
   assert.ok(team.filter(p=>p.item).length<=1);
   for(const p of team)if(p.item){assert.ok(canEquipGimmick(p.name,p.item));if(megaStones[p.item])mega++;if(p.item===DYNAMAX_ITEM)dynamax++;}
  }
 }
 assert.ok(lateElite>earlyElite);assert.ok(mega>0);assert.ok(dynamax>0);
});
