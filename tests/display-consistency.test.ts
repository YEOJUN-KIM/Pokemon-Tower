import {publicAssetExists} from './helpers/runtime-assets';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Showdown from 'pokemon-showdown';
import {vitaminDescription,VITAMIN_BOOST,vitamins} from '../src/data/shop';
import {statKeys,statNames} from '../src/data/training';
import {heldItems} from '../src/data/held-items';
import {megaStones} from '../src/data/gimmicks';
import {hiddenShopFixture} from './hidden-shop-fixture';
import {grantStoredReward} from '../src/server/inventory-grants';
import {hiddenShopProducts} from '../src/server/hidden-shop';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {villainLeaders,villainOrganizations} from '../src/data/villain-organizations';
import {eventPresentation} from '../src/web/event-presentation';

test('vitamin description, stock and per-member usage use the actual grant and ledger',async()=>{
 const f=hiddenShopFixture();const hooks=registerHooks({load(url,ctx,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,ctx);}});
 try{
  for(const stat of statKeys){assert.equal(vitaminDescription(stat),`${statNames[stat]} 능력 포인트를 ${VITAMIN_BOOST} 올린다.`);grantStoredReward(f.store.db,f.run,{kind:'vitamin',stat,amount:1});}
  f.store.db.prepare('INSERT INTO vitamin_purchases VALUES (?,?,?,?,0)').run(f.run,1,'atk','Charizard');
  for(const [i,stat] of ['def','spa','spd'].entries())f.store.db.prepare('INSERT INTO vitamin_purchases VALUES (?,?,?,?,0)').run(f.run,3+i,stat,'Blastoise');
  const run=f.store.view(f.owner).run!,hp=run.bag!.entries.find(e=>e.name===vitamins.hp.name)!;
  assert.equal(hp.description,vitaminDescription('hp'));assert.ok(!hp.targets.includes('Blastoise'));
  assert.ok(hiddenShopProducts(f.store.db,f.run).filter(e=>e.category==='vitamin').every(e=>!e.description.includes('제한')));
  const {ItemTargetList}=await import('../src/web/item-target-list');
  const html=renderToStaticMarkup(createElement(ItemTargetList,{run,showVitaminUsage:true,disabled:name=>!hp.targets.includes(name),onChoose:()=>{}}));
  assert.ok(html.includes('영양제 사용 1 / 3'));assert.ok(html.includes('영양제 사용 3 / 3'));assert.ok(html.includes('영양제 사용 0 / 3'));
  for(const [item,stone] of Object.entries(megaStones)){assert.ok(heldItems[item].description.includes('메가진화'));assert.ok(!heldItems[item].description.includes('공용'));assert.ok(!heldItems[item].description.includes('한 번만'));assert.ok(heldItems[item].description.includes('교환·제거'));}
 }finally{hooks.deregister();f.store.close();}
});

test('audited NPC renderer never uses original artwork, sheets or unknown files',async()=>{
 const assets=JSON.parse(readFileSync('src/data/trainer-assets.json','utf8'));
 assert.equal(assets.aliana.kind,'illustration');
 const references=[...trainerCatalog,...Object.values(villainLeaders).flatMap(group=>[group.executive,...group.executives??[],group.boss]),...villainOrganizations].map(person=>person.portrait);
 references.push(...Object.values(eventPresentation).flatMap(value=>value.artwork==='trainer'?[value.sprite]:[]));
 assert.deepEqual([...new Set(references.filter(key=>!assets[key]||assets[key].kind!=='battle-sprite'))],['aliana']);
 for(const [key,value] of Object.entries(assets) as [string,{kind:string}][])if(value.kind==='battle-sprite')assert.ok(publicAssetExists(`public/sprites/trainers/${key}.png`));
 const {TrainerPortrait,trainerAsset}=await import('../src/web/trainer-portrait');
 assert.equal(trainerAsset('aliana'),null);assert.equal(trainerAsset('missing-person'),null);assert.equal(trainerAsset('player-back-sheet'),null);assert.equal(trainerAsset('hiker-gen4'),'hiker-gen4');
 const html=renderToStaticMarkup(createElement(TrainerPortrait,{sprite:'aliana',alt:'아케비'}));assert.ok(!html.includes('/aliana.png'));assert.ok(html.includes('pixel-silhouette'));assert.ok(html.includes('아케비'));
});

for(const [species,ability,item] of [['Charizard','Blaze','Charizardite X'],['Arceus-Fire','Multitype','Flame Plate'],['Silvally-Fire','RKS System','Fire Memory'],['Genesect-Burn','Download','Burn Drive'],['Ogerpon-Hearthflame','Mold Breaker','Hearthflame Mask'],['Groudon','Drought','Red Orb']])for(const attack of ['Knock Off','Trick','Thief'])test(`${species} ${item}: native ${attack} cannot remove or steal the protected tool`,()=>{
 const battle=new Showdown.Battle({formatid:'gen9customgame',seed:'1,2,3,4'});
 try{
  battle.setPlayer('p1',{team:[{name:species,species,ability,item,moves:['Splash'],level:100}]});battle.setPlayer('p2',{team:[{name:'Mew',species:'Mew',ability:'Synchronize',item:attack==='Trick'?'Leftovers':'',moves:[attack],level:5}]});
  if(battle.requestState==='teampreview'){battle.choose('p1','team 1');battle.choose('p2','team 1');}
  battle.choose('p1','move 1');battle.choose('p2','move 1');assert.equal(battle.p1.pokemon[0].getItem().name,item);
 }finally{battle.destroy();}
});
