import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {estimateDamage,type Observation,type OwnPokemon} from '../src/battle/policy';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {packTeam,starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {DamagePolicy} from '../src/battle/policy';
import {BattleSession} from '../src/server/battle-session';
import {PriorityEntryPolicy} from '../src/battle/priority-entry-policy';

function observation(species:string,moves:string[],enemy='Aerodactyl',enemyHP='10/100'):Observation {
 const own:OwnPokemon={ident:`p2: ${species}`,details:`${species}, L50`,condition:'20/200',active:true,ability:Showdown.Dex.species.get(species).abilities[0],moves,stats:{atk:170,spa:170,def:80,spd:80,spe:30}};
 return {turn:1,ownTeam:[own],opponent:{species:enemy,condition:enemyHP},lastOpponentMove:'Rock Slide',legalActions:moves.map((label,i)=>({command:`move ${i+1}`,label,estimatedDamage:estimateDamage(label,own,enemy)}))};
}
for(const [species,priority,normal,enemy]of [
 ['Golisopod','First Impression','Liquidation','Weavile'],['Golisopod','Aqua Jet','Liquidation','Aerodactyl'],['Lycanroc','Accelerock','Stone Edge','Aerodactyl'],['Arcanine','Extreme Speed','Flare Blitz','Aerodactyl'],['Scizor','Bullet Punch','Iron Head','Aerodactyl'],['Weavile','Ice Shard','Icicle Crash','Aerodactyl'],['Honchkrow','Sucker Punch','Brave Bird','Garchomp'],
])test(`${priority}: slow threatened user secures a low-HP KO; safe high-power attack wins at full foe HP`,()=>{
 const o=observation(species,[normal,priority],enemy),p=createNpcPolicy({tier:'tactical',tactic:'physical'});assert.equal(p.choose(o),'move 2');
 const fresh=observation(species,[normal,priority],enemy,'100/100');fresh.ownTeam[0].stats.spe=500;fresh.ownTeam[0].condition='200/200';
 // First Impression can be the strongest STAB on a fresh entry; this control
 // uses other ordinary priority attacks to test no unconditional preference.
 if(priority!=='First Impression')assert.equal(createNpcPolicy({tier:'tactical',tactic:'physical'}).choose(fresh),'move 1');
});
test('First Impression first action, second-turn exclusion, switch-out/reset, and switch-in midturn',()=>{
 const p=createNpcPolicy({tier:'expert',tactic:'physical'}),o=observation('Golisopod',['First Impression','Liquidation'],'Umbreon','100/100');o.ownTeam[0].condition='200/200';
 p.observePublicLine?.('|switch|p2a: Golisopod|Golisopod, L50|100/100');assert.equal(p.choose(o),'move 1');
 assert.equal(p.choose({...o,turn:2}),'move 2');p.observePublicLine?.('|turn|3');p.observePublicLine?.('|switch|p2a: Scizor|Scizor, L50|100/100');p.observePublicLine?.('|turn|6');p.observePublicLine?.('|switch|p2a: Golisopod|Golisopod, L50|40/100');assert.equal(p.choose({...o,turn:7}),'move 1');assert.equal(p.choose({...o,turn:8}),'move 2');
});
test('using another move consumes the entry opportunity; losing it to flinch cannot provoke repeated First Impression',()=>{
 const p=createNpcPolicy({tier:'tactical',tactic:'physical'}),o=observation('Golisopod',['First Impression','Liquidation'],'Charizard','100/100');o.ownTeam[0].condition='200/200';
 assert.equal(p.choose(o),'move 2');const next={...o,turn:2,opponent:{species:'Umbreon',condition:'100/100'}};p.observePublicLine?.('|cant|p2a: Golisopod|flinch');assert.equal(p.choose(next),'move 2');
});
test('revealed status is not an excuse to blindly prioritize Sucker Punch; immunities never get a priority bonus',()=>{
 const o=observation('Honchkrow',['Brave Bird','Sucker Punch'],'Aerodactyl');o.lastOpponentMove='Recover';assert.equal(createNpcPolicy({tier:'tactical',tactic:'physical'}).choose(o),'move 1');
 const immune=observation('Arcanine',['Flare Blitz','Extreme Speed'],'Gengar');assert.equal(createNpcPolicy({tier:'tactical',tactic:'physical'}).choose(immune),'move 1');
});
test('forced revenge replacement considers a fresh First Impression, but refuses fatal entry hazards',()=>{
 const o=observation('Scizor',['Iron Head'],'Umbreon'),bench={...o.ownTeam[0],ident:'p2: Golisopod',details:'Golisopod, L50',condition:'80/200',active:false,moves:['First Impression','Liquidation'],ability:'Emergency Exit'};
 o.ownTeam[0].condition='0 fnt';o.ownTeam.push(bench,{...bench,ident:'p2: Pinsir',details:'Pinsir, L50',condition:'200/200',moves:['X-Scissor']});o.legalActions=[{command:'switch 2',label:'Golisopod',estimatedDamage:-1},{command:'switch 3',label:'Pinsir',estimatedDamage:-1}];
 assert.equal(createNpcPolicy({tier:'expert',tactic:'physical'}).choose(o),'switch 2');
 bench.condition='1/200';o.switching={hazards:{spikes:3,toxicSpikes:0,stealthRock:true,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Dark']};assert.equal(createNpcPolicy({tier:'expert',tactic:'physical'}).choose(o),'switch 3');
});
test('a fast depleted special attacker uses a legal hitting pivot to reach a healthy stronger receiver',()=>{
 const o=observation('Noivern',['Draco Meteor','Air Slash','Flamethrower','U-turn'],'Blastoise','100/100');o.ownTeam[0].condition='140/200';o.ownTeam[0].stats.spe=200;o.ownTeam[0].stats.atk=90;
 o.ownTeam.push({...o.ownTeam[0],ident:'p2: Raichu',details:'Raichu-Alola, L50',active:false,condition:'200/200',moves:['Thunderbolt'],ability:'Surge Surfer'});
 o.switching={hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{spa:-2},dynamax:false,opponentTypes:['Water']};
 assert.equal(createNpcPolicy({tier:'expert',tactic:'speed'}).choose(o),'move 4');
 o.opponent!.condition='1/100';assert.notEqual(createNpcPolicy({tier:'expert',tactic:'speed'}).choose(o),'move 4');
});

test('offensive reentry takes a safe First Impression KO when the active has no effective hit',()=>{
 const o=observation('Scizor',['Psychic'],'Umbreon');o.ownTeam[0].condition='200/200';
 o.ownTeam.push({...o.ownTeam[0],ident:'p2: Golisopod',details:'Golisopod, L50',active:false,moves:['First Impression','Liquidation'],ability:'Emergency Exit'});o.legalActions.push({command:'switch 2',label:'Golisopod',estimatedDamage:-1});
 assert.equal(createNpcPolicy({tier:'expert',tactic:'physical'}).choose(o),'switch 2');
});
test('entry team voluntary switches cannot immediately reverse, exceed the budget or fabricate trapped actions',()=>{
 const policy=new PriorityEntryPolicy({choose:o=>o.legalActions.find(a=>a.command.startsWith('switch '))?.command??o.legalActions[0].command},true);
 const o=observation('Golisopod',['First Impression','Liquidation'],'Charizard','100/100');o.ownTeam[0].condition='200/200';o.ownTeam.push({...o.ownTeam[0],ident:'p2: Scizor',details:'Scizor, L50',active:false,moves:['Iron Head']});o.legalActions.push({command:'switch 2',label:'Scizor',estimatedDamage:-1});
 assert.equal(policy.choose(o),'switch 2');policy.observePublicLine('|turn|2');policy.observePublicLine('|switch|p2a: Scizor|Scizor, L50|100/100');
 o.ownTeam[0].active=false;o.ownTeam[1].active=true;o.legalActions=[{command:'move 1',label:'Iron Head',estimatedDamage:20},{command:'switch 1',label:'Golisopod',estimatedDamage:-1}];
 assert.equal(policy.choose({...o,turn:2}),'move 1');assert.equal(policy.choose({...o,turn:3}),'move 1');
 for(let turn=4;turn<=40;turn+=3)policy.choose({...o,turn});assert.equal(policy.choose({...o,turn:50}),'move 1');
 assert.equal(policy.choose({...o,turn:51,legalActions:[o.legalActions[0]],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Fire','Flying'],maybeTrapped:true}}),'move 1');
});
test('real v13 First Impression battle does not repeat failed uses; deterministic replay retains actions',async()=>{
 const profile={...defaultProfile('Golisopod'),ability:'Emergency Exit',moves:['First Impression','Liquidation','Leech Life','Aqua Jet']};
 const log=await runBattle({teams:{p1:packTeam(['Umbreon','Snorlax','Blissey']),p2:packTeam(['Golisopod','Scizor','Pinsir'],{Golisopod:profile})},seed:[1,2,3,4],rule:'basic',player:new DamagePolicy(),opponent:createNpcPolicy({tier:'expert',tactic:'physical'})});
 const uses=log.publicProtocol.filter(l=>l.startsWith('|move|p2')&&l.includes('|First Impression|'));assert.ok(uses.length>0);assert.ok(!log.publicProtocol.some(l=>l.startsWith('|-fail|p2a: Golisopod')));assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
for(const aiVersion of ['tower-policy-v12','tower-policy-v13'])test(`${aiVersion} snapshot reconnect remains deterministic`,async()=>{
 const options={aiVersion,rule:'basic' as const,teams:{p1:packTeam(starters),p2:packTeam(['Golisopod','Scizor','Pinsir'],{Golisopod:{...defaultProfile('Golisopod'),moves:['First Impression','Liquidation','Leech Life','Aqua Jet']}})},npcAi:{tier:'expert' as const,tactic:'physical' as const}};
 const first=new BattleSession(async()=>{},[1,2,3,4],options);try{const ready=await first.ready(),played=await first.submit(ready.id,ready.requestId,'move 1'),restored=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1']});try{assert.deepEqual(battleEvents((await restored.ready()).messages),battleEvents(played.messages));}finally{await restored.dispose();}}finally{await first.dispose();}
});


