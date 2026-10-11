import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile} from '../src/server/training';
import {evaluateTeam,selectCompositionTeam,selectCompositionMoves,recruitForComposition,compositionNeeds} from '../src/battle/team-composition';
import {CompositionPolicy} from '../src/battle/composition-policy';
import type {Observation,OwnPokemon} from '../src/battle/policy';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {packTeam} from '../src/data/teams';
import {CautiousSwitchingPolicy} from '../src/battle/switch-policy';

const profiles=(names:string[])=>Object.fromEntries(names.map(n=>[n,defaultProfile(n)]));
test('ground immunity fills the shared electric weakness of a water core',()=>{
 const p=profiles(['Gyarados','Milotic','Slowbro','Gastrodon']);
 assert(compositionNeeds(['Gyarados','Milotic','Slowbro'],p).sharedWeaknesses.includes('Electric'));
 assert(!compositionNeeds(['Gyarados','Milotic','Gastrodon'],p).sharedWeaknesses.includes('Electric'));
});
test('room synergy depends on the actual speed of the other members',()=>{
 const names=['Slowbro','Snorlax','Torkoal'],p=profiles(names);p.Slowbro.moves=['Scald','Psychic','Slack Off','Trick Room'];
 const withRoom=evaluateTeam(names,p);p.Slowbro.moves=['Scald','Psychic','Slack Off','Protect'];
 assert(withRoom>evaluateTeam(names,p));
 const fast=profiles(['Slowbro','Jolteon','Aerodactyl']);fast.Slowbro.moves=['Scald','Psychic','Slack Off','Trick Room'];
 const bad=evaluateTeam(Object.keys(fast),fast);fast.Slowbro.moves=['Scald','Psychic','Slack Off','Protect'];
 assert(bad<evaluateTeam(Object.keys(fast),fast));
});
test('a screen with setup partners survives move collection, with a real attack',()=>{
 const p=profiles(['Espeon','Gyarados','Scizor']);p.Gyarados.moves=['Waterfall','Dragon Dance'];p.Scizor.moves=['Bullet Punch','Swords Dance'];
 const chosen=selectCompositionMoves('Espeon',p.Espeon,['Psychic','Reflect','Light Screen','Baton Pass','Tackle','Swift'],p);
 assert(chosen.includes('Psychic'));assert(chosen.includes('Reflect'));assert(chosen.includes('Light Screen'));assert.equal(new Set(chosen).size,4);
});
test('a neutral or worse recruit is rejected and the owned training is retained',()=>{
 const names=['Garchomp','Gyarados','Gengar'],p=profiles(names);
 for(const q of Object.values(p)){q.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};q.evs={hp:13,atk:32,def:0,spa:0,spd:0,spe:21};}
 const saved=structuredClone(p),before=evaluateTeam(selectCompositionTeam(p),p);
 const result=recruitForComposition(p,[{species:'Delibird',moves:['Present','Tackle'],ivs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0}}],defaultProfile);
 assert.equal(result.selected,null);assert.deepEqual(p,saved);assert.equal(result.afterScore,before);
});
test('recruitment is invariant to candidate order and does not lower team utility',()=>{
 const base=profiles(['Venusaur','Charizard','Blastoise']),options=[{species:'Gastrodon',moves:['Earth Power','Scald','Recover','Ice Beam']},{species:'Dragonite',moves:['Dragon Claw','Fire Punch','Roost','Dragon Dance']}];
 const a=structuredClone(base),b=structuredClone(base),x=recruitForComposition(a,options,defaultProfile),y=recruitForComposition(b,[...options].reverse(),defaultProfile);
 assert.equal(x.selected,y.selected);assert.deepEqual(a,b);assert(x.afterScore>=x.beforeScore);
});
const own=(name:string,speed:number,active:boolean):OwnPokemon=>({ident:'p1: '+name,details:name,condition:'180/180',active,stats:{atk:80,spa:80,def:100,spd:100,spe:speed},moves:['psychic','reflect','trickroom']});
const observation=():Observation=>({turn:1,ownTeam:[own('Slowbro',40,true),own('Snorlax',35,false),own('Torkoal',25,false)],opponent:{species:'Tauros',condition:'100/100'},legalActions:[{command:'move 1',label:'Psychic',estimatedDamage:20},{command:'move 2',label:'Reflect',estimatedDamage:0},{command:'move 3',label:'Trick Room',estimatedDamage:0}]});
test('public active screen and room prevent redundant support moves',()=>{
 const p=new CompositionPolicy(),o=observation();assert.equal(p.choose(o),'move 2');
 p.consumePublicLine('|-sidestart|p1: Player|Reflect');assert.equal(p.choose(o),'move 3');
 p.consumePublicLine('|-fieldstart|move: Trick Room');assert.equal(p.choose(o),'move 1');
 p.consumePublicLine('|-sideend|p1: Player|Reflect');assert.equal(p.choose(o),'move 2');
});
test('fast partners do not trigger trick room, and a finishing hit is preferred',()=>{
 const p=new CompositionPolicy(),o=observation();o.legalActions=o.legalActions.filter(a=>a.label!=='Reflect');o.ownTeam[1].stats.spe=200;
 assert.equal(p.choose(o),'move 1');o.ownTeam[1].stats.spe=35;o.legalActions[0].estimatedDamage=1000;assert.equal(p.choose(o),'move 1');
});
test('a real slow team establishes trick room and its recorded battle replays exactly',async()=>{
 const names=['Slowbro','Snorlax','Torkoal'],p=profiles(names);p.Slowbro.moves=['Scald','Psychic','Slack Off','Trick Room'];
 for(const q of Object.values(p)){q.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:0};q.evs={hp:32,atk:0,def:2,spa:32,spd:0,spe:0};q.nature='Quiet';}
 const player=new CompositionPolicy();
 const result=await runBattle({rule:'basic',teams:{p1:packTeam(names,p),p2:packTeam(['Tauros','Charizard','Aerodactyl'])},player,opponent:new CautiousSwitchingPolicy(),onPlayerLine:line=>player.consumePublicLine(line)});
 assert(result.publicProtocol.some(line=>line.startsWith('|-fieldstart|move: Trick Room')));
 const replay=await replayBattle(result);assert.deepEqual(battleEvents(replay.publicProtocol),battleEvents(result.publicProtocol));
});
