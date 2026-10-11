import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SupportPlayerPolicy} from '../src/battle/support-player-policy';
import type {Observation,OwnPokemon} from '../src/battle/policy';
import {defaultProfile} from '../src/server/training';
import {packTeam} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {CautiousSwitchingPolicy} from '../src/battle/switch-policy';

const own=(name:string,active:boolean,moves:string[]):OwnPokemon=>({ident:'p1: '+name,details:name,condition:'200/200',active,moves,item:active?'Light Clay':'',ability:name==='Gyarados'?'Intimidate':'Synchronize',stats:{atk:150,spa:130,def:100,spd:100,spe:active?160:100}});
const obs=():Observation=>({turn:1,ownTeam:[own('Espeon',true,['Psychic','Reflect','Light Screen']),own('Gyarados',false,['Waterfall','Dragon Dance']),own('Scizor',false,['Bullet Punch','Swords Dance'])],opponent:{species:'Tauros',condition:'100/100'},legalActions:[{command:'move 1',label:'Psychic',estimatedDamage:30},{command:'move 2',label:'Reflect',estimatedDamage:0},{command:'move 3',label:'Light Screen',estimatedDamage:0},{command:'switch 2',label:'Gyarados',estimatedDamage:-1},{command:'switch 3',label:'Scizor',estimatedDamage:-1}],switching:{boosts:{},hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},opponentTypes:['Normal'],dynamax:false}});
test('a successful screen is followed by a safe setup receiver, with Light Clay duration',()=>{
 const p=new SupportPlayerPolicy(),o=obs();assert.equal(p.choose(o),'move 2');assert.equal(p.decisionReason,'safe-screen');
 p.consumePublicLine('|turn|1');p.consumePublicLine('|-sidestart|p1: Player|Reflect');o.turn=2;
 assert.equal(p.choose(o),'switch 2');assert.equal(p.decisionReason,'screen-handoff');assert.equal(p.context().screens.reflect,7);
});
test('lethal pressure, a revealed wall breaker and trapping do not waste the turn',()=>{
 const p=new SupportPlayerPolicy(),o=obs();o.ownTeam[0].condition='20/200';o.ownTeam[0].stats.spe=20;assert.notEqual(p.choose(o),'move 2');
 const q=new SupportPlayerPolicy(),b=obs();b.lastOpponentMove='Brick Break';assert.notEqual(q.choose(b),'move 2');
 const r=new SupportPlayerPolicy(),t=obs();r.choose(t);r.consumePublicLine('|-sidestart|p1: Player|Reflect');t.turn=2;t.switching!.maybeTrapped=true;assert(!r.choose(t).startsWith('switch '));
});
test('walls do not repeat while active, after removal they can be reconsidered',()=>{
 const p=new SupportPlayerPolicy(),o=obs();p.choose(o);p.consumePublicLine('|-sidestart|p1: Player|Reflect');
 o.legalActions=o.legalActions.filter(a=>!a.command.startsWith('switch'));o.turn=2;assert.notEqual(p.choose(o),'move 2');
 p.consumePublicLine('|-sideend|p1: Player|Reflect');assert.equal(p.choose(o),'move 2');
});
test('snow is required for Aurora Veil and an available finishing hit comes first',()=>{
 const p=new SupportPlayerPolicy(),o=obs();o.legalActions[1].label='Aurora Veil';assert.notEqual(p.choose(o),'move 2');
 p.consumePublicLine('|-weather|Snow');assert.equal(p.choose(o),'move 2');
 o.opponent!.condition='1/100';assert.equal(p.choose(o),'move 1');assert.equal(p.decisionReason,'finishing-hit');
});
test('a safe protected attacker sets up, then attacks instead of endlessly repeating',()=>{
 const p=new SupportPlayerPolicy(),o=obs();p.choose(o);p.consumePublicLine('|-sidestart|p1: Player|Reflect');
 o.ownTeam[0].active=false;o.ownTeam[1].active=true;o.ownTeam[1].item='';o.legalActions=[{command:'move 1',label:'Waterfall',estimatedDamage:30},{command:'move 2',label:'Dragon Dance',estimatedDamage:0}];o.turn=2;
 assert.equal(p.choose(o),'move 2');assert.equal(p.decisionReason,'screen-setup');
 o.switching!.boosts={atk:2,spe:2};assert.equal(p.choose(o),'move 1');
});
test('trick room evaluates our speed boosts and does not reverse an active room',()=>{
 const p=new SupportPlayerPolicy(),o=obs();o.ownTeam[0]=own('Slowbro',true,['Scald','Trick Room']);for(const q of o.ownTeam)q.stats.spe=40;
 o.legalActions=[{command:'move 1',label:'Scald',estimatedDamage:20},{command:'move 2',label:'Trick Room',estimatedDamage:0}];
 assert.equal(p.choose(o),'move 2');p.consumePublicLine('|-fieldstart|move: Trick Room');assert.equal(p.choose(o),'move 1');
 p.consumePublicLine('|-fieldend|move: Trick Room');o.switching!.boosts.spe=6;assert.equal(p.choose(o),'move 1');
});
test('real walls and handoff finish legally, deterministically and replay exactly',async()=>{
 const names=['Espeon','Gyarados','Scizor'],profiles=Object.fromEntries(names.map(n=>[n,defaultProfile(n)]));
 profiles.Espeon.moves=['Psychic','Reflect','Light Screen','Baton Pass'];profiles.Gyarados.moves=['Waterfall','Ice Fang','Earthquake','Dragon Dance'];profiles.Scizor.moves=['Bullet Punch','U-turn','Roost','Swords Dance'];
 for(const q of Object.values(profiles)){q.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};q.evs={hp:32,atk:0,def:0,spa:2,spd:0,spe:32};q.nature='Timid';}
 const battle=async()=>{const p=new SupportPlayerPolicy();return runBattle({rule:'basic',teams:{p1:packTeam(names,profiles,{Espeon:'Light Clay'}),p2:packTeam(['Tauros','Blastoise','Venusaur'])},player:p,opponent:new CautiousSwitchingPolicy(),onPlayerLine:line=>p.consumePublicLine(line)});};
 const a=await battle(),b=await battle();assert(a.publicProtocol.some(l=>l.startsWith('|-sidestart|p1:')&&l.includes('Reflect')));
 assert(a.decisions.some(d=>d.side==='p1'&&d.action.startsWith('switch ')&&d.observation.legalActions.some(a=>a.command.startsWith('move '))));
 assert.deepEqual(battleEvents(a.publicProtocol),battleEvents(b.publicProtocol));const replay=await replayBattle(a);assert.deepEqual(battleEvents(a.publicProtocol),battleEvents(replay.publicProtocol));
});
