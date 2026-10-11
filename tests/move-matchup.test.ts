import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import chart from '../src/data/type-chart.json';
import {publicMoveEffectiveness} from '../src/data/type-effectiveness';
import {moveMatchup} from '../src/web/move-matchup';
import {RevealedImmunity} from '../src/battle/revealed-immunity';
import {MatchupAwareSupportPlayerPolicy} from '../src/battle/matchup-aware-support-player-policy';
import type {Observation} from '../src/battle/policy';
import type {BattleView} from '../src/web/contracts';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {packTeam} from '../src/data/teams';
import {CautiousSwitchingPolicy} from '../src/battle/switch-policy';
const observation=():Observation=>({turn:1,ownTeam:[{ident:'p1: Garchomp',details:'Garchomp',condition:'150/180',active:true,stats:{atk:160,def:110,spa:80,spd:100,spe:130},moves:['Earthquake','Dragon Claw'],ability:'Rough Skin'}],opponent:{species:'Bronzong',condition:'100/100'},legalActions:[{command:'move 1',label:'Earthquake',estimatedDamage:120},{command:'move 2',label:'Dragon Claw',estimatedDamage:30}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Steel','Psychic']}});
const view=(species:string):BattleView=>({id:'test',requestId:1,status:'waiting',turn:1,team:[{species:'Gengar',active:true,condition:'100/100',ability:'Cursed Body',teraType:'Fire'}],opponent:{species,condition:'100/100'},actions:[],messages:[],winner:null,error:null});
const pp=(name:string)=>({name,pp:10,maxpp:10});
test('all 324 chart cells match the installed battle engine',()=>{for(const [a,row] of Object.entries(chart))for(const [d,value] of Object.entries(row))assert.equal(value,Showdown.Dex.getImmunity(a,[d])?2**Showdown.Dex.getEffectiveness(a,[d]):0,`${a}/${d}`);});
test('normal/ghost immunity, dual-type weakness and resistance markers',()=>{
 assert.deepEqual(moveMatchup(view('Snorlax'),pp('Shadow Ball')),{kind:'immune',value:0});
 assert.deepEqual(moveMatchup(view('Scizor'),pp('Flamethrower')),{kind:'strong',value:4});
 assert.deepEqual(moveMatchup(view('Charizard'),pp('Flamethrower')),{kind:'weak',value:.5});
 assert.equal(moveMatchup(view('Snorlax'),pp('Swords Dance')),null);
});
test('enemy tera, actual Max move type and selected Tera Blast update the marker',()=>{
 const v=view('Scizor');v.opponent!.terastallized='Water';assert.equal(moveMatchup(v,pp('Flamethrower'))?.value,.5);
 assert.equal(moveMatchup(view('Scizor'),{...pp('Max Flare'),type:'Fire',category:'Special'})?.value,4);
 assert.equal(moveMatchup(view('Scizor'),pp('Tera Blast'),true)?.value,4);
});
test('only publicly revealed enemy abilities affect the UI; switching clears them',()=>{
 const v=view('Bronzong');assert.equal(moveMatchup(v,pp('Earthquake'))?.value,2);
 v.messages=['|-immune|p2a: Bronzong|[from] ability: Levitate'];assert.equal(moveMatchup(v,pp('Earthquake'))?.value,0);
 v.messages.push('|switch|p2a: Bronzong|Bronzong, L50|100/100');assert.equal(moveMatchup(v,pp('Earthquake'))?.value,2);
});
test('fixed damage, Freeze-Dry, Mold Breaker and Scrappy exceptions',()=>{
 assert.equal(moveMatchup(view('Tyranitar'),pp('Seismic Toss'))?.value,1);
 assert.equal(moveMatchup(view('Gengar'),pp('Seismic Toss'))?.value,0);
 assert.equal(publicMoveEffectiveness({type:'Ice',defending:['Water','Flying'],move:'Freeze-Dry'}),4);
 assert.equal(publicMoveEffectiveness({type:'Ground',defending:['Steel','Psychic'],ability:'Levitate',ownAbility:'Mold Breaker'}),2);
 assert.equal(publicMoveEffectiveness({type:'Normal',defending:['Ghost'],ownAbility:'Scrappy'}),1);
});
test('player learns Levitate from a failed move and chooses a hittable alternative',()=>{
 const p=new MatchupAwareSupportPlayerPolicy();p.consumePublicLine('|move|p1a: Garchomp|Earthquake|p2a: Bronzong');p.consumePublicLine('|-immune|p2a: Bronzong|[from] ability: Levitate');assert.equal(p.choose(observation()),'move 2');
 const m=new RevealedImmunity();m.consume('|request|{"hiddenAbility":"Levitate"}');assert.equal(m.context().revealedAbility,'');
});
test('Wonder Guard revelation blocks neutral moves but keeps super-effective moves',()=>{
 const p=new MatchupAwareSupportPlayerPolicy(),o=observation();o.opponent!.species='Shedinja';o.switching!.opponentTypes=['Bug','Ghost'];o.legalActions[1]={command:'move 2',label:'Fire Fang',estimatedDamage:80};
 p.consumePublicLine('|move|p1a: Garchomp|Earthquake|p2a: Shedinja');p.consumePublicLine('|-immune|p2a: Shedinja|[from] ability: Wonder Guard');assert.equal(p.choose(o),'move 2');
});
test('switch and type changes reset evidence; an unknown failure is move-specific',()=>{
 const m=new RevealedImmunity(),o=observation();m.consume('|move|p1a: Garchomp|Earthquake|p2a: Bronzong');m.consume('|-immune|p2a: Bronzong');assert(m.blocked('Earthquake',o.ownTeam[0],o));assert(!m.blocked('Dragon Claw',o.ownTeam[0],o));
 m.consume('|switch|p2a: Bronzong|Bronzong|100/100');assert(!m.blocked('Earthquake',o.ownTeam[0],o));
});
test('public Fairy tera cannot be attacked with Dragon Claw even after a boost',()=>{
 const p=new MatchupAwareSupportPlayerPolicy(),o=observation();o.opponent!.species='Garchomp';o.switching!.opponentTypes=['Fairy'];o.switching!.boosts.atk=2;assert.equal(p.choose(o),'move 1');
});
test('experimental matchup player remains legal and exactly replayable in a real battle',async()=>{
 const p=new MatchupAwareSupportPlayerPolicy();const log=await runBattle({rule:'basic',teams:{p1:packTeam(['Garchomp','Gyarados','Gengar']),p2:packTeam(['Bronzong','Shedinja','Snorlax'])},player:p,opponent:new CautiousSwitchingPolicy(),onPlayerLine:l=>p.consumePublicLine(l)});assert.deepEqual(battleEvents(log.publicProtocol),battleEvents((await replayBattle(log)).publicProtocol));
});
