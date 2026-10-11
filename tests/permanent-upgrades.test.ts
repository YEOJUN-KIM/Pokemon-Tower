import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {statKeys} from '../src/data/training';
import {EGG_SHINY_ODDS} from '../src/data/permanent-upgrades';
function setup(path=':memory:',roll?:(max:number)=>number){const s=new TowerStore(path,roll);s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=20000 WHERE id=?').run('p');return s;}
test('purchase caps and insufficient funds are atomic, and receipts are owned/idempotent',()=>{
 const s=setup();try{const id=randomUUID();s.permanentAction('p',id,'buy','reroll',1,null);s.permanentAction('p',id,'buy','reroll',1,null);assert.equal(s.view('p').growthPoints,19500);assert.equal(s.permanentView('p').rerollLimit,2);
 assert.throws(()=>s.permanentAction('p',id,'buy','egg',1,null),/같은 요청/);
 s.permanentAction('p',randomUUID(),'buy','reroll',1,null);assert.equal(s.permanentView('p').rerollLimit,3);assert.throws(()=>s.permanentAction('p',randomUUID(),'buy','reroll',1,null),/최대/);
 s.db.prepare('UPDATE players SET growth_points=1 WHERE id=?').run('p');assert.throws(()=>s.permanentAction('p',randomUUID(),'buy','shiny',1,null),/부족/);assert.equal(s.permanentView('p').shinyTickets,0);assert.equal(s.view('p').growthPoints,1);
 s.ensurePlayer('other');assert.throws(()=>s.permanentAction('other',id,'buy','reroll',1,null),/부족/);
 for(const count of [0,-1,2,100])assert.throws(()=>s.permanentAction('p',randomUUID(),'buy','egg',count,null),/올바르지/);
 }finally{s.close();}
});
test('10 eggs consume exactly 10 tickets once, preserve IV maxima, unlock shiny and legal moves',()=>{
 const s=setup(':memory:',max=>max===32?31:0);try{s.db.prepare('DELETE FROM unlocks WHERE player_id=?').run('p');s.permanentAction('p',randomUUID(),'buy','egg',10,null);const id=randomUUID(),result=s.permanentAction('p',id,'hatch','egg',10,null);assert.equal(result.eggs!.length,10);assert.equal(s.permanentView('p').eggTickets,0);assert.deepEqual(s.permanentAction('p',id,'hatch','egg',10,null),result);
 const egg=result.eggs![0];assert.ok(egg.isNew);assert.ok(egg.shiny&&egg.newShiny);assert.ok(!result.eggs![1].isNew&&!result.eggs![1].newShiny);const saved=s.trainingCollection('p').find(t=>t.species===egg.species)!;assert.ok(saved.profile.shiny);for(const stat of statKeys)assert.equal(saved.profile.ivs[stat],31);assert.ok(result.eggs!.every(e=>e.newMoves.every(m=>saved.learnableMoves.includes(m))));
 s.db.prepare('UPDATE players SET growth_points=0 WHERE id=?').run('p');assert.throws(()=>s.permanentAction('p',randomUUID(),'hatch','egg',1,null),/부족/);
 const lowered=new TowerStore(':memory:',max=>max===EGG_SHINY_ODDS?1:0);try{lowered.ensurePlayer('p');lowered.db.prepare('UPDATE players SET growth_points=400 WHERE id=?').run('p');lowered.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run('p',egg.species);lowered.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?)').run('p',egg.species,JSON.stringify(saved.profile),saved.revision);lowered.permanentAction('p',randomUUID(),'buy','egg',1,null);lowered.permanentAction('p',randomUUID(),'hatch','egg',1,null);const after=lowered.trainingCollection('p').find(t=>t.species===egg.species)!;assert.deepEqual(after.profile.ivs,saved.profile.ivs);assert.ok(after.profile.shiny);assert.equal(after.revision,saved.revision);}finally{lowered.close();}
 }finally{s.close();}
});
test('shiny exchange survives training and reopening; current run snapshot stays unchanged',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tower-permanent-')),path=join(dir,'save.sqlite');let s=setup(path);try{
 const battleId=s.start('p',starters),runId=s.battle(battleId).run_id;
 s.permanentAction('p',randomUUID(),'buy','shiny',1,null);const id=randomUUID();s.permanentAction('p',id,'shiny','shiny',1,starters[0]);s.permanentAction('p',id,'shiny','shiny',1,starters[0]);assert.equal(s.permanentView('p').shinyTickets,0);
 assert.throws(()=>s.permanentAction('p',randomUUID(),'shiny','shiny',1,starters[0]),/이미/);assert.throws(()=>s.permanentAction('p',randomUUID(),'shiny','shiny',1,'Fake'),/보유/);
 const t=s.trainingCollection('p').find(t=>t.species===starters[0])!;s.train('p',t.species,t.revision,{...t.profile,shiny:false});assert.ok(s.trainingCollection('p').find(x=>x.species===t.species)!.profile.shiny);
 assert.ok(!Showdown.Teams.unpack(s.battle(battleId).player_team)![0].shiny);assert.ok(Showdown.Teams.unpack(packTeam([t.species],{[t.species]:s.trainingCollection('p').find(x=>x.species===t.species)!.profile}))![0].shiny);
 s.abandon('p',runId);s.close();s=new TowerStore(path);assert.ok(s.trainingCollection('p').find(x=>x.species===t.species)!.profile.shiny);assert.equal(s.permanentView('p').shinyTickets,0);
 }finally{s.close();rmSync(dir,{recursive:true});}
});
test('reroll extension applies to each shop, no fourth reroll; trainer shiny is saved in packed team',()=>{
 const s=setup(':memory:',()=>0);try{const id=s.start('p',starters),runId=s.battle(id).run_id;assert.ok(Showdown.Teams.unpack(s.battle(id).opponent_team)!.every(p=>p.shiny));s.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(runId);
 s.permanentAction('p',randomUUID(),'buy','reroll',1,null);s.permanentAction('p',randomUUID(),'buy','reroll',1,null);
 for(const kind of ['items','machines'] as const){for(let rev=0;rev<3;rev++)s.rerollShop('p',runId,11,kind,rev);assert.throws(()=>s.rerollShop('p',runId,11,kind,3),/모두/);assert.equal(s.view('p').run!.shopRerolls![kind].count,3);assert.equal(s.view('p').run!.shopRerolls![kind].limit,3);}
 }finally{s.close();}
});

test('hatching spends tickets first, covers the remainder with points and rolls back insufficient mixed payment',()=>{
 const s=setup();try{s.db.prepare('INSERT INTO permanent_upgrades VALUES (?,0,0,3)').run('p');const id=randomUUID();s.permanentAction('p',id,'hatch','egg',10,null);assert.equal(s.permanentView('p').eggTickets,0);assert.equal(s.view('p').growthPoints,18600);s.permanentAction('p',id,'hatch','egg',10,null);assert.equal(s.view('p').growthPoints,18600);s.permanentAction('p',randomUUID(),'hatch','egg',1,null);assert.equal(s.view('p').growthPoints,18400);s.db.prepare('UPDATE permanent_upgrades SET egg_tickets=3 WHERE player_id=?').run('p');s.db.prepare('UPDATE players SET growth_points=1399 WHERE id=?').run('p');assert.throws(()=>s.permanentAction('p',randomUUID(),'hatch','egg',10,null),/부족/);assert.equal(s.permanentView('p').eggTickets,3);assert.equal(s.view('p').growthPoints,1399);}finally{s.close();}
});
