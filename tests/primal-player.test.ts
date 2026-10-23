import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {BattleSession} from '../src/server/battle-session';
import {TowerStore} from '../src/server/tower-store';
import {packTeam} from '../src/data/teams';
import {allowsRuleItem,battleRules,type BattleRule} from '../src/data/run-rules';
import {primalOrbs} from '../src/data/primal-forms';
import {itemShopRule} from '../src/data/held-item-shop';
import {heldItems,itemIcon,itemIconExtension} from '../src/data/held-items';
import {canEquipGimmick} from '../src/data/gimmicks';
import {existsSync} from 'node:fs';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('Groudon and Kyogre have distinct selectable Primal previews with real stats and abilities',()=>{
 const entries=pokedexEntries();
 for(const [item,info] of Object.entries(primalOrbs)){
  const entry=entries.find(e=>e.species===info.species)!;assert.ok(entry.canPrimal);
  const form=entry.forms!.find(f=>f.species===info.forme)!;assert.equal(form.kind,'primal');assert.equal(form.spriteKey,info.spriteKey);
  assert.equal(form.name,info.species==='Groudon'?'원시그란돈':'원시가이오가');
  assert.equal(Object.values(form.baseStats).reduce((n,v)=>n+v,0),770);
  assert.equal(form.ability,info.species==='Groudon'?'Desolate Land':'Primordial Sea');
  assert.equal(heldItems[item as keyof typeof heldItems].price,3750);assert.equal(itemShopRule(item as keyof typeof heldItems).rarity,'legendary');
  assert.ok(canEquipGimmick(info.species,item));assert.equal(canEquipGimmick('Charizard',item),false);
  assert.ok(existsSync('public/sprites/items/'+itemIcon(item as keyof typeof heldItems)+'.'+itemIconExtension(item)));
  assert.ok(existsSync('public/vendor/pokeapi/pokemon/'+info.spriteKey+'.png'));assert.ok(existsSync('public/vendor/pokeapi/pokemon/back/'+info.spriteKey+'.png'));
 }
});

test('player orbs are restricted to Mega/Mixed rules even in forged engine teams; both Primal forms activate and replay',async()=>{
 for(const rule of Object.keys(battleRules) as BattleRule[])for(const [item,info] of Object.entries(primalOrbs)){
  const allowed=rule==='mega'||rule==='chaos';assert.equal(allowsRuleItem(rule,item),allowed);
  const log=await runBattle({rule,teams:{p1:packTeam([info.species,'Charizard','Blastoise'],{},{[info.species]:item}),p2:packTeam(['Snorlax','Shuckle','Blissey'])},player:new DamagePolicy(),opponent:new DamagePolicy(),seed:[1,2,3,4]});
  assert.equal(log.publicProtocol.some(l=>l.startsWith('|-primal|p1')),allowed,rule+' '+item);
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 }
});

test('purchases and equipment use normal inventory; Primal consumes the shared allowance and restoring history preserves it',async()=>{
 const store=new TowerStore(':memory:');let row;
 try{store.ensurePlayer('primal');for(const name of ['Groudon','Kyogre'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('primal',name);
  row=store.battle(store.start('primal',['Groudon','Kyogre','Charizard'],'chaos'));
  store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(row.run_id);store.db.prepare("UPDATE players SET coins=10000 WHERE id='primal'").run();
  store.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(row.run_id,11,'["Red Orb","Blue Orb","Leftovers","Charcoal"]');
  assert.throws(()=>store.purchaseItem('primal',row!.run_id,11,'Red Orb','Charizard'),/기믹/);assert.equal(store.view('primal').coins,10000);
  store.purchaseItem('primal',row.run_id,11,'Red Orb','Groudon');store.purchaseItem('primal',row.run_id,11,'Blue Orb','Kyogre');
  assert.equal(store.view('primal').coins,2500);assert.equal(store.view('primal').run!.heldItems!.Groudon,'Red Orb');assert.equal(store.view('primal').run!.heldItems!.Kyogre,'Blue Orb');
  row=store.battle(store.enter('primal',row.run_id,11,['Groudon','Kyogre','Charizard']));
 }finally{store.close();}
 const options={rule:'chaos' as const,aiVersion:'damage-policy-v1',teams:{p1:row.player_team,p2:packTeam(['Snorlax','Shuckle','Blissey'])},teraTickets:{p1:1,p2:0}};
 const session=new BattleSession(async()=>{},[1,2,3,4],options);
 try{let view=await session.ready();assert.equal(view.team[0].displaySpecies,'Groudon-Primal');assert.equal(view.team[0].ability,'Desolate Land');assert.ok(!view.actions.some(a=>a.command.endsWith(' terastallize')));
  view=await session.submit(view.id,view.requestId,'switch 2');assert.equal(view.team.find(p=>p.active)!.displaySpecies,'Kyogre');assert.equal(view.messages.filter(l=>l.startsWith('|-primal|p1')).length,1);
  const restored=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['switch 2']});
  try{const v=await restored.ready();assert.equal(v.team.find(p=>p.active)!.displaySpecies,'Kyogre');assert.deepEqual(battleEvents(v.messages),battleEvents(view.messages));}finally{await restored.dispose();}
  view=await session.submit(view.id,view.requestId,'switch 3');assert.ok(!view.actions.some(a=>a.command.endsWith(' mega')||a.command.endsWith(' dynamax')));
 }finally{await session.dispose();}
});
