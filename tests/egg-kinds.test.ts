import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {EGG_SHINY_ODDS} from '../src/data/permanent-upgrades';
import {rareEggWeights,rareEggCategory,machinePokemonWeights,machinePokemonKind,machineShiny,MACHINE_SHINY_WEIGHT,highestEggKind} from '../src/data/egg-kinds';
import {rareEggSpeciesCategory} from '../src/server/egg-pool';

test('machine reveals one representative shell with shiny above super rare, rare and normal',()=>{
 assert.equal(highestEggKind(['normal','normal','normal','normal','normal','normal','normal','rare','rare','superRare']),'superRare');
 assert.equal(highestEggKind(['normal','normal','normal','normal','normal','normal','normal','normal','superRare','shiny']),'shiny');
 assert.equal(highestEggKind(['rare','normal','normal']),'rare');
 assert.equal(highestEggKind(['normal']),'normal');
 assert.equal(highestEggKind(['shiny']),'shiny');
});

test('rare egg roll intervals have the requested relative weights and no ordinary category',()=>{
 const counts:Record<string,number>={};
 for(let roll=0;roll<10000;roll++){const category=rareEggCategory(roll);counts[category]=(counts[category]??0)+1;}
 assert.deepEqual(counts,rareEggWeights);
 for(const roll of [-1,10000,NaN,1.5])assert.throws(()=>rareEggCategory(roll));
});

test('machine grades are normal 85%, rare 12%, super rare 3%, with a separate 0.24% shiny roll',()=>{
 const counts:Record<string,number>={};let shiny=0;for(let roll=0;roll<10000;roll++){const kind=machinePokemonKind(roll);counts[kind]=(counts[kind]??0)+1;shiny+=Number(machineShiny(roll));}
 assert.deepEqual(counts,machinePokemonWeights);assert.equal(shiny,MACHINE_SHINY_WEIGHT);
});

test('ten machine eggs roll individually, preserve guarantees and replay without another charge',()=>{
 const expected=['normal','rare','shiny','superRare','superRare','shiny','normal','normal','rare','normal'];
 const rolls=expected.flatMap((kind,i)=>kind==='normal'?[0,24]:kind==='rare'?[8500,0,24]:kind==='superRare'?[9700,i===3?0:250,24]:i===2?[0,0]:[9700,0,0]);let index=0;
 const store=new TowerStore(':memory:',max=>[10000,8500,300].includes(max)?rolls[index++]:0);
 try{
  store.ensurePlayer('p');index=0;store.db.prepare('UPDATE players SET growth_points=2000 WHERE id=?').run('p');
  const id=randomUUID(),result=store.permanentAction('p',id,'hatch','egg',10,null,'machine');
  assert.deepEqual(result.eggs!.map(egg=>egg.eggKind),expected);
  assert.equal(result.eggs![2].rareCategory,undefined);assert.equal(result.eggs![3].rareCategory,'legendary');assert.equal(result.eggs![4].rareCategory,'mythical');assert.equal(result.eggs![5].rareCategory,'legendary');
  for(const egg of result.eggs!){if(egg.eggKind==='normal'){assert.equal(rareEggSpeciesCategory(egg.species),null);assert.equal(egg.shiny,false);}else if(egg.eggKind==='shiny')assert.equal(egg.shiny,true);else{assert.equal(egg.shiny,false);assert.ok(egg.rareCategory);}}
  assert.equal(index,rolls.length);assert.equal(store.view('p').growthPoints,0);
  assert.deepEqual(store.permanentAction('p',id,'hatch','egg',10,null,'machine'),result);assert.equal(index,rolls.length);
 }finally{store.close();}
});

test('switching to the machine preserves already paid legacy hatch receipts',()=>{
 const store=new TowerStore(':memory:',()=>0);try{
  store.ensurePlayer('p');store.db.prepare('UPDATE players SET growth_points=2000 WHERE id=?').run('p');
  const id=randomUUID(),old=store.permanentAction('p',id,'hatch','egg',1,null,'rare');
  assert.deepEqual(store.permanentAction('p',id,'hatch','egg',1,null,'machine'),old);assert.equal(store.view('p').growthPoints,1800);
  assert.throws(()=>store.permanentAction('p',id,'hatch','egg',10,null,'machine'),/같은 요청/);
 }finally{store.close();}
});

for(const [roll,category] of [[0,'sublegendary'],[4500,'paradox'],[7000,'ultrabeast'],[8500,'legendary'],[9500,'mythical']] as const)test(`rare egg really draws ${category}, spends equal mixed payment, and replays exactly once`,()=>{
 const store=new TowerStore(':memory:',max=>max===10000?roll:max===EGG_SHINY_ODDS?1:0);
 try{
  store.ensurePlayer('p');store.db.prepare('UPDATE players SET growth_points=2000 WHERE id=?').run('p');
  store.db.prepare('INSERT INTO permanent_upgrades VALUES (?,0,0,3)').run('p');
  const id=randomUUID(),result=store.permanentAction('p',id,'hatch','egg',10,null,'rare');
  assert.equal(result.eggKind,'rare');assert.equal(result.eggs!.length,10);
  for(const egg of result.eggs!){assert.equal(rareEggSpeciesCategory(egg.species),category);assert.equal(egg.rareCategory,category);assert.equal(egg.eggKind,category==='legendary'||category==='mythical'?'superRare':'rare');assert.equal(egg.shiny,false);}
  assert.equal(store.permanentView('p').eggTickets,0);assert.equal(store.view('p').growthPoints,600);
  assert.deepEqual(store.permanentAction('p',id,'hatch','egg',10,null,'rare'),result);
  assert.equal(store.view('p').growthPoints,600);
  assert.throws(()=>store.permanentAction('p',id,'hatch','egg',10,null,'shiny'),/같은 요청/);
 }finally{store.close();}
});

test('gold eggs guarantee a saved shiny, even when the ordinary shiny roll would fail',()=>{
 const store=new TowerStore(':memory:',()=>1);
 try{
  store.ensurePlayer('p');store.db.prepare('UPDATE players SET growth_points=2000 WHERE id=?').run('p');
  const id=randomUUID(),result=store.permanentAction('p',id,'hatch','egg',10,null,'shiny');
  for(const egg of result.eggs!){assert.ok(egg.shiny);assert.equal(egg.eggKind,'shiny');assert.ok(store.trainingCollection('p').find(t=>t.species===egg.species)!.profile.shiny);}
  assert.equal(store.view('p').growthPoints,0);
  assert.deepEqual(store.permanentAction('p',id,'hatch','egg',10,null,'shiny'),result);
 }finally{store.close();}
});

test('invalid egg kinds and insufficient points cannot spend tickets or alter collection',()=>{
 const store=new TowerStore(':memory:');
 try{
  store.ensurePlayer('p');store.db.prepare('INSERT INTO permanent_upgrades VALUES (?,0,0,3)').run('p');
  const before=store.view('p').unlocked;
  for(const kind of ['type-Water','fake',null,42])assert.throws(()=>store.permanentAction('p',randomUUID(),'hatch','egg',10,null,kind),/알 종류/);
  assert.throws(()=>store.permanentAction('p',randomUUID(),'hatch','egg',10,null,'rare'),/부족/);
  assert.equal(store.permanentView('p').eggTickets,3);assert.deepEqual(store.view('p').unlocked,before);
 }finally{store.close();}
});

test('normal receipts keep their old payload, while the revealed shell signals guaranteed rewards',()=>{
 const store=new TowerStore(':memory:',()=>0);
 try{
  store.ensurePlayer('p');store.db.prepare('UPDATE players SET growth_points=2000 WHERE id=?').run('p');
  const id=randomUUID(),result=store.permanentAction('p',id,'hatch','egg',1,null);
  assert.equal(result.eggs![0].eggKind,'shiny');
  assert.deepEqual(store.permanentAction('p',id,'hatch','egg',1,null,'normal'),result);
  const receipt=store.db.prepare('SELECT payload FROM permanent_receipts WHERE player_id=? AND request_id=?').get('p',id) as {payload:string};
  assert.equal(receipt.payload,JSON.stringify({action:'hatch',product:'egg',count:1,species:null}));
 }finally{store.close();}
});
