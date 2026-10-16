import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {eggMachineTuningRules,type EggTuningEvent} from '../src/data/egg-machine-tuning';
import {teraTypes} from '../src/data/tera';
import {selectEggCandidate} from '../src/game/egg-machine-tuning';
import {eggSpeciesRegion,resolveEggMachineTuning,selectTunedEggSpecies} from '../src/server/egg-machine-tuning';
import {eggSpeciesGrade,buildEggSpeciesPools,rareEggSpeciesCategory} from '../src/server/egg-pool';
import {towerThemes} from '../src/data/tower-themes';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {TowerStore} from '../src/server/tower-store';
import {BattleRequestError} from '../src/server/request-error';

const hoenn={kind:'region',region:'hoenn'} as const;
const fire={kind:'type',pokemonType:'Fire'} as const;
function setup(roll:(max:number)=>number=()=>0,points=10000){
  const store=new TowerStore(':memory:',roll);
  store.ensurePlayer('p');store.db.prepare('UPDATE players SET growth_points=? WHERE id=?').run(points,'p');
  return store;
}
function hatch(store:TowerStore,tuning?:unknown,count:1|10=1,id=randomUUID()){
  return store.permanentAction('p',id,'hatch','egg',count,null,'machine',tuning);
}

test('regions use the introduced form, preserve separate collection identities, and classify every hatch candidate',()=>{
  for(const [name,region] of Object.entries({Meowth:'kanto','Meowth-Alola':'alola','Meowth-Galar':'galar',
    'Raichu-Alola':'alola','Tauros-Paldea-Combat':'paldea',Nihilego:'alola','Iron Valiant':'paldea',
    'Arcanine-Hisui':'sinnoh',Kleavor:'sinnoh',Wyrdeer:'sinnoh',Ursaluna:'sinnoh','Ursaluna-Bloodmoon':'paldea'})){
    assert.equal(eggSpeciesRegion(name),region,name);
  }
  const entries=pokedexEntries().filter(entry=>entry.battleReady!==false);
  assert.equal(entries.length,615);
  for(const entry of entries)assert.ok(eggSpeciesRegion(entry.species),entry.species);
  assert.ok(entries.some(entry=>entry.species==='Raichu-Alola'));
  assert.equal(entries.some(entry=>entry.species==='Meowth-Alola'),false);
  assert.throws(()=>eggSpeciesRegion('fake-species'),/Unknown egg species/);
});

test('type focus reuses all engine types and includes either type of dual-type species',()=>{
  assert.deepEqual([...teraTypes].sort(),[...Showdown.Dex.types.names()].sort());
  for(const pokemonType of teraTypes)assert.equal(resolveEggMachineTuning({kind:'type',pokemonType}).tuning.kind,'type');
  assert.equal(resolveEggMachineTuning(fire).matches!('Charizard'),true);
  assert.equal(resolveEggMachineTuning({kind:'type',pokemonType:'Flying'}).matches!('Charizard'),true);
  assert.equal(resolveEggMachineTuning(fire).matches!('Blastoise'),false);
});

test('focus gives its whole group exactly 50 of 100 weighted tickets, rather than filtering out other candidates',()=>{
  const pool=['focus',...Array.from({length:9},(_,i)=>`other-${i}`)];
  const counts={focus:0,other:0};
  for(let ticket=0;ticket<100;ticket++){
    const calls:number[]=[];
    const result=selectEggCandidate(pool,name=>name==='focus',max=>{calls.push(max);return calls.length===1?ticket:0;});
    counts[result==='focus'?'focus':'other']++;
    assert.deepEqual(calls,[100,ticket<50?1:9]);
  }
  assert.deepEqual(counts,{focus:50,other:50});
  assert.equal(eggMachineTuningRules.focusWeight,50);
  assert.equal(selectEggCandidate(pool,null,()=>9),'other-8');
});

test('empty focus and empty non-focus groups fall back without extra draws or failures',()=>{
  for(const matches of [null,()=>false,()=>true]){
    const calls:number[]=[];
    assert.equal(selectEggCandidate(['a','b'],matches,max=>{calls.push(max);return 1;}),'b');
    assert.deepEqual(calls,[2]);
  }
  assert.throws(()=>selectEggCandidate([],null,()=>0),/Empty egg candidate pool/);
});

test('only registered event IDs resolve; trusted event definitions support region, type, and explicit species groups',()=>{
  const events:readonly EggTuningEvent[]=[
    {id:'fixture-region',targets:[hoenn]},
    {id:'fixture-type',targets:[fire]},
    {id:'fixture-list',targets:[{kind:'species',species:['Raichu-Alola']}]},
    {id:'fixture-mixed',targets:[hoenn,fire,{kind:'species',species:['Mewtwo']}]},
  ];
  const resolve=(id:string)=>resolveEggMachineTuning({kind:'event',eventId:id},events).matches!;
  assert.ok(resolve('fixture-region')('Sceptile'));assert.equal(resolve('fixture-region')('Charizard'),false);
  assert.ok(resolve('fixture-type')('Charizard'));assert.equal(resolve('fixture-type')('Blastoise'),false);
  assert.ok(resolve('fixture-list')('Raichu-Alola'));assert.equal(resolve('fixture-list')('Raichu'),false);
  for(const name of ['Sceptile','Charizard','Mewtwo'])assert.ok(resolve('fixture-mixed')(name));
  assert.equal(resolve('fixture-mixed')('Blastoise'),false);
  assert.throws(()=>resolveEggMachineTuning({kind:'event',eventId:'fixture-type'}),BattleRequestError);
});

test('malformed, missing, unknown and client-controlled tuning inputs are rejected with the existing 400 convention',()=>{
  for(const input of [null,[],false,'hoenn',42,{},
    {kind:'bad'},{kind:'region'},{kind:'region',region:'hisui'},{kind:'region',region:'constructor'},
    {kind:'type'},{kind:'type',pokemonType:'fire'},{kind:'type',pokemonType:'fake'},
    {kind:'event'},{kind:'event',eventId:'dragon_week'},
    {...hoenn,price:1},{...hoenn,focusChance:.9},{...fire,weight:100},
    {kind:'none',region:'hoenn'},{...hoenn,pokemonType:'Fire'},
  ]){
    assert.throws(()=>resolveEggMachineTuning(input),(error:unknown)=>error instanceof BattleRequestError&&error.status===400,JSON.stringify(input));
  }
});

test('omitted tuning and explicit none preserve the same results, RNG calls, price and legacy receipt payload',()=>{
  const calls:number[][]=[[],[]];
  const stores=calls.map(log=>setup(max=>{log.push(max);return max===10000?24:0;}));
  try{
    const id=randomUUID(),a=hatch(stores[0],undefined,10,id),b=hatch(stores[1],{kind:'none'},10,id);
    assert.deepEqual(a,b);assert.deepEqual(calls[0],calls[1]);
    for(const store of stores){
      assert.equal(store.view('p').growthPoints,8000);
      const row=store.db.prepare('SELECT payload FROM permanent_receipts WHERE player_id=? AND request_id=?').get('p',id) as {payload:string};
      assert.equal(row.payload,JSON.stringify({action:'hatch',product:'egg',count:10,species:null,eggKind:'machine'}));
    }
  }finally{stores.forEach(store=>store.close());}
});

test('focused 10-pulls retain every rarity and the independent shiny boundary while tuning each species',()=>{
  const gradeRolls=[0,8499,8500,8500,9699,9700,9700,9999,0,8500];
  const categoryRolls=[0,4500,7000,0];
  const results=[];
  for(const tuning of [undefined,hoenn,fire]){
    let draws=0,categories=0,focusDraws=0;
    const store=setup(max=>{
      if(max===10000){const index=Math.floor(draws/2);return draws++%2===0?gradeRolls[index]:index%2===0?23:24;}
      if(max===8500)return categoryRolls[categories++];
      if(max===100){focusDraws++;return 0;}
      return 0;
    });
    try{
      const eggs=hatch(store,tuning,10).eggs!;
      assert.equal(draws,20);
      assert.deepEqual(eggs.map(egg=>egg.shiny),[true,false,true,false,true,false,true,false,true,false]);
      const grades=eggs.map(egg=>eggSpeciesGrade(egg.species));
      assert.deepEqual(grades,['normal','normal','rare','rare','rare','superRare','superRare','superRare','normal','rare']);
      if(!tuning)assert.deepEqual(eggs.filter(egg=>eggSpeciesGrade(egg.species)==='rare').map(egg=>egg.rareCategory),['sublegendary','paradox','ultrabeast','sublegendary']);
      results.push(eggs.map(egg=>[eggSpeciesGrade(egg.species),egg.shiny]));
      if(tuning)assert.ok(focusDraws>0);
      if(tuning===hoenn){
        for(const egg of eggs)assert.equal(eggSpeciesRegion(egg.species),'hoenn');
        // A Hoenn rare group contains no Paradox or Ultra Beast; its valid
        // category is selected without failing or changing the rare grade.
        for(const egg of eggs.filter(egg=>eggSpeciesGrade(egg.species)==='rare'))assert.equal(egg.rareCategory,'sublegendary');
      }
      if(tuning===fire)for(const egg of eggs)assert.ok(Showdown.Dex.species.get(egg.species).types.includes('Fire'));
    }finally{store.close();}
  }
  assert.deepEqual(results[1],results[0]);assert.deepEqual(results[2],results[0]);
});

test('every supported region gets 50 focus tickets within each grade with both groups, including rare category imbalances',()=>{
  const pools=buildEggSpeciesPools(pokedexEntries().filter(entry=>entry.battleReady!==false).map(entry=>entry.species));
  for(const region of Object.keys(towerThemes)){
    const {matches}=resolveEggMachineTuning({kind:'region',region});
    for(const grade of ['normal','rare','superRare'] as const){
      const pool=pools[grade],focused=pool.filter(matches!);
      const both=focused.length>0&&focused.length<pool.length;
      let hits=0;
      for(let ticket=0;ticket<100;ticket++){
        let calls=0;
        const name=selectTunedEggSpecies(pool,grade,matches!,max=>{
          calls++;if(both&&calls===1){assert.equal(max,100);return ticket;}return 0;
        });
        assert.equal(eggSpeciesGrade(name),grade);
        if(matches!(name))hits++;
      }
      assert.equal(hits,both?50:focused.length?100:0,`${region}/${grade}`);
    }
  }
});

test('missing category candidates are excluded and remaining rare category weights preserve their original boundaries',()=>{
  const pools=buildEggSpeciesPools(pokedexEntries().filter(entry=>entry.battleReady!==false).map(entry=>entry.species));
  for(const [grade,draw,category,total] of [
    ['rare',0,'sublegendary',8500],['rare',4499,'sublegendary',8500],
    ['rare',4500,'paradox',8500],['rare',6999,'paradox',8500],['rare',7000,'ultrabeast',8500],['rare',8499,'ultrabeast',8500],
    ['superRare',0,'legendary',300],['superRare',249,'legendary',300],['superRare',250,'mythical',300],['superRare',299,'mythical',300],
  ] as const){
    let calls=0;
    const name=selectTunedEggSpecies(pools[grade],grade,()=>false,max=>{calls++;if(calls===1){assert.equal(max,total);return draw;}return 0;});
    assert.equal(rareEggSpeciesCategory(name),category);
  }
});

test('base pulls cost 200P, focused pulls cost 250P, and tickets still pay for whole pulls first',()=>{
  for(const [tuning,price] of [[undefined,200],[hoenn,250],[fire,250]] as const){
    const store=setup();
    try{
      hatch(store,tuning);assert.equal(store.view('p').growthPoints,10000-price);
      store.db.prepare('UPDATE permanent_upgrades SET egg_tickets=3 WHERE player_id=?').run('p');
      hatch(store,tuning,10);assert.equal(store.view('p').growthPoints,10000-price-7*price);
      assert.equal(store.permanentView('p').eggTickets,0);
    }finally{store.close();}
  }
});

test('focused receipt retries canonicalize property order and reject every different tuning without spending or rerolling',()=>{
  let calls=0;const store=setup(()=>{calls++;return 0;});
  try{
    const id=randomUUID(),result=hatch(store,hoenn,1,id),before=store.view('p'),draws=calls;
    assert.deepEqual(hatch(store,{region:'hoenn',kind:'region'},1,id),result);
    assert.equal(calls,draws);
    for(const other of [undefined,{kind:'none'},{kind:'region',region:'kanto'},fire]){
      assert.throws(()=>hatch(store,other,1,id),(error:unknown)=>error instanceof BattleRequestError&&error.status===409);
    }
    assert.deepEqual(store.view('p'),before);assert.equal(calls,draws);
    const row=store.db.prepare('SELECT payload FROM permanent_receipts WHERE player_id=? AND request_id=?').get('p',id) as {payload:string};
    assert.deepEqual(JSON.parse(row.payload).tuning,hoenn);
  }finally{store.close();}
});

test('legacy paid receipts still replay with none, but cannot be reused for a focused purchase',()=>{
  const store=setup();
  try{
    const id=randomUUID(),legacy=store.permanentAction('p',id,'hatch','egg',1,null,'rare');
    assert.deepEqual(hatch(store,{kind:'none'},1,id),legacy);
    assert.throws(()=>hatch(store,hoenn,1,id),/같은 요청/);
    const normalId=randomUUID();hatch(store,undefined,1,normalId);
    assert.throws(()=>hatch(store,hoenn,1,normalId),/같은 요청/);
  }finally{store.close();}
});

test('retired event receipts replay their saved result while new unknown-event purchases are rejected',()=>{
  let draws=0;const store=setup(()=>{draws++;return 0;});
  try{
    const id=randomUUID(),result=hatch(store,hoenn,1,id),event={kind:'event',eventId:'retired-fixture'};
    const payload=JSON.stringify({action:'hatch',product:'egg',count:1,species:null,eggKind:'machine',tuning:event});
    // Model a receipt paid while the fixture event was registered, without
    // adding any real event content to the production registry.
    store.db.prepare('UPDATE permanent_receipts SET payload=? WHERE player_id=? AND request_id=?').run(payload,'p',id);
    const before=store.view('p'),calls=draws;
    assert.deepEqual(hatch(store,event,1,id),result);
    assert.equal(draws,calls);assert.deepEqual(store.view('p'),before);
    assert.throws(()=>hatch(store,event),(error:unknown)=>error instanceof BattleRequestError&&error.status===400);
    assert.equal(draws,calls);assert.deepEqual(store.view('p'),before);
  }finally{store.close();}
});

test('insufficient points and a failed grant roll back tickets, currency, unlocks and receipts together',()=>{
  const store=setup(()=>0,249);
  try{
    store.db.prepare('INSERT INTO permanent_upgrades VALUES (?,0,0,9)').run('p');
    const before=store.view('p'),id=randomUUID();
    assert.throws(()=>hatch(store,hoenn,10,id),/부족/);
    assert.deepEqual(store.view('p'),before);
    store.db.prepare('UPDATE players SET growth_points=250 WHERE id=?').run('p');
    const funded=store.view('p');
    store.db.exec("CREATE TRIGGER fail_tuned_grant BEFORE INSERT ON unlocks BEGIN SELECT RAISE(ABORT,'grant failed'); END");
    assert.throws(()=>hatch(store,hoenn,10,id),/grant failed/);
    assert.deepEqual(store.view('p'),funded);
    assert.equal((store.db.prepare('SELECT COUNT(*) AS count FROM permanent_receipts').get() as {count:number}).count,0);
    store.db.exec('DROP TRIGGER fail_tuned_grant');hatch(store,hoenn,10,id);
    assert.equal(store.view('p').growthPoints,0);assert.equal(store.permanentView('p').eggTickets,0);
  }finally{store.close();}
});

test('tuning cannot modify legacy egg-kind draws, ticket purchases or shiny exchanges',()=>{
  const store=setup();
  try{
    const before=store.view('p');
    for(const [action,product,kind] of [['hatch','egg','rare'],['hatch','egg','normal'],['buy','egg','normal'],['shiny','shiny','normal']]){
      assert.throws(()=>store.permanentAction('p',randomUUID(),action,product,1,null,kind,hoenn),/공통 알 뽑기/);
    }
    assert.deepEqual(store.view('p'),before);
  }finally{store.close();}
});
