import test from 'node:test';
import assert from 'node:assert/strict';
import {readPrePaldeaRound2 as readFileSync} from './pre-paldea-round2';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import baseline from './fixtures/paldea-tuning-baseline.json' with {type:'json'};
import {PaldeaPolicy} from '../src/battle/paldea-policy';
import {DamagePolicy,type Observation,type OwnPokemon} from '../src/battle/policy';
import {packTeam} from '../src/data/teams';
import {FORMAT} from '../src/battle/run';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
test('only the four requested items and Poppy middle change; all other data and common AI stay frozen',()=>{
 for(const [path,reference]of Object.entries(baseline.paths)){
  const d=JSON.parse(readFileSync(path,'utf8')),rows=d.trainers??d.samples??d;
  assert.equal(digest(JSON.stringify(rows.filter((r:{id:string})=>!baseline.ids.includes(r.id)))),reference.otherHash,path);
  const expected:any[]=structuredClone(reference.rows);
  for(const r of expected){
   for(const p of r.team){if(r.id==='named-iono'&&p.species==='Kilowattrel'||r.id==='named-tulip'&&p.species==='Espathra'||r.id==='named-hassel'&&p.species==='Noivern'||r.id==='named-rika'&&p.species==='Camerupt')p.item='';}
   if(r.id!=='named-poppy')continue;
   if(r.entries)r.entries=r.entries.map((n:string)=>n==='Corviknight'?'Magnezone':n);
   if(r.required)r.required=r.required.map((n:string)=>n==='Corviknight'?'Magnezone':n);
   if(r.concept)r.concept='설치 + 빛의장막 특수 압박 + 거대해머';
   const p=r.team[1];p.species='Magnezone';p.item='Light Clay';
   const build=p.profile??p;build.ability='Sturdy';build.nature='Modest';build.moves=['Light Screen','Tri Attack','Flash Cannon','Discharge'];
   if(build.evs)build.evs={hp:32,atk:0,def:0,spa:32,spd:2,spe:0};
  }
  assert.deepEqual(rows.filter((r:{id:string})=>baseline.ids.includes(r.id)),expected,path);
 }
 for(const [path,hash]of Object.entries(baseline.hashes)){
  let text=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  if(path==='src/battle/paldea-policy.ts')text=text.replace(/   \/\/ Poppy Light Screen begin:[\s\S]*?   \/\/ Poppy Light Screen end\.\n/,'');
  assert.equal(digest(text),hash,path);
 }
});

const magnezone=():OwnPokemon=>({ident:'p2: Magnezone',details:'Magnezone, L50',active:true,condition:'200/200',stats:{atk:70,def:140,spa:130,spd:110,spe:80},ability:'Sturdy',item:'Light Clay',moves:['Light Screen','Tri Attack','Flash Cannon','Discharge']});
const observation=():Observation=>({turn:4,ownTeam:[magnezone(),{...magnezone(),ident:'p2: Tinkaton',details:'Tinkaton, L50',active:false}],opponent:{species:'Lapras',condition:'100/100'},lastOpponentMove:'Surf',legalActions:[{command:'move 1',label:'Light Screen',estimatedDamage:0},{command:'move 2',label:'Tri Attack',estimatedDamage:30},{command:'move 3',label:'Flash Cannon',estimatedDamage:20},{command:'move 4',label:'Discharge',estimatedDamage:70}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:[]}});
const policy=()=>new PaldeaPolicy(new DamagePolicy(),'elite','Tinkaton').withTera('Steel');
test('Poppy Light Screen supports a surviving ally against a revealed special threat',()=>{
 const o=observation();assert.equal(policy().choose(o),'move 1');
});
test('Poppy attacks instead of screening physical, unknown, KO or ally-less situations',()=>{
 for(const setup of [(o:Observation)=>{o.lastOpponentMove='Earthquake';o.opponent!.species='Garchomp';},(o:Observation)=>{delete o.lastOpponentMove;},(o:Observation)=>{o.opponent!.condition='1/100';},(o:Observation)=>{o.ownTeam[1].condition='0 fnt';}]){const o=observation();setup(o);assert.notEqual(policy().choose(o),'move 1');}
});
test('Light Screen cannot be duplicated while active or spammed after the first selection',()=>{
 const o=observation(),active=policy();active.observePublicLine('|-sidestart|p2: Tower AI|move: Light Screen');assert.notEqual(active.choose(o),'move 1');
 const p=policy();assert.equal(p.choose(o),'move 1');assert.notEqual(p.choose({...o,turn:5}),'move 1');p.observePublicLine('|-sideend|p2: Tower AI|move: Light Screen');assert.notEqual(p.choose({...o,turn:12}),'move 1');
});
test('the screen rule is scoped to Poppy Magnezone and does not change another trainer',()=>{
 assert.notEqual(new PaldeaPolicy(new DamagePolicy(),'elite','Clodsire').choose(observation()),'move 1');
 const o=observation();o.ownTeam[0].details='Corviknight, L50';assert.notEqual(policy().choose(o),'move 1');
});
test('real engine: Sturdy secures Light Screen, Light Clay lasts 8 turns, and Tinkaton inherits it',()=>{
 const own=Showdown.Teams.unpack(packTeam(['Magnezone','Tinkaton','Copperajah']))!,foe=Showdown.Teams.unpack(packTeam(['Charizard','Blastoise','Venusaur']))!;
 own[0].ability='Sturdy';own[0].item='Light Clay';own[0].moves=['Light Screen','Protect'];foe[0].moves=['Flamethrower','Splash'];
 const b=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 try{
  b.setPlayer('p1',{name:'Player',team:foe});b.setPlayer('p2',{name:'Tower AI',team:own});b.makeChoices('team 123','team 123');
  // A known lethal hit verifies the actual Sturdy event, not an assumed Sash.
  b.p1.active[0].boosts.spa=6;b.makeChoices('move 1','move 1');assert.equal(b.p2.active[0].hp,1);assert.ok(b.log.some(l=>l.includes('Sturdy')));assert.equal(b.p2.sideConditions.lightscreen.duration,7);
  b.makeChoices('move 2','switch 2');assert.equal(b.p2.active[0].baseSpecies.name,'Tinkaton');assert.ok(b.p2.sideConditions.lightscreen);
  const p=b.p2.active[0],move=b.dex.getActiveMove('Flamethrower'),rng=b.prng.clone();move.willCrit=false;const withScreen=b.actions.getDamage(b.p1.active[0],p,move) as number;
  b.p2.removeSideCondition('lightscreen');b.prng=rng;const without=b.actions.getDamage(b.p1.active[0],p,move) as number;assert.ok(withScreen<without*.6);
 }finally{b.destroy();}
});
