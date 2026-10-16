import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {packTeam,starters} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {BattleSession} from '../src/server/battle-session';
import {heldItemKeys,itemIcon,heldItems,baseHeldItems,itemIconExtension} from '../src/data/held-items';
import {existsSync} from 'node:fs';
import {primalOrbs} from '../src/data/primal-forms';
function stock(store:TowerStore,run:string,floor:number,items:string[]){store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(run,floor,JSON.stringify(items));}

test('all standard shop tools are supported by the engine, have icons, and persist through purchases',()=>{
  assert.equal(Object.keys(baseHeldItems).length,57);
  const standardItems=(Object.keys(baseHeldItems) as (keyof typeof baseHeldItems)[]).filter(item=>!primalOrbs[item]);
  const store=new TowerStore(':memory:');try{
    store.ensurePlayer('catalog');const run=store.battle(store.start('catalog',starters)).run_id;
    store.db.prepare("UPDATE runs SET total_floors=50,floor=26,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=100000 WHERE id=?').run('catalog');
    for(const item of standardItems){assert.equal(Showdown.Dex.items.get(item).exists,true,item);const ext=itemIconExtension(item);assert.ok(existsSync(`public/sprites/items/${itemIcon(item)}.${ext}`),item);stock(store,run,26,[item,...heldItemKeys.filter(other=>other!==item).slice(0,3)]);store.purchaseItem('catalog',run,26,item,'Charizard');}
    const view=store.view('catalog');assert.equal(Object.keys(view.run!.itemBag!).length,standardItems.length-1);assert.equal(view.run!.heldItems!.Charizard,standardItems.at(-1));assert.equal(view.coins,100000-standardItems.reduce((sum,item)=>sum+baseHeldItems[item].price,0));
  }finally{store.close();}
});

test('Assault Vest blocks status moves and Choice Band locks the chosen attack in real requests',async()=>{
  for(const item of ['Assault Vest','Choice Band']){
    const own=Showdown.Teams.unpack(packTeam(starters,{}, {Charizard:item}))!,enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Blastoise','Venusaur']))!;
    own[0].moves=['Swords Dance','Flamethrower','Air Slash','Dragon Claw'];enemy[0].moves=['Tackle'];
    const session=new BattleSession(async()=>{},[1,2,3,4],{teams:{p1:Showdown.Teams.pack(own),p2:Showdown.Teams.pack(enemy)}});
    try{let state=await session.ready();if(item==='Assault Vest')assert.ok(!state.actions.some(action=>action.command==='move 1'));else{assert.ok(state.actions.some(action=>action.command==='move 1'));state=await session.submit(state.id,state.requestId,'move 2');assert.deepEqual(state.actions.filter(a=>a.command.startsWith('move ')).map(a=>a.command),['move 2']);}}
    finally{session.dispose();}
  }
});

test('v12 migration adds empty inventories without changing saved battle teams',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('migration');const id=store.start('migration',starters),before=store.battle(id);
    store.db.exec('DROP TABLE run_held_items; DROP TABLE run_item_bag; DROP TABLE item_purchases; PRAGMA user_version=12');
    store.close();store=new TowerStore(path);
    assert.deepEqual(store.battle(id),before);
    assert.deepEqual(store.view('migration').run!.heldItems,{});
    assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,36);
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{store.close();}
});

test('web battle inspection reveals own equipment and its consumption without leaking enemy equipment',async()=>{
  const session=new BattleSession(async()=>{},[1,2,3,4],{aiVersion:'damage-policy-v1',teams:{p1:packTeam(starters,{}, {Charizard:'Sitrus Berry'}),p2:packTeam(starters)}});
  try{
    let state=await session.ready();assert.equal(state.team[0].item,'Sitrus Berry');assert.ok(!('item' in state.opponent!));
    while(state.status==='waiting')state=await session.submit(state.id,state.requestId,state.actions[0].command);
    const charizard=state.team.find(pokemon=>pokemon.species==='Charizard')!;
    assert.equal(state.status,'complete');assert.equal(charizard.item,'');assert.equal(charizard.berryUsed,true);
  }finally{session.dispose();}
});

test('item purchases, transfers, rollback, snapshots and fresh runs preserve inventory',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('items');const run=store.battle(store.start('items',starters)).run_id;
    store.db.prepare('UPDATE players SET coins=2000 WHERE id=?').run('items');
    assert.throws(()=>store.purchaseItem('items',run,1,'Leftovers','Charizard'),/상점/);
    store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);
    stock(store,run,6,['Leftovers','Sitrus Berry','Charcoal','Miracle Seed']);
    assert.throws(()=>store.purchaseItem('other',run,6,'Leftovers','Charizard'),/찾을/);
    assert.throws(()=>store.purchaseItem('items',run,6,'Leftovers','Pikachu'),/선택/);
    store.purchaseItem('items',run,6,'Leftovers','Charizard');
    assert.equal(store.view('items').coins,1400);
    assert.throws(()=>store.purchaseItem('items',run,6,'Leftovers','Blastoise'),/보유/);
    store.purchaseItem('items',run,6,'Sitrus Berry','Charizard');
    assert.deepEqual(store.view('items').run!.itemBag, {Leftovers:1});
    store.equipItem('items',run,6,'Blastoise','Leftovers');
    assert.throws(()=>store.equipItem('items',run,6,'Venusaur','Leftovers'),/한 마리/);
    store.equipItem('items',run,6,'Charizard',null);
    assert.deepEqual(store.view('items').run!.itemBag,{'Sitrus Berry':1});
    store.close();store=new TowerStore(path);
    assert.deepEqual(store.view('items').run!.heldItems,{Blastoise:'Leftovers'});
    store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(run);
    stock(store,run,11,['Leftovers','Charcoal','Miracle Seed','Mystic Water']);
    const beforeDuplicate=store.view('items');
    assert.throws(()=>store.purchaseItem('items',run,11,'Leftovers','Venusaur'),/보유/);
    assert.deepEqual(store.view('items'),beforeDuplicate);
    store.db.prepare('UPDATE run_item_bag SET quantity=1 WHERE run_id=? AND item=?').run(run,'Leftovers');
    assert.throws(()=>store.equipItem('items',run,11,'Venusaur','Leftovers'),/한 마리/);
    assert.deepEqual(store.view('items').run!.heldItems,{Blastoise:'Leftovers'});
    store.db.prepare('DELETE FROM run_item_bag WHERE run_id=? AND item=?').run(run,'Leftovers');
    assert.throws(()=>store.purchaseItem('items',run,11,'Leftovers','Blastoise'),/보유/);
    assert.equal(store.view('items').coins,1175);
    assert.deepEqual(store.view('items').run!.itemPurchases,[]);
    store.db.prepare('UPDATE players SET coins=0 WHERE id=?').run('items');
    assert.throws(()=>store.purchaseItem('items',run,11,'Charcoal','Charizard'),/부족/);
    const battle=store.enter('items',run,11,starters);
    assert.equal(Showdown.Teams.unpack(store.battle(battle).player_team)!.find(p=>p.species==='Blastoise')!.item,'Leftovers');
    assert.throws(()=>store.equipItem('items',run,11,'Blastoise',null),/준비/);
    store.abandon('items',run);store.start('items',starters);
    assert.deepEqual(store.view('items').run!.heldItems,{});
    assert.deepEqual(store.view('items').run!.itemBag,{});
  }finally{store.close();}
});

test('berries activate once per battle and remain equipped for the next floor, while leftovers keep healing',async()=>{
  for(const item of ['Sitrus Berry','Leftovers']){
    const store=new TowerStore(':memory:');try{
      store.ensurePlayer('items');const run=store.battle(store.start('items',starters)).run_id;
      store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);
      stock(store,run,6,['Leftovers','Sitrus Berry','Charcoal','Miracle Seed']);
      store.db.prepare('UPDATE players SET coins=2000 WHERE id=?').run('items');
      store.purchaseItem('items',run,6,item,'Charizard');
      const id=store.enter('items',run,6,starters);
      const enemy=packTeam(starters);
      store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(enemy,'[1,2,3,4]',id);
      const row=store.battle(id);
      const log=await runBattle({trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams:{p1:row.player_team,p2:row.opponent_team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
      assert.ok(log.publicProtocol.some(line=>line.includes('|p1a: Charizard|') && line.includes(`item: ${item}`) && line.startsWith('|-heal|')),`${item} actually heals`);
      assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
      const view={id,status:'complete' as const,requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null};
      store.complete(id,log,view);store.complete(id,log,view);
      assert.equal(store.view('items').run!.heldItems!.Charizard,item);
      assert.deepEqual(store.view('items').run!.itemBag,{});
      if(item==='Sitrus Berry'){
        assert.equal(log.publicProtocol.filter(line=>line.startsWith('|-enditem|p1a: Charizard|Sitrus Berry|[eat]')).length,1);
        store.db.prepare("UPDATE runs SET floor=7,state='select' WHERE id=?").run(run);
        const next=store.battle(store.enter('items',run,7,starters));
        assert.equal(Showdown.Teams.unpack(next.player_team)![0].item,item);
        const again=await runBattle({trainerEquipment:next.trainer_equipment==null?undefined:JSON.parse(next.trainer_equipment),teams:{p1:next.player_team,p2:enemy},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
        assert.equal(again.publicProtocol.filter(line=>line.startsWith('|-enditem|p1a: Charizard|Sitrus Berry|[eat]')).length,1);
      }
    }finally{store.close();}
  }
});

test('type items increase matching damage and leave unrelated types unchanged',async()=>{
  for(const [species,item] of [['Charizard','Charcoal'],['Blastoise','Mystic Water'],['Venusaur','Miracle Seed']]){
    const own=[species,...starters.filter(name=>name!==species)];
    const moves:Record<string,string>={Charizard:'Flamethrower',Blastoise:'Surf',Venusaur:'Giga Drain'};
    const team=Showdown.Teams.unpack(packTeam(own))!;team[0].moves=[moves[species]];
    const play=(boost:boolean)=>{team[0].item=boost ? item : '';return runBattle({teams:{p1:Showdown.Teams.pack(team),p2:packTeam(['Snorlax','Blastoise','Charizard'])},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});};
    const plain=await play(false),boost=await play(true);
    const hp=(log:typeof plain)=>Number(log.publicProtocol.find(line=>line.startsWith('|-damage|p2a:'))!.split('|')[3].split('/')[0]);
    assert.ok(hp(boost)<hp(plain),`${item} boosts ${moves[species]}`);
    team[0].moves=['Tackle'];
    if(species==='Venusaur')assert.deepEqual(battleEvents((await play(false)).publicProtocol),battleEvents((await play(true)).publicProtocol));
  }
});

test('Recycle cannot activate the same Pokemon berry twice in one battle',async()=>{
  const own=Showdown.Teams.unpack(packTeam(['Snorlax','Blastoise','Venusaur'],{},{Snorlax:'Sitrus Berry'}))!;
  own[0].moves=['Recycle'];
  const fallback=new DamagePolicy();
  const log=await runBattle({teams:{p1:Showdown.Teams.pack(own),p2:packTeam(starters)},seed:[1,2,3,4],player:{choose:ob=>ob.legalActions.find(action=>action.label==='Recycle')?.command ?? fallback.choose(ob)},opponent:new DamagePolicy()});
  assert.ok(log.publicProtocol.some(line=>line.startsWith('|-item|p1a: Snorlax|Sitrus Berry')),'berry is actually recovered by Recycle');
  assert.equal(log.publicProtocol.filter(line=>line.startsWith('|-enditem|p1a: Snorlax|Sitrus Berry|[eat]')).length,1);
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
