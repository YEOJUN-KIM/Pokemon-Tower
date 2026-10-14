import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {BattleSession} from '../src/server/battle-session';
import {packTeam,packPlayerTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {runBattle,type BattleLog} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {itemName,normalizeHeldItem} from '../src/data/held-items';

function setup(){
 const store=new TowerStore(':memory:');store.ensurePlayer('frisk');
 store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('frisk','Urshifu');
 const entry=store.trainingCollection('frisk').find(p=>p.species==='Urshifu')!;
 store.train('frisk','Urshifu',entry.revision,defaultProfile('Urshifu','Urshifu-Rapid-Strike'));
 const row=store.battle(store.start('frisk',['Urshifu','Blastoise','Venusaur'],'dynamax'));
 const player=packPlayerTeam(['Urshifu','Blastoise','Venusaur'],{Urshifu:defaultProfile('Urshifu','Urshifu-Rapid-Strike')},{Urshifu:'Dynamax Band'});
 store.db.prepare('UPDATE runs SET floor=40 WHERE id=?').run(row.run_id);
 store.db.prepare('UPDATE battles SET floor=40,trainer_equipment=NULL,player_team=? WHERE id=?').run(player,row.id);
 store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(row.run_id,'Urshifu','Dynamax Band');
 return {store,row:store.battle(row.id)};
}
function complete(store:TowerStore,id:string,log:BattleLog){
 store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
}

test('real Frisk disclosure keeps Rapid Strike Urshifu band after victory and out of new shop offers',async()=>{
 const {store,row}=setup();
 try{
  const opponents=Showdown.Teams.unpack(packTeam(['Gothitelle','Luvdisc','Delibird']))!;
  for(const set of opponents){set.level=1;set.moves=['Protect'];}
  opponents[0].ability='Frisk';
  const enemy=Showdown.Teams.pack(opponents);
  store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(enemy,row.id);
  const log=await runBattle({teams:{p1:row.player_team,p2:enemy},seed:JSON.parse(row.seed),rule:row.rule,upgrades:JSON.parse(row.upgrades),teraTickets:JSON.parse(row.tera_tickets),player:new DamagePolicy(),opponent:new DamagePolicy()});
  assert.equal(log.winner,'Player');
  assert.ok(log.publicProtocol.includes('|-item|p1a: Urshifu|dynamaxband|[from] ability: Frisk|[of] p2a: Gothitelle'));
  complete(store,row.id,log);complete(store,row.id,log);
  assert.equal(store.view('frisk').run!.heldItems!.Urshifu,'Dynamax Band');
  store.recruit('frisk',row.run_id,row.id,null,null);
  const run=store.view('frisk').run!;
  assert.equal(run.floor,41);assert.equal(run.heldItems!.Urshifu,'Dynamax Band');
  assert.ok(!run.itemOffers!.includes('Dynamax Band'));
  const next=store.battle(store.enter('frisk',row.run_id,41,['Urshifu','Blastoise','Venusaur']));
  assert.equal(Showdown.Teams.unpack(next.player_team)![0].item,'Dynamax Band');
 }finally{store.close();}
});

test('Frisk followed by actual Knock Off still removes the band; lowercase actual item gains are normalized',()=>{
 for(const gain of [false,true]){
  const {store,row}=setup();
  try{
   const lines=['|-item|p1a: Urshifu|dynamaxband|[from] ability: Frisk|[of] p2a: Gothitelle',gain?'|-item|p1a: Urshifu|leftovers|[from] move: Trick':'|-enditem|p1a: Urshifu|dynamaxband|[from] move: Knock Off'];
   const log:BattleLog={schemaVersion:1,engineVersion:row.engine_version,format:row.format,teams:{p1:row.player_team,p2:row.opponent_team},seed:JSON.parse(row.seed),rule:row.rule,upgrades:JSON.parse(row.upgrades),teraTickets:JSON.parse(row.tera_tickets),decisions:[],publicProtocol:lines,winner:'Player',turns:1};
   complete(store,row.id,log);
   assert.equal(store.view('frisk').run!.heldItems!.Urshifu,gain?'Leftovers':undefined);
  }finally{store.close();}
 }
});

test('Frisk raw item ID is displayed as the canonical band in the live battle view',async()=>{
 const enemy=packTeam(['Gothitelle','Luvdisc','Delibird'],{Gothitelle:{...defaultProfile('Gothitelle'),ability:'Frisk'}});
 const session=new BattleSession(async()=>{},[1,2,3,4],{rule:'dynamax',teams:{p1:packPlayerTeam(['Urshifu','Blastoise','Venusaur'],{Urshifu:defaultProfile('Urshifu','Urshifu-Rapid-Strike')},{Urshifu:'Dynamax Band'}),p2:enemy}});
 try{
  const view=await session.ready();assert.equal(view.team[0].item,'Dynamax Band');
  assert.equal(normalizeHeldItem('dynamaxband'),'Dynamax Band');assert.equal(itemName('dynamaxband'),'다이맥스밴드');
 }finally{await session.dispose();}
});
