import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AblationSupportPlayerPolicy} from '../src/battle/ablation-support-player-policy';
import {SupportPlayerPolicy} from '../src/battle/support-player-policy';
import type {Observation} from '../src/battle/policy';
const state=():Observation=>({turn:3,ownTeam:[{ident:'p1: Gyarados',details:'Gyarados',condition:'180/200',active:true,stats:{atk:100,def:110,spa:70,spd:120,spe:120},moves:['Waterfall','Dragon Dance'],ability:'Intimidate'},{ident:'p1: Espeon',details:'Espeon',condition:'150/150',active:false,stats:{atk:60,def:80,spa:160,spd:110,spe:130},moves:['Psychic','Reflect']},{ident:'p1: Scizor',details:'Scizor',condition:'150/150',active:false,stats:{atk:180,def:120,spa:60,spd:100,spe:80},moves:['Bullet Punch']}],opponent:{species:'Clefable',condition:'100/100'},lastOpponentMove:'Moonblast',legalActions:[{command:'move 1',label:'Waterfall',estimatedDamage:30},{command:'move 2',label:'Dragon Dance',estimatedDamage:0}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Fairy']}});
test('wall-only change rejects a mismatched wall without changing survival thresholds',()=>{
 const original=new SupportPlayerPolicy(),wall=new AblationSupportPlayerPolicy('wall');for(const p of [original,wall]){p.consumePublicLine('|turn|2');p.consumePublicLine('|-sidestart|p1: Player|Reflect');}
 assert.equal(original.choose(state()),'move 2');assert.notEqual(wall.choose(state()),'move 2');
});
test('setup-only change rejects physical burn setup while wall-only retains baseline choice',()=>{
 const o=state();o.opponent={species:'Magikarp',condition:'100/100'};o.lastOpponentMove='Splash';o.ownTeam[0].condition='180/200 brn';
 assert.equal(new SupportPlayerPolicy().choose(o),'move 2');assert.equal(new AblationSupportPlayerPolicy('wall').choose(o),'move 2');assert.notEqual(new AblationSupportPlayerPolicy('setup').choose(o),'move 2');
});
test('all variants retain the same legal finishing hit when support is unnecessary',()=>{
 const o=state();o.opponent={species:'Magikarp',condition:'1/100'};
 const action=new SupportPlayerPolicy().choose(o);for(const mode of ['wall','handoff','setup','damage'] as const){const p=new AblationSupportPlayerPolicy(mode);assert.equal(p.choose(o),action);assert.equal(p.decisionReason,'finishing-hit');}
});
test('private requests cannot alter the context of any variant',()=>{for(const mode of ['wall','handoff','setup','damage'] as const){const p=new AblationSupportPlayerPolicy(mode),before=p.context();p.consumePublicLine('|request|{"hiddenTeam":"Mewtwo"}');assert.deepEqual(p.context(),before);}});
test('handoff-only change reserves an extra wall turn without altering wall installation',()=>{
 const o=state();o.turn=4;o.opponent={species:'Snorlax',condition:'100/100'};o.lastOpponentMove='Body Slam';o.switching!.opponentTypes=['Normal'];
 o.ownTeam[1]={...o.ownTeam[0],active:false};o.ownTeam[0]={...o.ownTeam[1],active:true,ident:'p1: Espeon',details:'Espeon',moves:['Psychic','Reflect']};
 o.legalActions=[{command:'move 1',label:'Psychic',estimatedDamage:30},{command:'move 2',label:'Reflect',estimatedDamage:0},{command:'switch 2',label:'Gyarados',estimatedDamage:-1}];
 const original=new SupportPlayerPolicy(),candidate=new AblationSupportPlayerPolicy('handoff');
 for(const p of [original,candidate]){p.consumePublicLine('|turn|1');p.consumePublicLine('|-sidestart|p1: Player|Reflect');}
 original.choose(o);candidate.choose(o);assert.equal(original.decisionReason,'screen-handoff');assert.notEqual(candidate.decisionReason,'screen-handoff');
});
