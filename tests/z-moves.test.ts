import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {randomUUID} from 'node:crypto';
import {BattleSession} from '../src/server/battle-session';
import {TowerStore} from '../src/server/tower-store';
import {defaultProfile} from '../src/server/training';
import {packTeam,starters} from '../src/data/teams';
import {zCrystals} from '../src/data/z-crystals';
import {canEquipGimmick} from '../src/data/gimmicks';
import {allowsRuleItem} from '../src/data/run-rules';
import {heldItems,itemIcon,itemIconExtension,type HeldItem} from '../src/data/held-items';
import {itemShopRule} from '../src/data/held-item-shop';
import {presentationFrames} from '../src/web/battle-presentation';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {ZMovePolicy} from '../src/battle/z-move-policy';
import {DatabaseSync} from 'node:sqlite';

test('18 type crystals and 17 signature crystals include Ultra Burst equipment',()=>{
  assert.equal(Object.values(zCrystals).filter(c=>!c.from).length,18);
  assert.equal(Object.values(zCrystals).filter(c=>c.from).length,17);
  for(const item of Object.keys(zCrystals) as HeldItem[]){const c=zCrystals[item];
    const native=Showdown.Dex.items.get(item);assert.ok(native.zMove);
    assert.equal(c.price,item==='Ultranecrozium Z'?5000:3000);assert.equal(heldItems[item].consumable,false);
    assert.equal(itemShopRule(item).rarity,'legendary');assert.equal(itemIcon(item),item.toLowerCase().replaceAll(' ','-'));assert.equal(itemIconExtension(item),'png');
    assert.equal(allowsRuleItem('basic',item),false);assert.equal(allowsRuleItem('z',item),true);assert.equal(allowsRuleItem('chaos',item),true);
    assert.deepEqual(c.users,item==='Ultranecrozium Z'?['Necrozma-Dusk-Mane','Necrozma-Dawn-Wings','Necrozma-Ultra']:native.itemUser);
  }
  assert.equal(canEquipGimmick('Decidueye','Decidium Z'),true);assert.equal(canEquipGimmick('Charizard','Decidium Z'),false);
});

test('attack Z uses correct power/category, consumes one team use and base PP, and restores from history',async()=>{
  const own={...defaultProfile('Charizard'),moves:['Flamethrower','Protect']};
  const enemy={...defaultProfile('Snorlax'),moves:['Protect']};
  const options={rule:'z' as const,aiVersion:'damage-policy-v1',teams:{p1:packTeam(starters,{Charizard:own},{Charizard:'Firium Z',Blastoise:'Waterium Z'}),p2:packTeam(['Snorlax','Blastoise','Venusaur'],{Snorlax:enemy})}};
  const session=new BattleSession(async()=>{},[1,2,3,4],options);
  try{
    const before=await session.ready();assert.equal(before.status,'waiting');
    assert.equal(before.zMovePP?.[0]?.power,175);assert.equal(before.zMovePP?.[0]?.category,'Special');assert.equal(before.zMovePP?.[1],null);
    const after=await session.submit(before.id,before.requestId,'move 1 zmove');
    assert.ok(after.messages.some(line=>line.startsWith('|-zpower|p1a: Charizard')));
    assert.ok(after.messages.some(line=>line.includes('|Inferno Overdrive|')));
    assert.ok(after.messages.some(line=>line.startsWith('|-zbroken|')));
    assert.equal(after.movePP?.[0].pp,before.movePP![0].pp-1);
    assert.equal(after.actions.some(a=>a.command.endsWith(' zmove')),false);
    const frames=presentationFrames(before,after);
    assert.ok(frames.findIndex(f=>f.motion?.kind==='z-charge')<frames.findIndex(f=>f.motion?.kind==='move'&&f.motion.side==='player'));
    const switched=await session.submit(after.id,after.requestId,'switch 2');
    assert.equal(switched.actions.some(a=>a.command.endsWith(' zmove')),false);
    const restored=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1 zmove','switch 2']});
    try{const v=await restored.ready();assert.equal(v.status,'waiting');assert.equal(v.actions.some(a=>a.command.endsWith(' zmove')),false);assert.equal(v.messages.filter(l=>l.startsWith('|-zpower|p1')).length,1);}finally{await restored.dispose();}
  }finally{await session.dispose();}
});

test('status Z boosts and signature Z are selected only for matching crystal/move/species',async()=>{
  for(const [name,item,moves,label,category,power] of [
    ['Charizard','Normalium Z',['Swords Dance','Protect'],'Z-Swords Dance','Status',0],
    ['Decidueye','Decidium Z',['Spirit Shackle','Protect'],'Sinister Arrow Raid','Physical',180],
  ] as const){
    const profile={...defaultProfile(name),moves:[...moves]};
    const session=new BattleSession(async()=>{},[1,2,3,4],{rule:'z',teams:{p1:packTeam([name,'Blastoise','Venusaur'],{[name]:profile},{[name]:item}),p2:packTeam(['Snorlax','Blastoise','Venusaur'])},aiVersion:'damage-policy-v1'});
    try{const before=await session.ready();assert.equal(before.zMovePP?.[0]?.name,label);assert.equal(before.zMovePP?.[0]?.category,category);assert.equal(before.zMovePP?.[0]?.power,power);const after=await session.submit(before.id,before.requestId,'move 1 zmove');assert.ok(after.messages.some(l=>l.startsWith('|-zpower|')));if(category==='Status')assert.ok(after.messages.some(l=>l.includes('|-boost|p1a: Charizard|atk|2')));}finally{await session.dispose();}
  }
});

test('rule, PP and missing matching moves prevent forged Z commands; crystal blocks Tera stacking',async()=>{
  for(const rule of ['basic','mega','dynamax','tera','z','chaos'] as const){
    const profile={...defaultProfile('Charizard'),moves:['Flamethrower','Protect']};
    const session=new BattleSession(async()=>{},[1,2,3,4],{rule,teams:{p1:packTeam(starters,{Charizard:profile},{Charizard:'Firium Z'}),p2:packTeam(['Snorlax','Blastoise','Venusaur'])},teraTickets:{p1:1,p2:1}});
    try{const view=await session.ready();assert.equal(view.actions.some(a=>a.command.endsWith(' zmove')),rule==='z'||rule==='chaos');assert.equal(view.actions.some(a=>a.command.endsWith(' terastallize')),false);assert.throws(()=>session.submit(view.id,view.requestId,'move 2 zmove'),/선택/);}finally{await session.dispose();}
  }
});

test('crystal purchases/equipment persist; v26 rule migration preserves old saves',()=>{
  const file=`.data/tests/z-${randomUUID()}.sqlite`;let store=new TowerStore(file);
  try{
    store.ensurePlayer('z');const row=store.battle(store.start('z',starters,'z'));
    store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(row.run_id);store.db.prepare("UPDATE players SET coins=4000 WHERE id='z'").run();store.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(row.run_id,11,'["Firium Z"]');
    store.purchaseItem('z',row.run_id,11,'Firium Z','Charizard');assert.equal(store.view('z').coins,1750);
    store.close();store=new TowerStore(file);assert.equal(store.view('z').run?.heldItems?.Charizard,'Firium Z');
    const packed=store.battle(store.enter('z',row.run_id,11,starters));assert.equal(packed.rule,'z');assert.equal(Showdown.Teams.unpack(packed.player_team)![0].item,'Firium Z');
    store.db.prepare("UPDATE run_rules SET rule='basic'").run();store.close();
    const db=new DatabaseSync(file);db.exec("PRAGMA foreign_keys=OFF; CREATE TABLE old_rules(run_id TEXT PRIMARY KEY REFERENCES runs(id),rule TEXT NOT NULL CHECK(rule IN ('basic','mega','dynamax','tera','chaos'))) STRICT; INSERT INTO old_rules SELECT * FROM run_rules; DROP TABLE run_rules; ALTER TABLE old_rules RENAME TO run_rules; PRAGMA user_version=26;");db.close();
    store=new TowerStore(file);assert.equal(store.view('z').run?.rule,'basic');assert.equal(store.db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');assert.equal(store.db.prepare('PRAGMA foreign_key_check').all().length,0);store.ensurePlayer('new-z');assert.equal(store.battle(store.start('new-z',starters,'z')).rule,'z');
  }finally{store.close();}
});

test('Z-enabled AI uses legal Z attacks and saved battles replay identically',async()=>{
  const profile={...defaultProfile('Charizard'),moves:['Flamethrower']};
  const teams={p1:packTeam(starters,{Charizard:profile},{Charizard:'Firium Z'}),p2:packTeam(['Venusaur','Blastoise','Snorlax'],{},{Venusaur:'Grassium Z'})};
  const log=await runBattle({rule:'z',teams,seed:[1,2,3,4],player:new ZMovePolicy(),opponent:new DamagePolicy()});
  assert.ok(log.decisions.some(d=>d.action.endsWith(' zmove')));
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
