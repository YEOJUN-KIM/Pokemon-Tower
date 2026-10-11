import test from 'node:test';
import assert from 'node:assert/strict';
import {CoverageFactorPolicy} from '../src/battle/coverage-factor-policy';
import {MatchupAwareSupportPlayerPolicy} from '../src/battle/matchup-aware-support-player-policy';
import {AdaptiveCoveragePlayerPolicy} from '../src/battle/adaptive-coverage-player-policy';
import {runBattle,battleEvents} from '../src/battle/run';
import {packTeam} from '../src/data/teams';
import {CautiousSwitchingPolicy} from '../src/battle/switch-policy';
import type {Observation} from '../src/battle/policy';

const o=():Observation=>({turn:2,ownTeam:[{ident:'p1: Torkoal',details:'Torkoal',condition:'150/180',active:true,stats:{atk:100,def:150,spa:150,spd:110,spe:100},ability:'White Smoke',moves:['Flamethrower','Earth Power']}],opponent:{species:'Dachsbun',condition:'100/100'},legalActions:[{command:'move 1',label:'Flamethrower',estimatedDamage:120},{command:'move 2',label:'Earth Power',estimatedDamage:80}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Fairy']}});
test('immunity factor alone changes known fire immunity without enabling switching factor',()=>{
 const p=new CoverageFactorPolicy({immunity:true,switching:false});p.consumePublicLine('|move|p1a: Torkoal|Flamethrower|p2a: Dachsbun');p.consumePublicLine('|-immune|p2a: Dachsbun|[from] ability: Well-Baked Body');assert.equal(p.choose(o()),'move 2');
});
test('switch-only factor preserves the old immunity model',()=>{
 const p=new CoverageFactorPolicy({immunity:false,switching:true}),old=new MatchupAwareSupportPlayerPolicy();
 for(const q of [p,old]){q.consumePublicLine('|move|p1a: Torkoal|Flamethrower|p2a: Dachsbun');q.consumePublicLine('|-immune|p2a: Dachsbun|[from] ability: Well-Baked Body');}
 assert.equal(p.choose(o()),old.choose(o()));
});
test('both endpoints reproduce their frozen policy full protocol and decisions',async()=>{
 for(const enabled of [false,true]){
  const run=async(p:CoverageFactorPolicy|AdaptiveCoveragePlayerPolicy|MatchupAwareSupportPlayerPolicy)=>runBattle({rule:'basic',seed:[15,22,33,44],teams:{p1:packTeam(['Torkoal','Gyarados','Gengar']),p2:packTeam(['Dachsbun','Shedinja','Bronzong'])},player:p,opponent:new CautiousSwitchingPolicy(),onPlayerLine:l=>p.consumePublicLine(l)});
  const a=await run(new CoverageFactorPolicy({immunity:enabled,switching:enabled}));const b=await run(enabled?new AdaptiveCoveragePlayerPolicy():new MatchupAwareSupportPlayerPolicy());
  assert.deepEqual(battleEvents(a.publicProtocol),battleEvents(b.publicProtocol));assert.deepEqual(a.decisions.map(d=>d.action),b.decisions.map(d=>d.action));
 }
});
