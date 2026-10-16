import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {upgrades,type UpgradeKind} from '../src/data/shop';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('three distinct consumables persist across restarts, vary between checkpoints and reject unlisted purchases',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
 try{store.ensurePlayer('p');const id=store.battle(store.start('p',starters)).run_id;store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(id);store.db.prepare('UPDATE players SET coins=20000 WHERE id=?').run('p');
 const offered=store.view('p').run!.consumableOffers!;assert.equal(offered.length,3);assert.equal(new Set(offered).size,3);
 const missing=(Object.keys(upgrades) as UpgradeKind[]).find(x=>!offered.includes(x))!;assert.throws(()=>store.purchase('p',id,6,missing),/판매 중/);assert.equal(store.view('p').coins,20000);
 store.purchase('p',id,6,offered[0]);assert.equal(store.view('p').coins,19700);store.purchase('p',id,6,offered[0]);assert.equal(store.view('p').run!.battleItems![offered[0]],2);
 store.close();store=new TowerStore(path);assert.deepEqual(store.view('p').run!.consumableOffers,offered);
 const combinations=new Set<string>();for(const floor of [11,16,21,26,31,36,41,46]){store.db.prepare('UPDATE runs SET floor=? WHERE id=?').run(floor,id);combinations.add(store.view('p').run!.consumableOffers!.join(','));}assert.ok(combinations.size>1);
 store.db.prepare('UPDATE runs SET floor=6 WHERE id=?').run(id);assert.deepEqual(store.view('p').run!.consumableOffers,offered);assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});

test('v17 migration preserves previously bought upgrades and permits new consumables',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
 try{store.ensurePlayer('old');const id=store.battle(store.start('old',starters)).run_id;
 store.db.exec("DROP TABLE run_upgrades; CREATE TABLE run_upgrades(run_id TEXT NOT NULL REFERENCES runs(id),kind TEXT NOT NULL CHECK(kind IN ('attack','speed','guard')),start_floor INTEGER NOT NULL,end_floor INTEGER NOT NULL,PRIMARY KEY(run_id,kind)) STRICT; PRAGMA user_version=17;");store.db.prepare('INSERT INTO run_upgrades VALUES (?,?,?,?)').run(id,'attack',6,10);store.close();store=new TowerStore(path);
 assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,40);assert.equal(store.db.prepare('SELECT kind FROM run_upgrades WHERE run_id=?').get(id)!.kind,'attack');store.db.prepare('INSERT INTO run_upgrades VALUES (?,?,?,?)').run(id,'critical',6,10);assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});

const team=(move:string)=>{const sets=Showdown.Teams.unpack(packTeam(['Garchomp','Gyarados','Golem']))!;sets[0].moves=[move];return Showdown.Teams.pack(sets);};
const play=(move:string,active:UpgradeKind[]=[],seed:number=1)=>runBattle({teams:{p1:team(move),p2:team(move)},seed:[seed,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),upgrades:active});
const firstHP=(log:Awaited<ReturnType<typeof play>>,side:string)=>Number(log.publicProtocol.find(x=>x.startsWith(`|-damage|${side}a:`)&&!x.includes("[from]"))!.split('|')[3].split('/')[0]);
test('new attack and defense consumables affect actual damage, replay and stay local to each battle',async()=>{
 const physical=await play('Dragon Claw'),defense=await play('Dragon Claw',['defense']);assert.ok(firstHP(defense,'p1')>firstHP(physical,'p1'));
 const special=await play('Flamethrower'),spa=await play('Flamethrower',['specialAttack']),spd=await play('Flamethrower',['specialDefense']);assert.ok(firstHP(spa,'p2')<firstHP(special,'p2'));assert.ok(firstHP(spd,'p1')>firstHP(special,'p1'));
 for(const log of [defense,spa,spd])assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));assert.deepEqual(battleEvents((await play('Dragon Claw')).publicProtocol),battleEvents(physical.publicProtocol));
});
test('accuracy and critical consumables improve hit and critical counts across fixed seeds and replay',async()=>{
 let plainMiss=0,boostMiss=0,plainCrit=0,boostCrit=0;
 for(let seed=1;seed<=12;seed++){const plain=await play('Stone Edge',[],seed),boost=await play('Stone Edge',['accuracy','critical'],seed);const misses=(log:typeof plain)=>log.publicProtocol.filter(x=>x.startsWith('|-miss|p1a:')).length;const crits=(log:typeof plain)=>log.publicProtocol.filter(x=>x.startsWith('|-crit|p2a:')).length;plainMiss+=misses(plain);boostMiss+=misses(boost);plainCrit+=crits(plain);boostCrit+=crits(boost);if(seed===1)assert.deepEqual(battleEvents((await replayBattle(boost)).publicProtocol),battleEvents(boost.publicProtocol));}
 assert.ok(boostMiss<plainMiss,`${boostMiss} boosted misses vs ${plainMiss}`);assert.ok(boostCrit>plainCrit,`${boostCrit} boosted criticals vs ${plainCrit}`);
});
