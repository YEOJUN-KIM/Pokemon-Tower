import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicImmunityV2} from '../src/battle/public-immunity-v2';
import {AdaptiveCoveragePlayerPolicy} from '../src/battle/adaptive-coverage-player-policy';
import type {Observation,OwnPokemon} from '../src/battle/policy';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {packTeam} from '../src/data/teams';
import {CautiousSwitchingPolicy} from '../src/battle/switch-policy';

const own=(name:string,moves:string[],active=false,ability='Pressure'):OwnPokemon=>({ident:'p1: '+name,details:name,condition:'150/180',active,stats:{atk:160,def:110,spa:160,spd:100,spe:130},moves,ability});
const obs=():Observation=>({turn:1,ownTeam:[own('Espeon',['Psychic'],true,'Synchronize'),own('Gyarados',['Crunch'],false,'Intimidate'),own('Scizor',['Bullet Punch'],false,'Technician')],opponent:{species:'Shedinja',condition:'100/100'},legalActions:[{command:'move 1',label:'Psychic',estimatedDamage:120},{command:'switch 2',label:'Gyarados',estimatedDamage:0},{command:'switch 3',label:'Scizor',estimatedDamage:0}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Bug','Ghost']}});
const reveal=(p:AdaptiveCoveragePlayerPolicy)=>{p.consumePublicLine('|move|p1a: Espeon|Psychic|p2a: Shedinja');p.consumePublicLine('|-immune|p2a: Shedinja|[from] ability: Wonder Guard');};

test('expanded public immunities block matching attacks but allow bypass',()=>{
 const memory=new PublicImmunityV2(),o=obs();o.switching!.opponentTypes=['Fairy'];o.opponent!.species='Dachsbun';
 memory.consume('|request|{"hiddenAbility":"Well-Baked Body"}');assert.equal(memory.context().revealedAbility,'');
 memory.consume('|-immune|p2a: Dachsbun|[from] ability: Well-Baked Body');assert(memory.blocked('Flamethrower',o.ownTeam[0],o));assert(!memory.blocked('Earth Power',o.ownTeam[0],o));
 assert(!memory.blocked('Flamethrower',{...o.ownTeam[0],ability:'Mold Breaker'},o));
 for(const [ability,move] of [['Earth Eater','Earthquake'],['Soundproof','Hyper Voice'],['Bulletproof','Shadow Ball'],['Wind Rider','Hurricane']]){
  memory.consume('|-ability|p2a: Target|'+ability);assert(memory.blocked(move,o.ownTeam[0],o));
 }
});
test('absorption heal/activation reveals ability before trying a second move',()=>{
 const m=new PublicImmunityV2(),o=obs();o.switching!.opponentTypes=['Water'];
 m.consume('|-heal|p2a: Vaporeon|100/100|[from] ability: Water Absorb');assert(m.blocked('Surf',o.ownTeam[0],o));
 m.consume('|switch|p2a: Arcanine|Arcanine, L50|100/100');assert.equal(m.context().revealedAbility,'');
 m.consume('|-activate|p2a: Arcanine|ability: Flash Fire');assert(m.blocked('Flamethrower',o.ownTeam[0],o));
});
test('revealed ability survives tera, while its matchup uses the new public type',()=>{
 const m=new PublicImmunityV2(),o=obs();m.consume('|-ability|p2a: Shedinja|Wonder Guard');m.consume('|-terastallize|p2a: Shedinja|Bug');o.switching!.opponentTypes=['Bug'];
 assert.equal(m.context().revealedAbility,'wonderguard');assert(m.blocked('Crunch',o.ownTeam[1],o));assert(!m.blocked('Flamethrower',o.ownTeam[1],o));
});
test('unknown revealed ability does not erase an observed failed move',()=>{
 const m=new PublicImmunityV2(),o=obs();m.observeOwn(o.ownTeam[0]);m.consume('|move|p1a: Espeon|Psychic|p2a: Shedinja');m.consume('|-immune|p2a: Shedinja|[from] ability: Future Guard');
 assert(m.blocked('Psychic',o.ownTeam[0],o));m.consume('|switch|p2a: Snorlax|Snorlax, L50|100/100');assert(!m.blocked('Psychic',o.ownTeam[0],o));
});
test('an unknown failed attack is not transferred to an ally with another ability',()=>{
 const m=new PublicImmunityV2(),o=obs();o.opponent!.species='Gengar';o.switching!.opponentTypes=['Ghost','Poison'];m.observeOwn(o.ownTeam[0]);m.consume('|move|p1a: Espeon|Body Slam|p2a: Gengar');m.consume('|-immune|p2a: Gengar');
 assert(!m.blocked('Body Slam',{...o.ownTeam[0],ability:'Scrappy'},o));
});
test('forced replacement selects a living answer instead of a blocked raw-damage candidate',()=>{
 const p=new AdaptiveCoveragePlayerPolicy(),o=obs();reveal(p);o.ownTeam[0].condition='0 fnt';o.legalActions=o.legalActions.filter(a=>a.command.startsWith('switch '));
 assert.equal(p.choose(o),'switch 2');assert.equal(p.decisionReason,'forced-hittable-replacement');
});
test('a no-hit retreat can use a low-HP answer immediately after a normal switch',()=>{
 const p=new AdaptiveCoveragePlayerPolicy(),o=obs();p.recordDecision('switch 3',o);o.turn=2;o.ownTeam[1].condition='30/180';reveal(p);
 assert.equal(p.choose(o),'switch 2');assert.equal(p.decisionReason,'hittable-emergency-retreat');
});
test('trap warnings, dynamax and entry hazards prevent invalid emergency retreats',()=>{
 for(const reason of ['trap','max','hazards']){
  const p=new AdaptiveCoveragePlayerPolicy(),o=obs();reveal(p);
  if(reason==='trap')o.switching!.maybeTrapped=true;
  if(reason==='max')o.switching!.dynamax=true;
  if(reason==='hazards'){o.switching!.hazards.stealthRock=true;o.ownTeam[1].condition='10/180';}
  assert(p.choose(o).startsWith('move '),reason);
 }
});
test('a complete lack of attack answers does not cause endless useless switches',()=>{
 const p=new AdaptiveCoveragePlayerPolicy(),o=obs();o.ownTeam[1].moves=['Waterfall'];reveal(p);assert(p.choose(o).startsWith('move '));
});
test('all real choices remain legal and replay exactly against immunity species',async()=>{
 const p=new AdaptiveCoveragePlayerPolicy();const log=await runBattle({rule:'basic',teams:{p1:packTeam(['Garchomp','Gyarados','Gengar']),p2:packTeam(['Dachsbun','Shedinja','Bronzong'])},player:p,opponent:new CautiousSwitchingPolicy(),onPlayerLine:l=>p.consumePublicLine(l)});
 for(const d of log.decisions)assert(d.observation.legalActions.some(a=>a.command===d.action));
 assert.deepEqual(battleEvents(log.publicProtocol),battleEvents((await replayBattle(log)).publicProtocol));
});
