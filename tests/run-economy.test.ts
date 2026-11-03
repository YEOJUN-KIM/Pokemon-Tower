import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam,pokemonSets} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {upgrades} from '../src/data/shop';
import {heldItems} from '../src/data/held-items';
import {SHOP_CARD_COUNT,SCOUT_COUNT,supportCatalog,supportPrice,scoutPrices,scoutRerollPrice,scoutGroupWeights,scoutGroups,abilitySupport,FIRST_GIMMICK_FLOOR,SCOUT_REROLL_BASE} from '../src/data/run-economy';
import {rollScoutDraws,scoutPools,scoutGroup} from '../src/data/scout';
import {ScoutShop} from '../src/server/scout-shop';
import {simulate} from '../scripts/simulate-scout-rarity';

function shop(floor=11,coins=100000){
  const store=new TowerStore(':memory:');store.ensurePlayer('p');const id=store.battle(store.start('p',starters)).run_id;
  store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);store.db.prepare('UPDATE players SET coins=? WHERE id=?').run(coins,'p');
  return {store,id};
}
const view=(store:TowerStore)=>store.view('p').run!;

test('shop shows three tabs worth of data: 4 held items, 4 support cards, 4 scout candidates and no TM shop',()=>{
  const {store}=shop(11);try{
    const run=view(store);
    assert.equal(run.itemOffers!.length,SHOP_CARD_COUNT);assert.equal(run.consumableOffers!.length,SHOP_CARD_COUNT);assert.equal(run.scoutShop!.offers.length,SCOUT_COUNT);
    assert.equal(run.machineShop,null);
    assert.deepEqual(run.scoutShop,view(store).scoutShop);assert.deepEqual(run.consumableOffers,view(store).consumableOffers);
  }finally{store.close();}
});

test('support cards are tactical battle items: no healing, tiers unlock by floor, prices come from the table',()=>{
  for(const [kind,entry] of Object.entries(supportCatalog)){assert.ok(Object.hasOwn(upgrades,kind),kind);assert.ok(entry.price>0);assert.ok(!/potion|heal|revive/i.test(kind));}
  const early=shop(6);try{
    for(const kind of view(early.store).consumableOffers!)assert.equal(supportCatalog[kind].tier,'basic');
  }finally{early.store.close();}
  const late=shop(91);try{
    const offers=view(late.store).consumableOffers!;assert.equal(new Set(offers).size,4);
    const kind=offers[0],coins=late.store.view('p').coins;late.store.purchase('p',late.id,91,kind);
    assert.equal(late.store.view('p').coins,coins-supportPrice(kind));assert.equal(view(late.store).battleItems![kind],1);
    const missing=Object.keys(upgrades).find(k=>!offers.includes(k as never))!;assert.throws(()=>late.store.purchase('p',late.id,91,missing),/판매 중/);
    late.store.db.prepare('UPDATE players SET coins=0 WHERE id=?').run('p');assert.throws(()=>late.store.purchase('p',late.id,91,offers[1]),/부족/);
  }finally{late.store.close();}
  const tiers=new Set<string>();
  for(let i=0;i<40;i++){const s=shop(61);try{for(const k of view(s.store).consumableOffers!)tiers.add(supportCatalog[k].tier);}finally{s.store.close();}}
  assert.deepEqual([...tiers].sort(),['advanced','basic','special']);
});

const team=(move:string)=>{const sets=Showdown.Teams.unpack(packTeam(['Garchomp','Gyarados','Golem']))!;sets[0].moves=[move];return Showdown.Teams.pack(sets);};
async function levitateBattle(kind?:keyof typeof abilitySupport){
  let used=false;const attack=new DamagePolicy(),offered:string[][]=[];
  return runBattle({teams:{p1:team('Earthquake'),p2:team('Earthquake')},seed:[3,2,1,4],battleItems:kind?{[kind]:2}:{},player:{choose:o=>{
    if(o.legalActions[0]?.command.startsWith('team '))return attack.choose(o);
    offered.push(o.legalActions.filter(a=>a.command.startsWith('item ')).map(a=>a.command));
    if(kind&&!used){used=true;return 'item '+kind;}
    return attack.choose(o);
  }},opponent:attack}).then(log=>({log,offered}));
}
const hitByQuake=(protocol:string[])=>protocol.some(l=>l.startsWith('|-damage|p1a:')&&!l.includes('[from]'));

test('ability support is a one-battle modifier: grants the effect, stacks once, replays exactly and vanishes afterwards',async()=>{
  const plain=await levitateBattle(),lent=await levitateBattle('abilityLevitate');
  assert.ok(hitByQuake(plain.log.publicProtocol));
  assert.ok(lent.log.publicProtocol.some(l=>l.startsWith('|-immune|p1a:')||l.includes('Levitate')));
  // After use the lead holds an ability support: no second one is offered for it.
  assert.ok(lent.offered[0].includes('item abilityLevitate'));assert.ok(!lent.offered.slice(1,2).flat().some(c=>c==='item abilityLevitate'));
  assert.deepEqual(battleEvents((await replayBattle(lent.log)).publicProtocol),battleEvents(lent.log.publicProtocol));
  const after=await levitateBattle();assert.deepEqual(battleEvents(after.log.publicProtocol),battleEvents(plain.log.publicProtocol));
  assert.ok(Showdown.Dex.abilities.get('Levitate').exists);
  for(const entry of Object.values(abilitySupport))assert.ok(Showdown.Dex.abilities.get(entry.ability).exists);
});

test('scout rarity: unique species, floor-gated groups, prices from the table and the 100F restricted target',()=>{
  const pools=scoutPools();for(const g of scoutGroups)assert.ok(pools[g].length>0,g);
  for(const g of scoutGroups)for(const name of pools[g].slice(0,5))assert.equal(scoutGroup(name),g);
  let n=0;const random=()=>{n=(n*1664525+1013904223)%4294967296;return n/4294967296;};
  for(let i=0;i<500;i++){
    const early=rollScoutDraws(10,random);assert.equal(new Set(early.map(d=>d.species)).size,SCOUT_COUNT);
    for(const d of early){assert.ok(['common','strong','pseudo','paradox'].includes(d.group),d.group);assert.equal(d.price,scoutPrices[d.group]);}
  }
  assert.equal(scoutGroupWeights(10).restricted,0);assert.equal(scoutGroupWeights(10).mythical,0);assert.ok(scoutGroupWeights(90).restricted>scoutGroupWeights(60).restricted);
  const late=new Set<string>();for(let i=0;i<4000;i++)for(const d of rollScoutDraws(90,random))late.add(d.group);
  assert.ok(late.has('restricted')&&late.has('mythical'));
  const result=simulate(4000,0);assert.ok(result.perRunAtLeastOne.restricted>=0.28&&result.perRunAtLeastOne.restricted<=0.38,String(result.perRunAtLeastOne.restricted));
});

test('scout offers persist, never repeat the roster, and reroll replaces all four for a growing price',()=>{
  const {store,id}=shop(21,50000);try{
    const first=view(store).scoutShop!;assert.equal(first.rerollPrice,scoutRerollPrice(0));assert.equal(first.rerollPrice,SCOUT_REROLL_BASE);
    for(const o of first.offers){assert.ok(!starters.includes(o.species));assert.equal(o.price,scoutPrices[o.group]);assert.ok(!o.purchased);}
    assert.deepEqual(store.view('p').run!.scoutShop,first);
    let coins=store.view('p').coins;store.rerollShop('p',id,21,'scout',0);
    const second=view(store).scoutShop!;assert.equal(second.revision,1);assert.equal(store.view('p').coins,coins-SCOUT_REROLL_BASE);assert.equal(second.rerollPrice,scoutRerollPrice(1));assert.ok(scoutRerollPrice(1)>SCOUT_REROLL_BASE);
    assert.notDeepEqual(second.offers.map(o=>o.species),first.offers.map(o=>o.species));assert.equal(new Set(second.offers.map(o=>o.species)).size,SCOUT_COUNT);
    assert.throws(()=>store.rerollShop('p',id,21,'scout',0),/변경/);
    coins=store.view('p').coins;for(let i=1;i<4;i++)store.rerollShop('p',id,21,'scout',i);assert.equal(store.view('p').coins,coins-[1,2,3].reduce((s,n)=>s+scoutRerollPrice(n),0));
    store.db.prepare('UPDATE players SET coins=0 WHERE id=?').run('p');assert.throws(()=>store.rerollShop('p',id,21,'scout',4),/부족/);assert.equal(view(store).scoutShop!.revision,4);
    store.db.prepare("UPDATE runs SET floor=31 WHERE id=?").run(id);assert.equal(view(store).scoutShop!.revision,0);
  }finally{store.close();}
});

test('scout purchase: joins a free slot, charges once, keeps shiny, and persists after restart',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('p');const id=store.battle(store.start('p',starters)).run_id;store.db.prepare("UPDATE runs SET floor=21,state='select' WHERE id=?").run(id);store.db.prepare('UPDATE players SET coins=50000 WHERE id=?').run('p');
    const offer=view(store).scoutShop!.offers[0];
    // Pin the candidate as shiny: a rendered offer never re-rolls, the saved value is what is bought.
    const saved=new ScoutShop(store.db).saved(id,21)!;saved.offers[0].shiny=true;store.db.prepare('UPDATE scout_shops SET offers=? WHERE run_id=?').run(JSON.stringify(saved.offers),id);
    assert.equal(view(store).scoutShop!.offers[0].shiny,true);
    assert.throws(()=>store.purchaseScout('p',id,21,offer.species,starters[0],0),/빈자리/);assert.throws(()=>store.purchaseScout('p',id,21,'Missingno',null,0),/후보/);assert.throws(()=>store.purchaseScout('p',id,21,offer.species,null,9),/변경/);
    store.purchaseScout('p',id,21,offer.species,null,0);
    assert.equal(store.view('p').coins,50000-offer.price);assert.deepEqual(view(store).roster,[...starters,offer.species]);assert.equal(view(store).scoutShop!.offers[0].purchased,true);
    assert.throws(()=>store.purchaseScout('p',id,21,offer.species,null,0),/이미/);assert.equal(store.view('p').coins,50000-offer.price);
    assert.ok(store.view('p').unlocked.includes(offer.species));
    const profile=store.trainingCollection('p').find(e=>e.species===offer.species)!.profile;assert.equal(profile.shiny,true);
    store.close();store=new TowerStore(path);
    assert.equal(store.trainingCollection('p').find(e=>e.species===offer.species)!.profile.shiny,true);assert.equal(view(store).scoutShop!.offers[0].purchased,true);assert.deepEqual(view(store).roster,[...starters,offer.species]);
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{store.close();}
});

test('scout purchase with a full party needs a replacement and is separate from post-battle recruitment',()=>{
  const {store,id}=shop(21,50000);
  try{
    ['Pikachu','Snorlax','Gengar'].forEach((name,index)=>store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(id,3+index,name));
    const run=view(store);assert.equal(run.roster.length,6);const offer=run.scoutShop!.offers[1];
    assert.throws(()=>store.purchaseScout('p',id,21,offer.species,null,0),/교체/);assert.throws(()=>store.purchaseScout('p',id,21,offer.species,'Mew',0),/교체/);assert.equal(store.view('p').coins,50000);
    store.purchaseScout('p',id,21,offer.species,'Snorlax',0);
    assert.equal(view(store).roster.length,6);assert.ok(view(store).roster.includes(offer.species));assert.ok(!view(store).roster.includes('Snorlax'));assert.equal(store.view('p').coins,50000-offer.price);
    assert.equal(view(store).state,'select');assert.deepEqual(view(store).candidates,[]);
  }finally{store.close();}
});

test('shiny scout charm: higher charm levels raise the scout shiny rate and the draw is stored with the offer',()=>{
  const count=(level:number)=>{
    const {store,id}=shop(51,0);try{
      if(level)store.db.prepare("INSERT INTO permanent_research VALUES ('p','shinyCharm',?)").run(level);
      let shiny=0;const scout=new ScoutShop(store.db);
      for(let i=0;i<2500;i++){const state=i?scout.reroll(id,51,starters,level):scout.state(id,51,starters,level);shiny+=state.offers.filter(o=>o.shiny).length;}
      assert.deepEqual(scout.saved(id,51)!.offers.map(o=>o.shiny),scout.saved(id,51)!.offers.map(o=>o.shiny));
      if(level)assert.equal(view(store).scoutShop!.offers.length,SCOUT_COUNT);
      return shiny;
    }finally{store.close();}
  };
  const none=count(0),max=count(5);assert.ok(max>25,String(max));assert.ok(max>none*2,`${max} vs ${none}`);
});

test('first gimmick is a free pick after floor 50; later gimmicks cost coins from the held item pool',()=>{
  assert.equal(FIRST_GIMMICK_FLOOR,50);
  const early=shop(41);try{
    const run=view(early.store);assert.equal(run.freeGimmick,null);assert.equal(run.gimmickUnlockFloor,50);
    assert.throws(()=>early.store.claimFreeGimmick('p',early.id,41,'Charizardite X','Charizard'),/무료/);
    for(const floor of [11,21,31,41]){early.store.db.prepare('UPDATE runs SET floor=? WHERE id=?').run(floor,early.id);for(const product of view(early.store).itemOffers!)assert.ok(!['Charizardite X','Charizardite Y','Venusaurite','Dynamax Band','Tera Orb'].includes(product),product);}
    early.store.db.prepare('UPDATE runs SET floor=41 WHERE id=?').run(early.id);
    assert.equal(early.store.battle(early.store.enter('p',early.id,41,starters)).rule,'basic');
  }finally{early.store.close();}
  const late=shop(51);try{
    const options=view(late.store).freeGimmick!;assert.ok(options['Charizardite X'].includes('Charizard'));assert.deepEqual(options['Dynamax Band'],[]);
    assert.throws(()=>late.store.claimFreeGimmick('p',late.id,51,'Leftovers','Charizard'),/기믹/);assert.throws(()=>late.store.claimFreeGimmick('p',late.id,51,'Charizardite X','Blastoise'),/지닐/);
    const coins=late.store.view('p').coins;late.store.claimFreeGimmick('p',late.id,51,'Charizardite X','Charizard');
    assert.equal(late.store.view('p').coins,coins);assert.equal(view(late.store).heldItems!.Charizard,'Charizardite X');assert.equal(view(late.store).freeGimmick,null);
    assert.throws(()=>late.store.claimFreeGimmick('p',late.id,51,'Venusaurite','Venusaur'),/무료/);
    // Second gimmick: it appears among the four held item cards and is paid for.
    late.store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(late.id,51,JSON.stringify(['Venusaurite','Leftovers','Life Orb','Charcoal']));
    assert.ok(view(late.store).itemOffers!.includes('Venusaurite'));
    late.store.purchaseItem('p',late.id,51,'Venusaurite','Venusaur');
    assert.equal(late.store.view('p').coins,coins-heldItems['Venusaurite'].price);assert.equal(view(late.store).heldItems!.Venusaur,'Venusaurite');
  }finally{late.store.close();}
});
