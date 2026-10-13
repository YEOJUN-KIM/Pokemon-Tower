import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {BattleSession} from '../src/server/battle-session';
import {packTeam,starters} from '../src/data/teams';
import {DYNAMAX_ITEM} from '../src/data/gimmicks';
import {battleRules,allowsGimmick,type BattleRule} from '../src/data/run-rules';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
for(const rule of Object.keys(battleRules) as BattleRule[])test(rule+' restricts both players and replays its saved rules',async()=>{
 const team=packTeam(['Charizard','Blastoise','Venusaur'],{},{Charizard:rule==='dynamax'?DYNAMAX_ITEM:'Charizardite X'}),seen=new Set<string>(),policy=new DamagePolicy();
 const choose=(side:string)=>(o:Parameters<typeof policy.choose>[0])=>{if(o.legalActions.some(a=>a.command.startsWith('move '))){seen.add(side);for(const kind of ['mega','dynamax','terastallize'] as const){const expected=allowsGimmick(rule,kind)&&(kind==='terastallize'||(kind==='dynamax'?rule==='dynamax':rule!=='dynamax'));if(!seen.has(side+'checked'))assert.equal(o.legalActions.some(a=>a.command.endsWith(' '+kind)),expected,side+' '+kind);}seen.add(side+'checked');}return policy.choose(o);};
 const log=await runBattle({rule,teams:{p1:team,p2:team},teraTickets:{p1:1,p2:1},player:{choose:choose('p1')},opponent:{choose:choose('p2')}});
 assert.ok(seen.has('p1')&&seen.has('p2'));assert.equal(log.rule,rule);assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
test('basic engine rejects forged gimmick commands',async()=>{
 const team=packTeam(['Charizard','Blastoise','Venusaur'],{},{Charizard:'Charizardite X'}),s=new BattleSession(async()=>{},[1,2,3,4],{rule:'basic',teams:{p1:team,p2:team},teraTickets:{p1:1,p2:1}});
 try{const v=await s.ready();for(const kind of ['mega','dynamax','terastallize'])assert.throws(()=>s.submit(v.id,v.requestId,'move 1 '+kind),/선택/);}finally{await s.dispose();}
});
test('player rules persist and filter shops while new NPCs keep independent gimmicks',()=>{
 const s=new TowerStore(':memory:');try{
 for(const rule of Object.keys(battleRules) as BattleRule[]){s.ensurePlayer(rule);const row=s.battle(s.start(rule,starters,rule));assert.equal(row.rule,rule);assert.equal(s.view(rule).run!.rule,rule);
 s.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(row.run_id);s.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(row.run_id,11,JSON.stringify(['Charizardite X',DYNAMAX_ITEM,'Leftovers']));
 const view=s.view(rule).run!;assert.equal(view.itemOffers!.includes('Charizardite X'),allowsGimmick(rule,'mega'));assert.equal(view.itemOffers!.includes(DYNAMAX_ITEM),allowsGimmick(rule,'dynamax'));assert.equal(!!view.teraShop,allowsGimmick(rule,'terastallize'));
 if(!allowsGimmick(rule,'terastallize'))assert.throws(()=>s.purchaseTera(rule,row.run_id,11),/룰/);
 s.db.prepare("UPDATE runs SET floor=50,state='select' WHERE id=?").run(row.run_id);const boss=s.battle(s.enter(rule,row.run_id,50,starters));assert.equal(boss.rule,rule);assert.equal(boss.ai_version,'tower-policy-v10');assert.ok(JSON.parse(boss.boss!).gimmick);
 s.db.prepare('DELETE FROM run_rules WHERE run_id=?').run(row.run_id);assert.equal(s.view(rule).run!.rule,'chaos');}
 s.ensurePlayer('invalid');assert.throws(()=>s.start('invalid',starters,'invalid'),/룰/);assert.equal(s.view('invalid').run,null);
 }finally{s.close();}
});
