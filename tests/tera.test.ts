import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {BattleSession} from '../src/server/battle-session';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {defaultProfile,validateProfile} from '../src/server/training';
import {packTeam} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {TeraPolicy} from '../src/battle/gimmick-policy';
import {PRE_TERA_FORMAT} from '../src/data/battle-rules';
import {presentationFrames} from '../src/web/battle-presentation';
function teams(item=''){
 const own=Showdown.Teams.unpack(packTeam(['Charizard','Blastoise','Venusaur'],{Charizard:{...defaultProfile('Charizard'),teraType:'Water'}},{Charizard:item}))!;
 own[0].moves=['Flamethrower','Growl','Tera Blast'];
 const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
 return {p1:Showdown.Teams.pack(own),p2:Showdown.Teams.pack(enemy)};
}
test('primary type default, free saved tera choices, strict input and frozen run snapshots',()=>{
 assert.equal(defaultProfile('Incineroar').teraType,'Fire');
 assert.throws(()=>validateProfile('Charizard',{...defaultProfile('Charizard'),teraType:'wrong'}),/테라 타입/);
 const store=new TowerStore(':memory:');try{
 store.ensurePlayer('tera');const entry=store.trainingCollection('tera').find(e=>e.species==='Charizard')!;
 store.train('tera','Charizard',entry.revision,{...entry.profile,teraType:'Water'});
 assert.equal(store.view('tera').growthPoints,0);
 const row=store.battle(store.start('tera',['Charizard','Blastoise','Venusaur']));
 assert.equal(Showdown.Teams.unpack(row.player_team)![0].teraType,'Water');
 const saved=store.trainingCollection('tera').find(e=>e.species==='Charizard')!;
 store.train('tera','Charizard',saved.revision,{...saved.profile,teraType:'Grass'});
 assert.equal(JSON.parse(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(row.run_id)!.profiles as string).Charizard.teraType,'Water');
 assert.equal(store.view('tera').run!.teraTickets,0);
 }finally{store.close();}
});
test('tera happens before attacking, changes Tera Blast, persists through switching, consumes only one team ticket',async()=>{
 const session=new BattleSession(async()=>{},[1,2,3,4],{teams:teams(),teraTickets:{p1:2,p2:0}});
 try{
 const before=await session.ready();assert.ok(before.actions.some(a=>a.command==='move 3 terastallize'));
 const after=await session.submit(before.id,before.requestId,'move 3 terastallize');
 assert.equal(after.team[0].terastallized,'Water');assert.equal(after.teraTickets,1);
 assert.equal(after.movePP![2].type,'Water');assert.equal(after.movePP![2].power,80);
 const tera=after.messages.findIndex(l=>l.startsWith('|-terastallize|p1'));
 assert.ok(tera>=0);assert.ok(after.messages.slice(tera).some(l=>l.startsWith('|move|p1a: Charizard|Tera Blast|')));
 assert.ok(!after.actions.some(a=>a.command.endsWith(' terastallize')));
 const frames=presentationFrames(before,after);
 assert.deepEqual(frames.flatMap(f=>f.motion?.kind.startsWith('tera-')?[f.motion.kind]:[]),['tera-charge','tera-shell','tera-burst','tera-reveal']);
 assert.ok(frames.findIndex(f=>f.motion?.kind==='tera-reveal')<frames.findIndex(f=>f.motion?.kind==='move'&&f.motion.side==='player'));
 const switched=await session.submit(after.id,after.requestId,'switch 2');
 assert.equal(switched.team.find(p=>p.species==='Charizard')!.terastallized,'Water');assert.ok(!switched.actions.some(a=>a.command.endsWith(' terastallize')));
 }finally{await session.dispose();}
});
test('mega and dynamax block tera on that Pokemon, while an ordinary teammate can use it; tera blocks overlapping transformations',async()=>{
 for(const item of ['Charizardite X','Dynamax Band']){
 const session=new BattleSession(async()=>{},[1,2,3,4],{teams:teams(item),teraTickets:{p1:1,p2:0}});
 try{
 let v=await session.ready();assert.ok(v.actions.some(a=>a.command.endsWith(' terastallize')));
 v=await session.submit(v.id,v.requestId,'move 2 '+(item==='Dynamax Band'?'dynamax':'mega'));
 assert.ok(!v.actions.some(a=>a.command.endsWith(' terastallize')));
 if(item==='Dynamax Band'){
  for(let turn=0;turn<2;turn++)v=await session.submit(v.id,v.requestId,'move 2');
  assert.equal(v.team.find(p=>p.active)!.dynamax,false);
  assert.ok(v.actions.some(a=>a.command.endsWith(' terastallize')),'ordinary state after dynamax may use tera');
 }
 v=await session.submit(v.id,v.requestId,'switch 2');assert.ok(v.actions.some(a=>a.command.endsWith(' terastallize')));
 }finally{await session.dispose();}
 const tera=new BattleSession(async()=>{},[1,2,3,4],{teams:teams(item),teraTickets:{p1:1,p2:0}});
 try{let v=await tera.ready();v=await tera.submit(v.id,v.requestId,'move 2 terastallize');assert.ok(!v.actions.some(a=>a.command.endsWith(' mega')||a.command.endsWith(' dynamax')));}finally{await tera.dispose();}
 }
});
test('tera changes real defensive typing: Ground hits a Water-tera Charizard that was immune before',async()=>{
 for(const enabled of [false,true]){
  const t=teams(),enemy=Showdown.Teams.unpack(packTeam(['Golem','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Earthquake']);
  const session=new BattleSession(async()=>{},[1,2,3,4],{teams:{p1:t.p1,p2:Showdown.Teams.pack(enemy)},teraTickets:{p1:1,p2:0}});
  try{const before=await session.ready(),after=await session.submit(before.id,before.requestId,'move 2'+(enabled?' terastallize':''));
   assert.equal(after.messages.some(line=>line.startsWith('|-damage|p1a: Charizard|')),enabled);
   assert.equal(after.messages.some(line=>line.startsWith('|-immune|p1a: Charizard')),!enabled);
  }finally{await session.dispose();}
 }
});
test('both sides tera once and real STAB changes damage, replay stays identical; no tickets and legacy battles reject tera',async()=>{
 const own=packTeam(['Charizard','Blastoise','Venusaur']),enemy=packTeam(['Snorlax','Shuckle','Blissey']);
 const log=await runBattle({teams:{p1:own,p2:enemy},seed:[3,4,5,6],teraTickets:{p1:3,p2:2},player:new TeraPolicy(),opponent:new TeraPolicy()});
 for(const side of ['p1','p2'])assert.equal(log.publicProtocol.filter(l=>l.startsWith('|-terastallize|'+side)).length,1);
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 for(const format of [undefined,PRE_TERA_FORMAT]){
 const s=new BattleSession(async()=>{},[1,2,3,4],{teams:teams(),format,teraTickets:format?{p1:1,p2:1}:undefined});
 try{const v=await s.ready();assert.ok(!v.actions.some(a=>a.command.endsWith(' terastallize')));assert.throws(()=>s.submit(v.id,v.requestId,'move 1 terastallize'),/選択|선택/);}finally{await s.dispose();}
 }
 const compare=async(tera:boolean)=>{const t=teams();const sets=Showdown.Teams.unpack(t.p1)!;sets[0].teraType='Fire';return runBattle({teams:{...t,p1:Showdown.Teams.pack(sets)},seed:[1,2,3,4],teraTickets:{p1:1,p2:0},player:{choose:o=>o.legalActions[0].command.startsWith('team')?'team 123':o.legalActions.find(a=>a.command==='move 1'+(tera&&o.legalActions.some(a=>a.command==='move 1 terastallize')?' terastallize':''))?.command ?? o.legalActions[0].command},opponent:new DamagePolicy()});};
 const normal=await compare(false),boost=await compare(true);
 const damage=(lines:string[])=>100-Number(lines.find(l=>l.startsWith('|-damage|p2'))!.split('|')[3].split('/')[0]);
 assert.ok(damage(boost.publicProtocol)>damage(normal.publicProtocol));
});
test('accepted tera spends a ticket atomically once, survives session reconstruction; retired ticket purchases cannot charge',async()=>{
 const store=new TowerStore(':memory:');let service=new TowerService(store);try{
 store.ensurePlayer('persist');const id=store.start('persist',['Charizard','Blastoise','Venusaur']),row=store.battle(id);
 store.db.prepare('UPDATE battles SET trainer_equipment=NULL,player_team=?,opponent_team=?,tera_tickets=? WHERE id=?').run(teams().p1,teams().p2,'{"p1":1,"p2":0}',id);
 store.db.prepare('UPDATE run_tera_tickets SET quantity=1 WHERE run_id=?').run(row.run_id);
 const before=(await service.state('persist')).battle!;
 await service.action('persist',id,before.requestId,'move 2 terastallize');assert.equal(store.view('persist').run!.teraTickets,0);
 await assert.rejects(service.action('persist',id,before.requestId,'move 2 terastallize'));
 await service.dispose();service=new TowerService(store);
 const restored=(await service.state('persist')).battle!;assert.equal(restored.team[0].terastallized,'Water');assert.equal(restored.teraTickets,0);
 await service.dispose();
 store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(row.run_id);store.db.prepare("UPDATE players SET coins=2000 WHERE id='persist'").run();
 assert.throws(()=>store.purchaseTera('persist',row.run_id,6),/테라권 판매는 종료/);assert.equal(store.view('persist').coins,2000);
 }finally{await service.dispose();store.close();}
});
