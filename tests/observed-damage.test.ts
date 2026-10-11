import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ObservedDamage} from '../src/battle/observed-damage';
import {DamageAwareSupportPlayerPolicy} from '../src/battle/damage-aware-support-player-policy';
import {SupportPlayerPolicy} from '../src/battle/support-player-policy';
import type {Observation} from '../src/battle/policy';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {packTeam} from '../src/data/teams';
import {CautiousSwitchingPolicy} from '../src/battle/switch-policy';
const state=():Observation=>({turn:1,ownTeam:[{ident:'p1: Gyarados',details:'Gyarados',condition:'200/200',active:true,stats:{atk:100,def:110,spa:70,spd:120,spe:120},moves:['Waterfall','Dragon Dance'],ability:'Intimidate',item:''},{ident:'p1: Espeon',details:'Espeon',condition:'150/150',active:false,stats:{atk:60,def:80,spa:160,spd:110,spe:130},moves:['Psychic','Reflect']},{ident:'p1: Scizor',details:'Scizor',condition:'150/150',active:false,stats:{atk:180,def:120,spa:60,spd:100,spe:80},moves:['Bullet Punch']}],opponent:{species:'Clefable',condition:'100/100'},lastOpponentMove:'Moonblast',legalActions:[{command:'move 1',label:'Waterfall',estimatedDamage:30},{command:'move 2',label:'Dragon Dance',estimatedDamage:0}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Fairy']}});
const near=(actual:number,expected:number)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
test('direct observed damage blocks setup that v9 considers safe under a wall',()=>{
 const p=new DamageAwareSupportPlayerPolicy(),baseline=new SupportPlayerPolicy(),o=state();p.observeObservation(o);
 for(const policy of [p,baseline]){policy.consumePublicLine('|turn|1');policy.consumePublicLine('|-sidestart|p1: Player|Light Screen');policy.consumePublicLine('|move|p2a: Clefable|Moonblast|p1a: Gyarados');policy.consumePublicLine('|-damage|p1a: Gyarados|120/200');}
 o.turn=2;o.ownTeam[0].condition='120/200';assert.equal(baseline.choose(o),'move 2');assert.notEqual(p.choose(o),'move 2');assert(p.decisionEvidence.adjustedChecks>0);
});
test('residual damage updates HP but is not treated as an enemy attack',()=>{
 const p=new ObservedDamage(),o=state();p.observe(o);p.consume('|move|p2a: Clefable|Moonblast|p1a: Gyarados');p.consume('|-damage|p1a: Gyarados|175/200|[from] psn');p.consume('|-damage|p1a: Gyarados|150/200|[from] Sandstorm');assert.equal(p.context().records.length,0);assert.equal(p.context().ignored.residual,2);
 p.consume('|-damage|p1a: Gyarados|100/200');near(p.estimate(o.ownTeam[0],o),55);
});
test('multihit damage is accumulated, but a later crit or KO invalidates that attack',()=>{
 const p=new ObservedDamage(),o=state();p.observe(o);p.consume('|move|p2a: Cloyster|Icicle Spear|p1a: Gyarados');p.consume('|-damage|p1a: Gyarados|175/200');p.consume('|-damage|p1a: Gyarados|150/200');near(p.estimate(o.ownTeam[0],o),55);
 p.consume('|-crit|p1a: Gyarados');p.consume('|-damage|p1a: Gyarados|100/200');assert.equal(p.context().records.length,0);
 p.consume('|move|p2a: Cloyster|Icicle Spear|p1a: Gyarados');p.consume('|-damage|p1a: Gyarados|50/200');p.consume('|-damage|p1a: Gyarados|0 fnt');assert.equal(p.context().records.length,0);assert.equal(p.context().ignored.censored,1);
});
test('wall expiry normalizes past direct damage and fixed damage ignores wall factors',()=>{
 const o=state(),p=new ObservedDamage();p.observe(o);p.consume('|-sidestart|p1: Player|Light Screen');p.consume('|move|p2a: Clefable|Moonblast|p1a: Gyarados');p.consume('|-damage|p1a: Gyarados|150/200');near(p.estimate(o.ownTeam[0],o),55);p.consume('|-sideend|p1: Player|Light Screen');near(p.estimate(o.ownTeam[0],o),110);
 const fixed=new ObservedDamage();fixed.observe(o);fixed.consume('|-sidestart|p1: Player|Reflect');fixed.consume('|move|p2a: Chansey|Seismic Toss|p1a: Gyarados');fixed.consume('|-damage|p1a: Gyarados|150/200');fixed.consume('|-sideend|p1: Player|Reflect');near(fixed.estimate(o.ownTeam[0],o),55);
});
test('switching opponents, even to the same species, and public offense changes reset evidence',()=>{
 for(const event of ['|switch|p2a: Clefable|Clefable, L50|100/100','|-boost|p2a: Clefable|spa|1','|-terastallize|p2a: Clefable|Fire']){
  const p=new ObservedDamage(),o=state();p.observe(o);p.consume('|move|p2a: Clefable|Moonblast|p1a: Gyarados');p.consume('|-damage|p1a: Gyarados|150/200');p.consume(event);assert.equal(p.context().records.length,0);
 }
});
test('evidence expires and is not transferred to another ally or changed defenses',()=>{
 const p=new ObservedDamage(),o=state();p.observe(o);p.consume('|move|p2a: Clefable|Moonblast|p1a: Gyarados');p.consume('|-damage|p1a: Gyarados|150/200');assert.equal(p.estimate(o.ownTeam[1],o),0);o.turn=5;assert.equal(p.estimate(o.ownTeam[0],o),0);o.turn=2;o.switching!.boosts.spd=1;assert.equal(p.estimate(o.ownTeam[0],o),0);
});
test('healing is excluded and defense changes before a hit cannot use stale own stats',()=>{
 const p=new ObservedDamage(),o=state();p.observe(o);p.consume('|-heal|p1a: Gyarados|200/200');assert.equal(p.context().records.length,0);p.consume('|-unboost|p1a: Gyarados|spd|1');p.consume('|move|p2a: Clefable|Moonblast|p1a: Gyarados');p.consume('|-damage|p1a: Gyarados|150/200');assert.equal(p.context().records.length,0);
});
test('private enemy requests are ignored and no evidence retains baseline behavior',()=>{
 const p=new DamageAwareSupportPlayerPolicy(),before=p.context();p.consumePublicLine('|request|{"side":{"pokemon":[{"stats":{"spa":999}}]}}');assert.deepEqual(p.context(),before);assert.equal(p.choose(state()),new SupportPlayerPolicy().choose(state()));assert.equal(p.decisionEvidence.adjustedChecks,0);
});
test('a real observed-damage battle stays legal, deterministic and fully replayable',async()=>{
 const run=async()=>{const p=new DamageAwareSupportPlayerPolicy();return runBattle({rule:'basic',teams:{p1:packTeam(['Gyarados','Espeon','Scizor']),p2:packTeam(['Blastoise','Venusaur','Charizard'])},player:p,opponent:new CautiousSwitchingPolicy(),onPlayerLine:l=>p.consumePublicLine(l)});};
 const a=await run(),b=await run();assert.deepEqual(battleEvents(a.publicProtocol),battleEvents(b.publicProtocol));assert.deepEqual(battleEvents(a.publicProtocol),battleEvents((await replayBattle(a)).publicProtocol));
});
