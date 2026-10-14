import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {FORMAT} from '../src/data/battle-rules';
import {packTeam} from '../src/data/teams';
import {additionalHeldItems} from '../src/data/additional-held-items';
import {heldItems} from '../src/data/held-items';
import {rollItemOffers,gimmickItemFamily,itemRarityWeights} from '../src/data/held-item-shop';
import {TowerStore} from '../src/server/tower-store';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

function fixture(name:string,item:string,moves=['Splash'],enemyMoves=['Splash'],ability?:string){
 const battle=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 const own=Showdown.Teams.unpack(packTeam([name,'Blastoise','Venusaur']))!;
 const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;
 own[0].item=item;own[0].moves=moves;if(ability)own[0].ability=ability;enemy[0].moves=enemyMoves;
 battle.setPlayer('p1',{name:'Player',team:own});battle.setPlayer('p2',{name:'Opponent',team:enemy});battle.makeChoices('team 123','team 123');
 return battle;
}

test('requested twenty items are available, while all seven excluded items remain absent',()=>{
 assert.equal(Object.keys(additionalHeldItems).length,20);
 for(const item of ['Throat Spray','Clear Amulet','Covert Cloak','Safety Goggles','Protective Pads','Light Ball','Thick Club'])assert.ok(!Object.hasOwn(heldItems,item),item);
});

test('status orbs enable Poison Heal and Guts, and Booster Energy activates both Paradox abilities',()=>{
 for(const [name,item,ability,status] of [['Breloom','Toxic Orb','Poison Heal','tox'],['Conkeldurr','Flame Orb','Guts','brn']]){
  const battle=fixture(name,item,['Splash'],['Splash'],ability);try{
   const pokemon=battle.p1.active[0];pokemon.hp-=30;const hp=pokemon.hp,atk=pokemon.getStat('atk');
   battle.makeChoices('move 1','move 1');assert.equal(pokemon.status,status);assert.ok(pokemon.item);
   battle.makeChoices('move 1','move 1');
   if(ability==='Poison Heal')assert.ok(pokemon.hp>hp);else assert.ok(pokemon.getStat('atk')>atk);
  }finally{battle.destroy();}
 }
 for(const [name,ability] of [['Flutter Mane','protosynthesis'],['Iron Valiant','quarkdrive']]){
  const battle=fixture(name,'Booster Energy');try{assert.ok(battle.p1.active[0].volatiles[ability]);assert.equal(battle.p1.active[0].item,'');}finally{battle.destroy();}
 }
});

test('Balloon blocks Earthquake until a damaging hit pops it, and Loaded Dice produces four or five hits',()=>{
 const battle=fixture('Gholdengo','Air Balloon',['Splash'],['Earthquake','Crunch']);try{
  const pokemon=battle.p1.active[0],hp=pokemon.hp;
  battle.makeChoices('move 1','move 1');assert.equal(pokemon.hp,hp);assert.equal(pokemon.item,'airballoon');
  battle.makeChoices('move 1','move 2');assert.equal(pokemon.item,'');assert.ok(pokemon.hp<hp);
  const before=pokemon.hp;battle.makeChoices('move 1','move 1');assert.ok(pokemon.hp<before);
 }finally{battle.destroy();}
 const dice=fixture('Baxcalibur','Loaded Dice',['Icicle Spear']);try{
  dice.makeChoices('move 1','move 1');assert.ok(dice.log.some(line=>/^\|-hitcount\|.*\|[45]$/.test(line)));
 }finally{dice.destroy();}
});

test('White Herb restores Shell Smash defenses and Power Herb completes Geomancy in one turn',()=>{
 const white=fixture('Blastoise','White Herb',['Shell Smash']);try{
  white.makeChoices('move 1','move 1');const p=white.p1.active[0];assert.equal(p.boosts.def,0);assert.equal(p.boosts.spd,0);assert.equal(p.boosts.atk,2);assert.equal(p.item,'');
 }finally{white.destroy();}
 const power=fixture('Xerneas','Power Herb',['Geomancy']);try{
  power.makeChoices('move 1','move 1');const p=power.p1.active[0];assert.equal(p.boosts.spa,2);assert.equal(p.boosts.spd,2);assert.equal(p.boosts.spe,2);assert.equal(p.item,'');
 }finally{power.destroy();}
});

test('weather rocks and Terrain Extender extend actual field durations to eight turns',()=>{
 for(const [item,move,state] of [['Heat Rock','Sunny Day','weatherState'],['Damp Rock','Rain Dance','weatherState'],['Smooth Rock','Sandstorm','weatherState'],['Icy Rock','Snowscape','weatherState'],['Terrain Extender','Electric Terrain','terrainState']]){
  const battle=fixture('Blastoise',item,[move]);try{
   battle.makeChoices('move 1','move 1');assert.equal((battle.field as any)[state].duration,7,item+' after first turn');
  }finally{battle.destroy();}
 }
});

test('herb and berries cure their targets, Black Sludge respects typing and Weakness Policy boosts both offenses',()=>{
 const scenarios=[['Snorlax','Mental Herb',['Splash'],['Taunt']],['Snorlax','Lum Berry',['Splash'],['Spore']],['Snorlax','Chesto Berry',['Rest'],['Splash']]] as const;
 for(const [name,item,moves,enemyMoves] of scenarios){
  const battle=fixture(name,item,[...moves],[...enemyMoves]);try{
   const p=battle.p1.active[0];p.hp-=30;battle.makeChoices('move 1','move 1');
   assert.equal(p.item,'',item);assert.equal(p.status,'');assert.ok(!p.volatiles.taunt);
  }finally{battle.destroy();}
 }
 for(const name of ['Toxapex','Snorlax']){
  const battle=fixture(name,'Black Sludge');try{
   const p=battle.p1.active[0];p.hp-=30;const before=p.hp;battle.makeChoices('move 1','move 1');
   assert.ok(name==='Toxapex'?p.hp>before:p.hp<before);
  }finally{battle.destroy();}
 }
 const weak=fixture('Blastoise','Weakness Policy',['Splash'],['Energy Ball']);try{
  weak.makeChoices('move 1','move 1');const p=weak.p1.active[0];assert.equal(p.boosts.atk,2);assert.equal(p.boosts.spa,2);assert.equal(p.item,'');
 }finally{weak.destroy();}
});

test('Eject Button and Eject Pack request a friendly switch while Red Card forces an opponent switch',()=>{
 for(const [item,moves,enemyMoves] of [['Eject Button',['Splash'],['Tackle']],['Eject Pack',['Shell Smash'],['Splash']]] as const){
  const battle=fixture('Blastoise',item,[...moves],[...enemyMoves]);try{
   battle.makeChoices('move 1','move 1');assert.equal(battle.p1.active[0].item,'');assert.equal(battle.p1.requestState,'switch');
  }finally{battle.destroy();}
 }
 const red=fixture('Blastoise','Red Card',['Splash'],['Tackle']);try{
  red.makeChoices('move 1','move 1');assert.equal(red.p1.active[0].item,'');assert.notEqual(red.p2.active[0].species.name,'Snorlax');
 }finally{red.destroy();}
});

test('natural Booster activation survives completion and next-floor packing, with deterministic replay',async()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('boost');store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('boost','Iron Valiant');
  const members=['Iron Valiant','Blastoise','Venusaur'],run=store.battle(store.start('boost',members,'basic')).run_id;
  store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=10000 WHERE id=?').run('boost');
  store.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(run,11,JSON.stringify(['Booster Energy','Leftovers','Charcoal','Miracle Seed']));
  store.purchaseItem('boost',run,11,'Booster Energy','Iron Valiant');const id=store.enter('boost',run,11,members),row=store.battle(id);
  const log=await runBattle({teams:{p1:row.player_team,p2:row.opponent_team},trainerEquipment:JSON.parse(row.trainer_equipment!),format:row.format,rule:'basic',seed:JSON.parse(row.seed),player:new DamagePolicy(),opponent:new DamagePolicy()});
  assert.ok(log.publicProtocol.some(line=>line.startsWith('|-enditem|p1a: Iron Valiant|Booster Energy')));
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
  store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
  assert.equal(store.view('boost').run!.heldItems!['Iron Valiant'],'Booster Energy');
  store.db.prepare("UPDATE runs SET floor=12,state='select' WHERE id=?").run(run);
  assert.equal(Showdown.Teams.unpack(store.battle(store.enter('boost',run,12,members)).player_team)![0].item,'Booster Energy');
 }finally{store.close();}
});

test('gimmick family draws keep Dynamax reachable alongside many Mega stones and exclude ineligible tools',()=>{
 let seed=7345;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 for(const floor of [10,30]){
  const counts={mega:0,dynamax:0,z:0,primal:0,tera:0};let shops=0;
  for(let i=0;i<4000;i++){
   const offers=rollItemOffers(floor,random,item=>!['Red Orb','Blue Orb'].includes(item));
   let found=false;for(const item of offers){const family=gimmickItemFamily(item);if(family){counts[family]++;found=true;}}
   if(found)shops++;
  }
  assert.ok(counts.dynamax>100);assert.ok(counts.mega>100);assert.equal(counts.primal,0);
  assert.ok(counts.dynamax/counts.mega>.6&&counts.dynamax/counts.mega<1.6);
  assert.ok(shops/4000>.1&&shops/4000<.6);
 }
 for(const floor of [5,10,15,20,25,30])assert.ok(Math.abs(Object.values(itemRarityWeights(floor)).reduce((a,b)=>a+b,0)-100)<.001);
});
