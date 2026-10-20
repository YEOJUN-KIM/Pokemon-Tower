import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {raidFixture} from './raid-fixture';
import {createRaidSnapshot} from '../src/server/raid-events';
import {raidBossDefinitions,type RaidSnapshot} from '../src/data/raids';
import {installRaid} from '../src/battle/raid';
import {installTowerGimmicks} from '../src/battle/gimmicks';
import {installGolisopodMega} from '../src/battle/golisopod-mega';
import {FORMAT} from '../src/battle/run';
import {packTeam,POINT_TEAM_MARKER} from '../src/data/teams';
import {trainedStat} from '../src/data/training';
import {clampRaidDamage,raidPhaseEnd,resizeRaidHP,raidGateHP} from '../src/battle/raid-hp';
import {effectiveRaidHP} from '../scripts/lib/raid-simulation';
import {presentationFrames} from '../src/web/battle-presentation';
import {emptyField,advanceField} from '../src/battle/public-field';
import type {BattleView} from '../src/shared/contracts';

function start(raid:RaidSnapshot){
 const battle=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'}),native=battle.statModify.bind(battle);
 battle.statModify=(base,set,key)=>Showdown.toID(set.pokeball).startsWith(POINT_TEAM_MARKER)?trainedStat(base[key],set.ivs[key],set.evs[key],key,set.nature):native(base,set,key);
 const own=Showdown.Teams.unpack(packTeam(['Cloyster','Blastoise','Venusaur']))!;own[0].moves=['Icicle Spear','Protect'];own[0].ability='Skill Link';
 installTowerGimmicks(battle,{p1:own,p2:Showdown.Teams.unpack(raid.opponentTeam)!},undefined,'basic','basic',undefined,[],true,true);installGolisopodMega(battle);installRaid(battle,raid);
 const damage=battle.actions.getDamage.bind(battle.actions);battle.actions.getDamage=(source,...args)=>source.side.id==='p1'?1000000:damage(source,...args);
 battle.setPlayer('p1',{name:'Player',team:Showdown.Teams.pack(own)});battle.setPlayer('p2',{name:'Tower AI',team:raid.opponentTeam});battle.makeChoices('team 123','team '+raid.phases.map((_,i)=>i+1).join(''));
 return battle;
}
test('70% - 40% stops at 50%; resizing and cumulative thresholds have explicit percentage semantics',()=>{
 assert.equal(clampRaidDamage(140,200,.5,80),40);assert.equal(clampRaidDamage(100,200,.5,999),0);assert.equal(resizeRaidHP(100,200,300),150);
 assert.deepEqual([0,1,2].map(i=>raidPhaseEnd({phases:[{hpRatio:.34},{hpRatio:.33},{hpRatio:.33}] as RaidSnapshot['phases']},i)),[.66,.33,0]);
});
test('actual Pokemon damage and direct faint cannot bypass a gate or consume a life',()=>{
 const f=raidFixture(':memory:','clamp','garchomp','mega'),battle=start(f.snapshot);
 try{
  const boss=battle.p2.active[0];boss.maxhp=200;boss.hp=140;
  assert.equal(boss.damage(80,battle.p1.active[0]),40);assert.equal(boss.hp,100);
  assert.equal(boss.damage(9999,battle.p1.active[0]),0);assert.equal(boss.hp,100);
  boss.faint(battle.p1.active[0]);assert.equal(boss.hp,100);assert.equal(boss.fainted,false);assert.equal(boss.faintQueued,false);assert.equal(boss.side.pokemonLeft,1);
 }finally{battle.destroy();f.store.close();}
});
for(const boss of raidBossDefinitions)for(const route of boss.routes)test(`${boss.id}/${route.id}: current data uses native HP, gates every phase and preserves real transformations`,()=>{
 const f=raidFixture(':memory:',boss.id,boss.id,route.id),raid=f.snapshot,battle=start(raid),hp=effectiveRaidHP(raid);
 try{
  assert.equal(raid.raidHpMultiplier,undefined);assert.equal(raid.hpMode,boss.id==='volcarona'?'replacement-v1':'threshold-v1');
  let previous=1,first=battle.p2.active[0];
  for(const [i,phase]of raid.phases.entries()){
   const current=battle.p2.active[0];battle.p1.active[0].hp=battle.p1.active[0].maxhp=1000000;battle.p1.active[0].storedStats.spe=100000;
   assert.equal(current.species.name+(phase.transformation==='gigantamax'?'-Gmax':''),phase.species);
   assert.equal(current.maxhp,hp.phaseMax[i]);assert.equal(current.getAbility().name,phase.ability);assert.deepEqual(current.moveSlots.map(m=>m.id),phase.moves.map(Showdown.toID));
   if(['mewtwo','zacian','rayquaza','kyogre','groudon'].includes(boss.id))for(const key of ['atk','def','spa','spd','spe'] as const)assert.equal(current.storedStats[key],trainedStat(current.species.baseStats[key],raid.individual.ivs[key],raid.individual.evs[key],key,raid.individual.nature));
   if(boss.id==='snorlax'&&i===1){assert.equal(current.maxhp,current.baseMaxhp*2);assert.ok(current.volatiles.dynamax);}
   if(boss.id==='mewtwo'&&i===2){assert.equal(current.boosts.spe,0);assert.equal(current.boosts[route.attack],1);}
   if(boss.id==='terapagos'&&i===1)assert.equal(current.terastallized,'Stellar');
   if(raid.hpMode==='threshold-v1'){
    assert.equal(current,first,'same individual, not a fresh phase life');
    if(i)assert.equal(current.hp,Math.max(1,Math.round(previous*current.maxhp)));
    previous=raidGateHP(current.maxhp,raidPhaseEnd(raid,i))/current.maxhp;
   }else assert.equal(current.hp,current.maxhp);
   battle.makeChoices('move 1',boss.id==='palafin'?'move 2':'move 1');
   if(i<raid.phases.length-1){
    if(raid.hpMode==='replacement-v1'){assert.equal(current.fainted,true);battle.makeChoices('',`switch ${i+2}`);assert.notEqual(battle.p2.active[0],current);}
    else assert.equal(current.fainted,false,'multi-hit overkill cannot KO/skip a gate');
   }
  }
  assert.equal(battle.winner,'Player');
  if(boss.id==='terapagos')assert.ok(battle.log.some(l=>l.includes('ability: Tera Shift')));
  // Battle.log includes private and public split lines for each switch.
  const switches=battle.log.filter(l=>l.startsWith('|switch|p2')).length;assert.equal(switches,raid.phases.length*2);
 }finally{battle.destroy();f.store.close();}
});

test('threshold transformations preserve status and previous boosts; do not heal or activate a new entry hazard',()=>{
 const f=raidFixture(':memory:','state','garchomp','mega'),battle=start(f.snapshot);
 try{
  const boss=battle.p2.active[0];boss.setStatus('brn');boss.boosts.def=2;
  battle.p1.active[0].hp=battle.p1.active[0].maxhp=1000000;battle.p1.active[0].storedStats.spe=100000;
  battle.makeChoices('move 1','move 1');assert.equal(boss.status,'brn');assert.equal(boss.boosts.def,2);assert.ok(boss.hp<=boss.maxhp/2);assert.equal(boss.fainted,false);
 }finally{battle.destroy();f.store.close();}
});

test('public playback preserves native G-Max and ranks across same-individual threshold frames',()=>{
 const f=raidFixture(':memory:','ui','snorlax','gigantamax'),battle=start(f.snapshot);
 try{
  battle.p1.active[0].hp=battle.p1.active[0].maxhp=1000000;battle.p1.active[0].storedStats.spe=100000;
  battle.makeChoices('move 1','move 1');
  const lines:string[]=[];for(let i=0;i<battle.log.length;i++){if(battle.log[i].startsWith('|split|')){lines.push(battle.log[i+2]);i+=2;}else lines.push(battle.log[i]);}
  const before:BattleView={id:'ui',status:'waiting',requestId:1,turn:0,team:[],opponent:null,actions:[],messages:[],winner:null,error:null,field:emptyField()};
  const after:BattleView={...before,turn:2,messages:lines,opponent:{species:'Snorlax',displaySpecies:'Snorlax-Gmax',condition:'50/100',dynamax:true}};
  const frames=presentationFrames(before,after),last=frames.at(-1)!.view;
  assert.equal(last.opponent?.dynamax,true);assert.equal(last.opponent?.displaySpecies,'Snorlax-Gmax');
  assert.ok(frames.some(f=>f.motion?.kind==='raid-aura-reveal'&&f.motion.hpReset===false));
  const field=advanceField({...emptyField(),boosts:{p1:{},p2:{atk:2}}},'|switch|p2a: Snorlax|Snorlax, L50|50/100|[raid-threshold]');assert.equal(field.boosts?.p2.atk,2);
 }finally{battle.destroy();f.store.close();}
});
