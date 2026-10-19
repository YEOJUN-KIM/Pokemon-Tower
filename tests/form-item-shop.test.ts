import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {shopChoiceGroups,shopProductKeys,rollShopProducts,shopProductEligible} from '../src/data/shop-products';
import {formItems,heldForm} from '../src/data/form-items';
import {heldItems} from '../src/data/held-items';
import {itemCategory} from '../src/data/held-item-shop';
import {packTeam} from '../src/data/teams';
import {canEquipGimmick} from '../src/data/gimmicks';
import {defaultProfile} from '../src/server/training';
import {BattleSession} from '../src/server/battle-session';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {pokemonImageSources} from '../src/web/pokemon-image';
import {species as catalog} from '../src/data/pokemon-catalog';
import {existsSync} from 'node:fs';

function fixture(species='Ogerpon',path=':memory:'){
 const store=new TowerStore(path),owner='form-shop';store.ensurePlayer(owner);store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,species);
 const row=store.battle(store.start(owner,[species,'Blastoise','Venusaur'],'chaos'));
 store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(row.run_id);store.db.prepare('UPDATE players SET coins=100000 WHERE id=?').run(owner);
 const offer=(product:string)=>store.db.prepare('INSERT INTO item_shops VALUES (?,?,?) ON CONFLICT(run_id,floor) DO UPDATE SET offers=excluded.offers').run(row.run_id,6,JSON.stringify([product,'Leftovers','Sitrus Berry','Life Orb']));
 return {store,owner,id:row.run_id,offer};
}
test('choice groups are one pool product, fixed price, reusable until every real item is owned',()=>{
 for(const group of Object.values(shopChoiceGroups)){
  assert.equal(shopProductKeys.filter(id=>id===group.id).length,1);
  for(const item of group.options){assert.ok(!shopProductKeys.includes(item));assert.equal(heldItems[item].price,group.price);assert.equal(itemCategory(item),'special-form');}
  assert.equal(rollShopProducts(5,()=>0,item=>group.options.includes(item))[0],group.id);
  const owned=new Set(group.options.slice(0,-1));assert.ok(shopProductEligible(group.id,item=>!owned.has(item)));owned.add(group.options.at(-1)!);assert.ok(!shopProductEligible(group.id,item=>!owned.has(item)));
 }
 // Additional options never create additional draw tickets in the same family.
 const offers=Array.from({length:20},(_,i)=>rollShopProducts(30,()=>i/20,()=>true));assert.ok(offers.every(a=>a.length===4&&new Set(a).size===4));
});
test('choice payment, equipped ownership, rollback, retry safety and refreshed groups use actual items only',()=>{
 const f=fixture();try{
  f.offer('choice:ogerpon');const before=f.store.view(f.owner).coins;assert.equal(f.store.view(f.owner).coins,before,'view/cancel does not debit');
  f.store.purchaseItem(f.owner,f.id,6,'Hearthflame Mask',null,0,'choice:ogerpon');
  assert.equal(f.store.view(f.owner).coins,before-5000);assert.equal(f.store.view(f.owner).run!.itemBag!['Hearthflame Mask'],1);assert.ok(!f.store.view(f.owner).run!.itemBag!['choice:ogerpon']);
  f.store.purchaseItem(f.owner,f.id,6,'Hearthflame Mask',null,0,'choice:ogerpon');assert.equal(f.store.view(f.owner).coins,before-5000);
  assert.throws(()=>f.store.purchaseItem(f.owner,f.id,6,'Wellspring Mask',null,0,'choice:ogerpon'),/다른 아이템/);
  f.store.equipItem(f.owner,f.id,6,'Ogerpon','Hearthflame Mask');assert.equal(f.store.view(f.owner).run!.partnerForms!.Ogerpon,'Ogerpon-Hearthflame');
  f.store.db.prepare('INSERT INTO shop_rerolls VALUES (?,?,?,?)').run(f.id,6,'items',1);f.offer('choice:ogerpon');
  assert.throws(()=>f.store.purchaseItem(f.owner,f.id,6,'Hearthflame Mask',null,1,'choice:ogerpon'),/보유/);
  assert.throws(()=>f.store.purchaseItem(f.owner,f.id,6,'Charizardite X',null,1,'choice:ogerpon'),/실제 아이템/);
  assert.throws(()=>f.store.purchaseItem(f.owner,f.id,6,'Wellspring Mask','Venusaur',1,'choice:ogerpon'),/맞는 기믹/);assert.equal(f.store.view(f.owner).coins,before-5000);assert.ok(!f.store.view(f.owner).run!.itemBag!['Wellspring Mask']);
  f.store.purchaseItem(f.owner,f.id,6,'Wellspring Mask',null,1,'choice:ogerpon');f.store.equipItem(f.owner,f.id,6,'Ogerpon','Wellspring Mask');
  assert.equal(f.store.view(f.owner).run!.partnerForms!.Ogerpon,'Ogerpon-Wellspring');assert.equal(f.store.view(f.owner).run!.itemBag!['Hearthflame Mask'],1);
  f.store.equipItem(f.owner,f.id,6,'Ogerpon',null);assert.equal(f.store.view(f.owner).run!.partnerForms!.Ogerpon,undefined);
 }finally{f.store.close();}
});
test('all registered held forms normalize before packing, reject wrong holders and return to base on removal',()=>{
 for(const [item,data] of Object.entries(formItems)){
  if(!data.forme)continue;assert.equal(canEquipGimmick(data.species,item),true);assert.equal(canEquipGimmick('Blastoise',item),false);
  const set=Showdown.Teams.unpack(packTeam([data.species,'Blastoise','Venusaur'],{},{[data.species]:item}))![0];assert.equal(set.species,data.forme,item);assert.equal(set.item,item);
  assert.equal(Showdown.Teams.unpack(packTeam([data.species,'Blastoise','Venusaur']))![0].species,data.species);
  assert.equal(heldForm(data.forme,null),data.species);
  const proxy={...set,pokeball:'',gender:'',evs:{hp:1,atk:0,def:0,spa:0,spd:0,spe:0}};assert.equal(new Showdown.TeamValidator(FORMAT).validateSet(proxy,{}),null,item);
 }
 assert.ok(canEquipGimmick('Necrozma','Ultranecrozium Z','Necrozma-Dusk-Mane'));assert.ok(!canEquipGimmick('Necrozma','Ultranecrozium Z'));
});
test('all held forms reach real UI snapshots, typed signature moves and distinct local sprites',async()=>{
 for(const [item,data] of Object.entries(formItems)){
  if(!data.forme)continue;
  const move=({Arceus:'Judgment',Silvally:'Multi-Attack',Genesect:'Techno Blast'} as Record<string,string>)[data.species],profile=defaultProfile(data.species);if(move)profile.moves=[move];
  const session=new BattleSession(async()=>{},[1,2,3,4],{teams:{p1:packTeam([data.species,'Blastoise','Venusaur'],{[data.species]:profile},{[data.species]:item}),p2:packTeam(['Luvdisc','Unown','Delibird'])}});
  try{const v=await session.ready();assert.equal(v.status,'waiting',item);assert.equal(v.team[0].displaySpecies,data.forme,item);assert.deepEqual(v.team[0].types,Showdown.Dex.species.get(data.forme).types,item);if(move){const native=Showdown.Dex.items.get(item);assert.equal(v.movePP![0].type,native.onPlate??native.onMemory??native.onDrive);}
   const c=catalog[data.forme];assert.ok(c);for(const back of [false,true])assert.ok(pokemonImageSources(c.id,back,true,c.spriteKey).some(p=>existsSync('public'+p)),data.forme);
  }finally{await session.dispose();}
 }
 const stale={...defaultProfile('Arceus'),forme:'Arceus-Fire',ability:'Multitype'};assert.equal(Showdown.Teams.unpack(packTeam(['Arceus','Blastoise','Venusaur'],{Arceus:stale}))![0].species,'Arceus');
});
test('equipment swaps and save/reload preserve held forms without granting masks on a new run',()=>{
 const path=`.data/tests/equipment-${randomUUID()}.sqlite`,f=fixture('Ogerpon',path);try{
  f.store.db.prepare('INSERT INTO run_item_bag VALUES (?,?,1)').run(f.id,'Hearthflame Mask');f.store.equipItem(f.owner,f.id,6,'Ogerpon','Hearthflame Mask');
  f.store.close();const reopened=new TowerStore(path);try{assert.equal(reopened.view(f.owner).run!.partnerForms!.Ogerpon,'Ogerpon-Hearthflame');reopened.equipItem(f.owner,f.id,6,'Ogerpon',null);assert.equal(reopened.view(f.owner).run!.partnerForms!.Ogerpon,undefined);reopened.abandon(f.owner,f.id);const row=reopened.battle(reopened.start(f.owner,['Ogerpon','Blastoise','Venusaur'],'chaos'));assert.equal(Showdown.Teams.unpack(row.player_team)![0].species,'Ogerpon');assert.equal(Showdown.Teams.unpack(row.player_team)![0].item,'');}finally{reopened.close();}
 }finally{try{f.store.close();}catch{}}
});
test('Rayquaza, Zygarde and fused Necrozma use native transformations, with legal actions and replay',async()=>{
 for(const [base,form,item,move,command,forme] of [
  ['Rayquaza','Rayquaza-Mega','','Dragon Ascent','mega',undefined],
  ['Zygarde','Zygarde-Mega','Zygardite','Thousand Arrows','mega',undefined],
  ['Necrozma','Necrozma-Ultra','Ultranecrozium Z','Photon Geyser','ultra','Necrozma-Dusk-Mane'],
  ['Necrozma','Necrozma-Ultra','Ultranecrozium Z','Photon Geyser','ultra','Necrozma-Dawn-Wings'],
 ] as const){
  const profile=defaultProfile(base,forme);profile.moves=[move,base==='Zygarde'?'Coil':'Protect'];const enemy=Showdown.Teams.unpack(packTeam(['Blastoise','Venusaur','Snorlax']))!;for(const p of enemy)p.moves=['Protect'];if(base==='Zygarde')enemy[0].moves=['Seismic Toss'];
  const teams={p1:packTeam([base,'Blastoise','Venusaur'],{[base]:profile},item?{[base]:item}:{}),p2:Showdown.Teams.pack(enemy)};
  let saved:Awaited<ReturnType<typeof runBattle>>|undefined;const session=new BattleSession(async log=>{saved=log;},[1,2,3,4],{rule:'chaos',trainerEquipment:['Tera Orb'],teams});
  try{let before=await session.ready();if(base==='Zygarde'){assert.ok(!before.actions.some(a=>a.command.endsWith(' mega')),'Complete forme is required');for(let i=0;i<4&&!before.actions.some(a=>a.command.endsWith(' mega'));i++)before=await session.submit(before.id,before.requestId,'move 2');assert.equal(before.team[0].displaySpecies,'Zygarde-Complete');}assert.ok(before.actions.some(a=>a.command===`move 2 ${command}`),form);const after=await session.submit(before.id,before.requestId,`move 2 ${command}`);assert.equal(after.team[0].displaySpecies,form);assert.equal(after.team[0].ability,Showdown.Dex.species.get(form).abilities[0]);assert.ok(!after.actions.some(a=>a.command.endsWith(' '+command)));if(command==='ultra')assert.ok(after.actions.some(a=>a.command.endsWith(' zmove')),'Ultra permits its native signature Z move');}finally{await session.dispose();}
  // A complete native battle independently validates replay and NPC use.
  const log=await runBattle({teams,rule:'chaos',player:{choose:o=>{const a=new DamagePolicy().choose(o);return o.legalActions.find(x=>x.command===a+' '+command)?.command??a;}},opponent:new DamagePolicy()});assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 }
});
