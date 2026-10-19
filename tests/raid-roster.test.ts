import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {raidBossDefinitions,type RaidPhaseDefinition} from '../src/data/raids';
import {raidFixture,finishRaidBattle} from './raid-fixture';
import {createRaidSnapshot,RaidEvents} from '../src/server/raid-events';
import {validateRaidHP,raidPhaseHP} from '../src/battle/raid-hp';
import {validateRaidPhase} from '../src/battle/raid-transformation';
import {installRaid} from '../src/battle/raid';
import {installTowerGimmicks} from '../src/battle/gimmicks';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {packTeam,POINT_TEAM_MARKER} from '../src/data/teams';
import {trainedStat} from '../src/data/training';
import {species as catalog,pokemonName} from '../src/data/pokemon-catalog';
import {moveTypeNames} from '../src/data/move-info';
import {pokemonImageSources} from '../src/web/pokemon-image';
import {BattleSession} from '../src/server/battle-session';
import {presentationFrames} from '../src/web/battle-presentation';
import {defaultProfile} from '../src/server/training';
import {TowerStore} from '../src/server/tower-store';

const f=raidFixture();after(()=>f.store.close());
// Keep the original multi-slot/HP-pool transformation suite as legacy replay coverage.
function saved(bossId:string,routeId:string,random=()=>.5){const raid=createRaidSnapshot(f.store.db,f.run,2,random,{bossId,routeId});return {...raid,hpMode:undefined,raidHpMultiplier:raidBossDefinitions.find(b=>b.id===bossId)!.raidHpMultiplier};}
function start(raid:ReturnType<typeof saved>,forceKO=true){
 const battle=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 const original=battle.statModify.bind(battle);
 battle.statModify=(base,set,key)=>Showdown.toID(set.pokeball).startsWith(POINT_TEAM_MARKER)?trainedStat(base[key],set.ivs[key],set.evs[key],key,set.nature):original(base,set,key);
 const own=Showdown.Teams.unpack(packTeam(['Cloyster','Blastoise','Venusaur']))!;own[0].moves=['Icicle Spear','Protect'];own[0].ability='Skill Link';
 installTowerGimmicks(battle,{p1:own,p2:Showdown.Teams.unpack(raid.opponentTeam)!},undefined,'basic','basic',undefined,[],true,true);
 installRaid(battle,raid);
 // Technical phase walk, not a player AI or a win-rate/balance measurement.
 const damage=battle.actions.getDamage.bind(battle.actions);
 if(forceKO)battle.actions.getDamage=(source,...args)=>source.side.id==='p1'?1000000:damage(source,...args);
 battle.setPlayer('p1',{name:'Player',team:Showdown.Teams.pack(own)});battle.setPlayer('p2',{name:'Tower AI',team:raid.opponentTeam});
 battle.makeChoices('team 123','team '+raid.phases.map((_,i)=>i+1).join(''));
 return battle;
}
function effectiveMove(battle:Showdown.Battle,pokemon:Showdown.Pokemon,id:string){
 const move=battle.dex.getActiveMove(id);battle.singleEvent('ModifyType',move,{},pokemon,battle.p1.active[0],move,move);return move;
}

test('the shared pool contains exactly 20 unique requested bosses with normalized HP allocations',()=>{
 const ids=['garchomp','mewtwo','metagross','palafin','snorlax','hoopa','shaymin','volcarona','ogerpon','diancie','groudon','kyogre','rayquaza','arceus','kyurem','zygarde','necrozma','zacian','zamazenta','terapagos'];
 assert.deepEqual(raidBossDefinitions.map(b=>b.id).sort(),ids.sort());
 const total=raidBossDefinitions.reduce((sum,b)=>sum+b.weight,0);let cumulative=0;
 for(const boss of raidBossDefinitions){
  const draw=(cumulative+boss.weight/2)/total;cumulative+=boss.weight;let first=true;
  const snapshot=createRaidSnapshot(f.store.db,f.run,2,()=>{if(first){first=false;return draw;}return .5;});
  assert.equal(snapshot.bossId,boss.id,'reachable through the production weighted pool');
 }
 for(const b of raidBossDefinitions)for(const r of b.routes){
  validateRaidHP({raidHpMultiplier:b.raidHpMultiplier,phases:[...r.phases]});
  assert.ok(b.weight>0);assert.equal(b.minFloor,1);
  for(const phase of r.phases){
   assert.equal(phase.moves.length,4);assert.equal(new Set(phase.moves).size,4);
   if(!['garchomp','mewtwo'].includes(b.id))assert.equal(phase.buffs,undefined);
   for(const option of phase.randomBranch?.options??[phase])validateRaidPhase({...option,randomBranch:undefined},b.species);
  }
 }
 assert.throws(()=>validateRaidHP({raidHpMultiplier:2,phases:[{hpRatio:.5},{hpRatio:.4}] as RaidPhaseDefinition[]}));
 assert.throws(()=>validateRaidHP({raidHpMultiplier:NaN,phases:[]}));
 assert.throws(()=>validateRaidHP({phases:[{hpRatio:.5}] as RaidPhaseDefinition[]}));
});

for(const boss of raidBossDefinitions)for(const route of boss.routes){
 test(`${boss.id}/${route.id}: every real phase has intended HP, native identity/stats, sprites and one transition`,()=>{
  const raid=saved(boss.id,route.id),battle=start(raid);
  try{
   assert.equal(battle.p2.pokemon.length,raid.phases.length);
   for(const [index,phase] of raid.phases.entries()){
    const current=battle.p2.active[0],own=battle.p1.active[0];own.hp=own.maxhp=1000000;own.storedStats.spe=10000;
    const display=phase.transformation==='gigantamax'?current.species.name+'-Gmax':current.species.name;
    assert.equal(display,phase.species);assert.equal(current.getAbility().name,phase.ability);
    assert.deepEqual(current.baseMoveSlots.map(m=>m.id),phase.moves.map(Showdown.toID));
    const native=battle.dex.species.get(current.species.name),nativeHP=trainedStat(native.baseStats.hp,current.set.ivs.hp,current.set.evs.hp,'hp',current.set.nature);
    const expected=raidPhaseHP(nativeHP,nativeHP*(current.volatiles.dynamax?2:1),raid.raidHpMultiplier!,phase.hpRatio!);
    assert.equal(current.baseMaxhp,expected.baseMaxhp);assert.equal(current.maxhp,expected.maxhp);assert.equal(current.hp,current.maxhp);
    for(const stat of ['atk','def','spa','spd','spe'] as const)assert.equal(current.storedStats[stat],trainedStat(native.baseStats[stat],current.set.ivs[stat],current.set.evs[stat],stat,current.set.nature),'no Raid modifier to '+stat);
    assert.deepEqual(current.getTypes(),native.types);
    const shown=catalog[display];assert.ok(shown,display);assert.ok(pokemonName(display).length>0);
    assert.deepEqual(shown.types,native.types.map((t:string)=>moveTypeNames[t]));
    for(const back of [true,false])for(const shiny of [false,true])assert.ok(pokemonImageSources(shown.id,back,false,shown.spriteKey,shiny).some(p=>existsSync('public'+p)),display+' sprite');
    if(phase.species.startsWith('Ogerpon'))assert.equal(effectiveMove(battle,current,'Ivy Cudgel').type,({Ogerpon:'Grass','Ogerpon-Wellspring':'Water','Ogerpon-Cornerstone':'Rock','Ogerpon-Hearthflame':'Fire'} as Record<string,string>)[phase.species]);
    if(phase.species.startsWith('Arceus'))assert.equal(effectiveMove(battle,current,'Judgment').type,current.getTypes()[0]);
    if(phase.transformation==='stellar'){
     assert.equal(current.terastallized,'Stellar');assert.equal(effectiveMove(battle,current,'Tera Starstorm').type,'Stellar');
    }else assert.ok(!current.terastallized);
    if(phase.persistent)assert.ok(current.volatiles.dynamax);
    if(phase.item)assert.equal(current.getItem().name,phase.item);
    battle.makeChoices('move 1','move 1');
    assert.equal(current.fainted,true);
    if(index<raid.phases.length-1){
     battle.makeChoices('',`switch ${index+2}`);
     assert.equal(battle.p2.active[0].status,'');
     if(raid.phases[index+1].transformation!=='gigantamax')assert.equal(battle.p2.active[0].volatiles.dynamax,undefined);
    }
   }
   assert.equal(battle.winner,'Player');
   for(const p of raid.phases.slice(1))for(const message of p.messages!)assert.equal(battle.log.filter(l=>l==='|message|'+message).length,1);
   if(boss.id==='terapagos')assert.ok(battle.log.some(l=>l.includes('ability: Tera Shift')),'base entry uses native Tera Shift');
  }finally{battle.destroy();}
 });
 test(`${boss.id}/${route.id}: complete validated game battle and deterministic replay`,async()=>{
  const raid=saved(boss.id,route.id);
  const log=await runBattle({raid,teams:{p1:packTeam(['Mewtwo','Kyogre','Cloyster']),p2:raid.opponentTeam},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
  assert.ok(log.winner);assert.deepEqual(log.raid,raid);assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 });
}

test('Arceus samples all 17 plate forms, excludes Normal and never repeats P2 in P3',()=>{
 const seen=new Set<string>();
 for(let i=0;i<17;i++){
  let draw=0;const raid=saved('arceus','plates',()=>draw++===0?(i+.1)/17:.99);
  seen.add(raid.phases[1].species);assert.notEqual(raid.phases[1].species,'Arceus');assert.notEqual(raid.phases[2].species,'Arceus');assert.notEqual(raid.phases[1].species,raid.phases[2].species);
  assert.ok(raid.phases[1].branchChoice);assert.ok(!raid.phases.some(p=>p.randomBranch));
  const battle=start(raid);try{assert.equal(battle.p2.active[0].item,'');}finally{battle.destroy();}
 }
 assert.equal(seen.size,17);
});

test('random branches, items and HP snapshots survive persistence/retry without rerolling',()=>{
 for(const bossId of ['volcarona','kyurem','necrozma','arceus']){
  const path=`.data/tests/raid-branch-${randomUUID()}.sqlite`,fixture=raidFixture(path,bossId,bossId);let closed=false;
  try{
   fixture.store.chooseEvent(fixture.owner,fixture.run,fixture.event.id,'challenge');
   const id=fixture.store.currentBattle(fixture.owner)!.id,events=new RaidEvents(fixture.store.db),before=JSON.stringify(events.snapshot(events.forBattle(id)!));
   fixture.store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(fixture.run);
   finishRaidBattle(fixture.store,id,'Tower AI');fixture.store.retry(fixture.owner,fixture.run,id);
   const next=fixture.store.enter(fixture.owner,fixture.run,2,fixture.store.view(fixture.owner).run!.suggestedTeam);
   assert.equal(JSON.stringify(events.snapshot(events.forBattle(next)!)),before);
   const raid=JSON.parse(before);if(bossId==='necrozma')assert.equal(raid.phases[2].sourceSpecies,raid.phases[1].species);
   fixture.store.close();closed=true;const reopened=new TowerStore(path);
   try{const reloaded=new RaidEvents(reopened.db);assert.equal(JSON.stringify(reloaded.snapshot(reloaded.forBattle(next)!)),before);}finally{reopened.close();}
  }finally{if(!closed)fixture.store.close();}
 }
});

test('Snorlax real roster G-Max stays scaled and active after five turns, then a fresh battle is clean',()=>{
 const raid=saved('snorlax','gigantamax'),battle=start(raid,false);
 try{
  const own=battle.p1.active[0];own.hp=own.maxhp=1000000;own.storedStats.spe=10000;
  battle.p2.active[0].hp=1;
  battle.makeChoices('move 1','move 1');battle.makeChoices('','switch 2');const boss=battle.p2.active[0],max=boss.maxhp;
  for(let i=0;i<5;i++){
   try{battle.makeChoices('move 2','move 1');}catch(error){throw Error('persistent turn '+i+' '+battle.requestState+' '+battle.log.slice(-8).join('\n'),{cause:error});}
   assert.ok(boss.volatiles.dynamax);assert.equal(boss.maxhp,max);
  }
  assert.ok(battle.log.some(l=>l.includes('|G-Max Replenish|')));
 }finally{battle.destroy();}
 const next=start(saved('metagross','mega'));try{assert.equal(next.p2.active[0].volatiles.dynamax,undefined);assert.ok(!next.p2.active[0].terastallized);}finally{next.destroy();}
});

test('real Terapagos UI reuses native Stellar playback and clears preceding phase display state',async()=>{
 const raid=saved('terapagos','stellar');
 const profile=defaultProfile('Kyogre');profile.moves=['Water Spout','Ice Beam','Thunder','Surf'];profile.nature='Modest';profile.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};profile.evs={hp:32,atk:0,def:0,spa:32,spd:0,spe:2};
 const own=Showdown.Teams.unpack(packTeam(['Kyogre','Mewtwo','Cloyster'],{Kyogre:profile},{Kyogre:'Choice Specs'}))!;
 const session=new BattleSession(async()=>{},[1,2,3,4],{raid,teams:{p1:Showdown.Teams.pack(own),p2:raid.opponentTeam}});
 try{
  let view=await session.ready();assert.equal(view.status,'waiting');assert.equal(view.opponent?.displaySpecies,'Terapagos-Terastal');
  const first=structuredClone(view);
  for(let i=0;i<30&&view.status==='waiting'&&view.opponent?.displaySpecies!=='Terapagos-Stellar';i++)view=await session.submit(view.id,view.requestId,view.actions.find(a=>a.command==='move 1')?.command??view.actions[0].command);
  assert.notEqual(view.status,'error');
  assert.equal(view.opponent?.displaySpecies,'Terapagos-Stellar');
  assert.equal(view.opponent.terastallized,'Stellar');const frames=presentationFrames(first,view);assert.equal(frames.at(-1)!.view.opponent?.terastallized,'Stellar');
 }finally{await session.dispose();}
});
