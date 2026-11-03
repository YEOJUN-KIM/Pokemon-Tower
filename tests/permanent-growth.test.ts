import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {pokemonSets} from '../src/data/teams';
import {TowerStore} from '../src/server/tower-store';
import {hiddenAbilities,trainingOptions} from '../src/server/training';
import {natures,evTotal,EV_CAPACITY,TRAINING_POINT_PRICE,type TrainingProfile} from '../src/data/training';
import {HIDDEN_ABILITY_UNLOCK_PRICE,moveUnlockPrice,moveUnlockPrices} from '../src/data/growth-unlocks';
import {machineRarity} from '../src/data/machine-rarities';

const entry=(s:TowerStore,owner:string,species:string)=>s.trainingCollection(owner).find(e=>e.species===species)!;
const save=(s:TowerStore,owner:string,species:string,change:(profile:TrainingProfile)=>void)=>{
  const current=entry(s,owner,species),profile=structuredClone(current.profile);change(profile);s.train(owner,species,current.revision,profile);return entry(s,owner,species);
};
const fixture=(points=5000)=>{const s=new TowerStore(':memory:');s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=? WHERE id=?').run(points,'p');return s;};
const wallet=(s:TowerStore)=>s.view('p').growthPoints;

test('stat points: redistribution inside owned capacity is free; only raising capacity costs',()=>{
 const s=fixture();try{
  assert.equal(entry(s,'p','Charizard').evCapacity,EV_CAPACITY.start);
  save(s,'p','Charizard',p=>{p.evs.atk=32;p.evs.spe=32;p.evs.hp=2;});
  assert.equal(wallet(s),5000-66*TRAINING_POINT_PRICE);assert.equal(entry(s,'p','Charizard').evCapacity,66);
  const spent=wallet(s);
  save(s,'p','Charizard',p=>{p.evs.atk=0;p.evs.spa=32;});
  assert.equal(wallet(s),spent);assert.equal(evTotal(entry(s,'p','Charizard').profile.evs),66);
  // Lowering never refunds and never lowers capacity; going back up inside it is free.
  save(s,'p','Charizard',p=>{p.evs.spa=10;});assert.equal(entry(s,'p','Charizard').evCapacity,66);assert.equal(wallet(s),spent);
  save(s,'p','Charizard',p=>{p.evs.spa=32;});assert.equal(wallet(s),spent);
 }finally{s.close();}
});

test('stat points: raising capacity charges growth points; limits and funds are enforced',()=>{
 const s=fixture(100);try{
  save(s,'p','Blastoise',p=>{p.evs.def=10;});assert.equal(wallet(s),100-10*TRAINING_POINT_PRICE);assert.equal(entry(s,'p','Blastoise').evCapacity,10);
  save(s,'p','Blastoise',p=>{p.evs.def=0;p.evs.spd=10;});assert.equal(wallet(s),20);
  save(s,'p','Blastoise',p=>{p.evs.spd=12;});assert.equal(wallet(s),4);assert.equal(entry(s,'p','Blastoise').evCapacity,12);
  const current=entry(s,'p','Blastoise'),poor=structuredClone(current.profile);poor.evs.spd=14;
  assert.throws(()=>s.train('p','Blastoise',current.revision,poor),/부족/);assert.equal(entry(s,'p','Blastoise').evCapacity,12);assert.equal(wallet(s),4);
  s.db.prepare('UPDATE players SET growth_points=9999 WHERE id=?').run('p');
  const over=structuredClone(current.profile);over.evs.hp=33;assert.throws(()=>s.train('p','Blastoise',current.revision,over),/32/);
  const total=structuredClone(current.profile);total.evs={hp:32,atk:32,def:3,spa:0,spd:0,spe:0};assert.throws(()=>s.train('p','Blastoise',current.revision,total),/66/);
 }finally{s.close();}
});

test('stat points: capacity survives restart, and migration never lowers it below existing investment',()=>{
 const path=`.data/tests/growth-${randomUUID()}.sqlite`;let s=new TowerStore(path);
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=1000 WHERE id=?').run('p');
  save(s,'p','Charizard',p=>{p.evs.spa=20;});s.close();s=new TowerStore(path);
  assert.equal(entry(s,'p','Charizard').evCapacity,20);
  // A pre-v49 database has no growth rows: capacity is rebuilt from the saved distribution.
  s.db.exec('DROP TABLE pokemon_growth; PRAGMA user_version=48');s.close();s=new TowerStore(path);
  assert.equal(entry(s,'p','Charizard').evCapacity,20);assert.equal(s.db.prepare('SELECT ev_capacity FROM pokemon_growth WHERE species=?').get('Charizard')!.ev_capacity,20);
  const before=wallet(s);save(s,'p','Charizard',p=>{p.evs.spa=0;p.evs.spe=20;});assert.equal(wallet(s),before);
 }finally{s.close();}
});

test('nature changes are free for every legal nature and persist',()=>{
 const path=`.data/tests/nature-${randomUUID()}.sqlite`;let s=new TowerStore(path);
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=77 WHERE id=?').run('p');
  for(const nature of natures)assert.equal(save(s,'p','Charizard',p=>{p.nature=nature.id;}).profile.nature,nature.id);
  assert.equal(wallet(s),77);s.close();s=new TowerStore(path);assert.equal(entry(s,'p','Charizard').profile.nature,natures.at(-1)!.id);
  const current=entry(s,'p','Charizard'),bad=structuredClone(current.profile);bad.nature='Fake';assert.throws(()=>s.train('p','Charizard',current.revision,bad),/성격/);
 }finally{s.close();}
});

test('abilities: ordinary abilities are free, hidden ones unlock once per Pokemon',()=>{
 const s=fixture(2500);try{
  const options=trainingOptions('Charizard').abilities,hidden=hiddenAbilities('Charizard');
  assert.deepEqual(hidden,['Solar Power']);assert.ok(options.includes('Blaze'));
  const view=entry(s,'p','Charizard');assert.equal(view.hiddenAbilityUnlocked,false);assert.deepEqual(view.hiddenAbilities,hidden);
  assert.equal(save(s,'p','Charizard',p=>{p.ability='Blaze';}).profile.ability,'Blaze');assert.equal(wallet(s),2500);
  const current=entry(s,'p','Charizard'),locked=structuredClone(current.profile);locked.ability='Solar Power';
  assert.throws(()=>s.train('p','Charizard',current.revision,locked),/숨겨진 특성.*해금/);assert.equal(wallet(s),2500);
  s.unlockHiddenAbility('p','Charizard');assert.equal(wallet(s),2500-HIDDEN_ABILITY_UNLOCK_PRICE);assert.equal(entry(s,'p','Charizard').hiddenAbilityUnlocked,true);
  assert.throws(()=>s.unlockHiddenAbility('p','Charizard'),/이미/);assert.equal(wallet(s),2500-HIDDEN_ABILITY_UNLOCK_PRICE);
  // After unlocking, hidden and ordinary abilities switch freely.
  save(s,'p','Charizard',p=>{p.ability='Solar Power';});save(s,'p','Charizard',p=>{p.ability='Blaze';});save(s,'p','Charizard',p=>{p.ability='Solar Power';});
  assert.equal(wallet(s),2500-HIDDEN_ABILITY_UNLOCK_PRICE);
  // Not shared: another Pokemon's hidden ability is still locked.
  const other=entry(s,'p','Blastoise');assert.equal(other.hiddenAbilityUnlocked,false);
  const wrong=structuredClone(other.profile);wrong.ability=other.hiddenAbilities[0];assert.throws(()=>s.train('p','Blastoise',other.revision,wrong),/숨겨진 특성/);
  s.db.prepare('UPDATE players SET growth_points=0 WHERE id=?').run('p');assert.throws(()=>s.unlockHiddenAbility('p','Blastoise'),/부족/);
 }finally{s.close();}
});

test('abilities: unlock persists across restart; a hidden ability already in use stays unlocked',()=>{
 const path=`.data/tests/ability-${randomUUID()}.sqlite`;let s=new TowerStore(path);
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=1500 WHERE id=?').run('p');
  s.unlockHiddenAbility('p','Charizard');s.close();s=new TowerStore(path);assert.equal(entry(s,'p','Charizard').hiddenAbilityUnlocked,true);
  // Legacy data: hidden ability chosen before the unlock existed.
  const legacy=entry(s,'p','Venusaur'),profile=structuredClone(legacy.profile);profile.ability=hiddenAbilities('Venusaur')[0];
  s.db.exec('DROP TABLE pokemon_growth; PRAGMA user_version=48');
  s.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile').run('p','Venusaur',JSON.stringify(profile));
  s.close();s=new TowerStore(path);assert.equal(entry(s,'p','Venusaur').hiddenAbilityUnlocked,true);
 }finally{s.close();}
});

test('moves: per-Pokemon permanent unlock priced by machine rarity, free 4-slot changes',()=>{
 const path=`.data/tests/moves-${randomUUID()}.sqlite`;let s=new TowerStore(path);
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=9000 WHERE id=?').run('p');
  const a=entry(s,'p','Charizard'),b=entry(s,'p','Blastoise');
  const move=a.learnableMoves.find(m=>!a.unlockedMoves.includes(m)&&b.learnableMoves.includes(m)&&!b.unlockedMoves.includes(m))!;
  assert.ok(move);assert.equal(moveUnlockPrice(move),moveUnlockPrices[machineRarity(move)]);
  const locked=structuredClone(a.profile);locked.moves[3]=move;assert.throws(()=>s.train('p','Charizard',a.revision,locked),/해금/);
  s.unlockMove('p','Charizard',move);assert.equal(wallet(s),9000-moveUnlockPrice(move));
  assert.ok(entry(s,'p','Charizard').unlockedMoves.includes(move));assert.ok(!entry(s,'p','Blastoise').unlockedMoves.includes(move));
  assert.throws(()=>s.unlockMove('p','Charizard',move),/이미/);assert.equal(wallet(s),9000-moveUnlockPrice(move));
  const slotted=save(s,'p','Charizard',p=>{p.moves[3]=move;});assert.equal(slotted.profile.moves[3],move);
  const original=a.profile.moves[3];save(s,'p','Charizard',p=>{p.moves[3]=original;});save(s,'p','Charizard',p=>{p.moves[3]=move;});
  assert.equal(wallet(s),9000-moveUnlockPrice(move));
  // Same move on another Pokemon remains locked and can be unlocked separately.
  const other=structuredClone(b.profile);other.moves[3]=move;assert.throws(()=>s.train('p','Blastoise',entry(s,'p','Blastoise').revision,other),/해금/);
  s.unlockMove('p','Blastoise',move);assert.equal(wallet(s),9000-2*moveUnlockPrice(move));
  s.close();s=new TowerStore(path);assert.ok(entry(s,'p','Charizard').unlockedMoves.includes(move));assert.ok(entry(s,'p','Blastoise').unlockedMoves.includes(move));
  // Illegal moves, natural/starting moves and unowned Pokemon cannot be bought.
  assert.throws(()=>s.unlockMove('p','Charizard','Surf'),/배울 수 없는/);
  assert.throws(()=>s.unlockMove('p','Charizard',entry(s,'p','Charizard').selfMoves[0]),/이미/);
  assert.throws(()=>s.unlockMove('p','Mewtwo',move),/해금한 포켓몬/);
  s.db.prepare('UPDATE players SET growth_points=0 WHERE id=?').run('p');
  const venusaur=entry(s,'p','Venusaur'),rare=venusaur.learnableMoves.find(m=>!venusaur.unlockedMoves.includes(m))!;assert.throws(()=>s.unlockMove('p','Venusaur',rare),/부족/);
 }finally{s.close();}
});

test('moves: egg and machine unlocks share move_unlocks, so they cannot be bought twice',()=>{
 const s=fixture(9000);try{
  const a=entry(s,'p','Charizard'),move=a.learnableMoves.find(m=>!a.unlockedMoves.includes(m))!;
  s.db.prepare('INSERT INTO move_unlocks VALUES (?,?,?)').run('p','Charizard',move);
  assert.throws(()=>s.unlockMove('p','Charizard',move),/이미/);assert.equal(wallet(s),9000);
 }finally{s.close();}
});

test('ability slots: only the real Hidden Ability slot is paid; ordinary and special slots are free',()=>{
 const slots=(name:string)=>Showdown.Dex.species.get(name).abilities as unknown as Record<string,string>;
 assert.deepEqual(hiddenAbilities('Charizard'),['Solar Power']);                   // two slots? one ordinary + H
 assert.deepEqual(hiddenAbilities('Greninja'),['Protean']);                        // H only; special Battle Bond stays free
 assert.ok(trainingOptions('Greninja').abilities.includes('Battle Bond'));
 assert.deepEqual(hiddenAbilities('Zygarde'),[]);                                  // special slot only
 assert.ok(trainingOptions('Zygarde').abilities.includes('Power Construct'));
 assert.deepEqual(hiddenAbilities('Golem-Alola'),['Galvanize']);                   // regional form
 let ordinaryOnly=0,withHidden=0;
 for(const name of Object.keys(pokemonSets)){
  const s=slots(name),hidden=hiddenAbilities(name);
  for(const ability of hidden){assert.equal(ability,s.H,name);assert.ok(![s[0],s[1],s.S].includes(ability),name);}
  for(const ability of [s[0],s[1],s.S])if(ability&&trainingOptions(name).abilities.includes(ability))assert.ok(!hidden.includes(ability),`${name} ${ability}`);
  if(hidden.length)withHidden++;else ordinaryOnly++;
 }
 assert.ok(withHidden>0&&ordinaryOnly>0);
});

test('ability slots: an unlocked-needed hidden ability follows the chosen form, special abilities never prompt an unlock',()=>{
 const s=fixture(0);try{
  s.db.prepare("INSERT OR IGNORE INTO unlocks VALUES ('p','Greninja')").run();
  const view=entry(s,'p','Greninja');
  assert.deepEqual(view.hiddenAbilities,['Protean']);
  // Battle Bond is free to equip while Protean needs the unlock (no points here).
  assert.equal(save(s,'p','Greninja',p=>{p.ability='Battle Bond';}).profile.ability,'Battle Bond');
  const current=entry(s,'p','Greninja'),hidden=structuredClone(current.profile);hidden.ability='Protean';
  assert.throws(()=>s.train('p','Greninja',current.revision,hidden),/숨겨진 특성/);
  assert.throws(()=>s.unlockHiddenAbility('p','Zygarde'),/해금한 포켓몬|없습니다/);
 }finally{s.close();}
});
