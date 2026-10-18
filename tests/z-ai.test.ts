import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {chooseResourceZ,evaluateZOptions,hpFraction} from '../src/battle/z-decision';
import {chooseZMove} from '../src/battle/z-move-policy';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {createNpcPolicy as oldPolicy} from '../src/battle/npc-policy-v11';
import type {Observation} from '../src/battle/policy';
import {packTeam,starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {BattleSession} from '../src/server/battle-session';
import {zAiTelemetry,monitorZPolicy} from '../scripts/lib/z-ai-telemetry';

function observation(normal=60,z=150):Observation{return {turn:1,ownTeam:[{ident:'p2: Raichu',details:'Raichu, L50',condition:'140/140',active:true,moves:['Thunderbolt','Grass Knot'],stats:{atk:100,def:100,spa:100,spd:100,spe:100}}],opponent:{species:'Blastoise',condition:'70/100'},legalActions:[{command:'move 1',label:'Thunderbolt',estimatedDamage:normal},{command:'move 1 zmove',label:'Gigavolt Havoc',estimatedDamage:z}]};}

test('HP parser supports all observed fractions, percentages, statuses and faint formats',()=>{
 for(const [input,expected] of [['100/100',1],['84/100',.84],['84%',.84],['84/100 par',.84],['0 fnt',0],['fnt',0],['0/100 fnt',0],['200%',1],['0/0',null],['unknown',null]] as const)assert.equal(hpFraction(input),expected,input);
});
test('ordinary finishing attack conserves Z, including low-HP carrier',()=>{
 const o=observation(150,240);for(const hp of ['140/140','10/140']){o.ownTeam[0].condition=hp;assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1');}
});
test('Z-only high-confidence finishing hit is chosen by both tiers',()=>{
 const o=observation();for(const tier of ['tactical','expert'] as const)assert.equal(chooseResourceZ(o,'move 1',tier),'move 1 zmove');
});
test('immune Z and insignificant extra damage are conserved',()=>{
 assert.equal(chooseResourceZ(observation(60,65),'move 1','expert'),'move 1');
 const immune=observation(0,0);immune.opponent={species:'Garchomp',condition:'100/100'};assert.equal(chooseResourceZ(immune,'move 1','expert'),'move 1');
});
test('large damage gain matters even without a KO',()=>{
 const o=observation(40,115);o.opponent!.condition='100/100';assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1 zmove');
});
test('last-chance low-HP carrier spends a meaningful marginal gain earlier',()=>{
 const o=observation(40,65);o.opponent!.condition='100/100';assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1');o.ownTeam[0].condition='20/140';assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1 zmove');
});
test('both tiers rescue cross-slot Z-only KO; Expert additionally evaluates cross-slot pressure',()=>{
 const o=observation();o.legalActions.push({command:'move 2',label:'Grass Knot',estimatedDamage:80});
 assert.equal(chooseZMove(o,'move 2'),'move 2');
 assert.equal(chooseResourceZ(o,'move 2','tactical'),'move 1 zmove');
 assert.equal(chooseResourceZ(o,'move 2','expert'),'move 1 zmove');
 o.opponent!.condition='100/100';o.legalActions[1].estimatedDamage=140;
 assert.equal(chooseResourceZ(o,'move 2','tactical'),'move 2');assert.equal(chooseResourceZ(o,'move 2','expert'),'move 1 zmove');
});
test('multiple Z candidates compete; an invalid/missing candidate never becomes a command',()=>{
 const o=observation(40,70);o.legalActions.push({command:'move 2',label:'Grass Knot',estimatedDamage:65},{command:'move 2 zmove',label:'Bloom Doom',estimatedDamage:180});assert.equal(chooseResourceZ(o,'move 1','expert'),'move 2 zmove');
 o.legalActions=o.legalActions.filter(a=>!a.command.endsWith(' zmove'));assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1');
});
test('overriding a speculative setup with Z does not mark the unused setup as executed',()=>{
 const o=observation(60,150);o.opponent={species:'Snorlax',condition:'100/100'};o.ownTeam[0].moves=['Thunderbolt','Nasty Plot'];o.legalActions.push({command:'move 2',label:'Nasty Plot',estimatedDamage:0});
 const current=createNpcPolicy({tier:'expert',tactic:'balanced'});assert.equal(current.choose(o),'move 1 zmove');
 const next={...o,turn:2,legalActions:o.legalActions.filter(a=>!a.command.endsWith(' zmove'))};assert.equal(current.choose(next),'move 2');
 const archived=oldPolicy({tier:'expert',tactic:'balanced'});assert.equal(archived.choose(o),'move 2');assert.equal(archived.choose(next),'move 1');
});
test('actual installed status Z effects: heal, boosts and negative-rank reset have separate guards',()=>{
 const o=observation(0,0);o.legalActions=[{command:'move 1',label:'Psych Up',estimatedDamage:0},{command:'move 1 zmove',label:'Z-Psych Up',estimatedDamage:0}];
 assert.equal(Showdown.Dex.moves.get('Psych Up').zMove?.effect,'heal');
 assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1');o.ownTeam[0].condition='30/140';assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1 zmove');
 o.ownTeam[0].condition='140/140';o.legalActions[0].label='Splash';o.legalActions[1].label='Z-Splash';assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1 zmove');
 o.switching={hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{atk:3},dynamax:false,opponentTypes:['Water']};assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1');
 o.legalActions[0].label='Swords Dance';o.legalActions[1].label='Z-Swords Dance';assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1');o.switching.boosts={atk:-2};assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1 zmove');
});
test('revealed immunity is respected; no hidden opponent fields enter the evaluator',()=>{
 const o=observation();o.opponent={species:'Garchomp',condition:'100/100'};o.legalActions[0].estimatedDamage=0;o.legalActions[1].estimatedDamage=0;
 assert.equal(createNpcPolicy({tier:'expert',tactic:'balanced'}).choose(o),'move 1');assert.deepEqual(Object.keys(o.opponent),['species','condition']);
 const p=createNpcPolicy({tier:'expert',tactic:'balanced'}),water=observation();water.opponent={species:'Lanturn',condition:'70/100'};
 p.observePublicLine?.('|-ability|p1a: Lanturn|Volt Absorb');assert.equal(p.choose(water),'move 1');
 const changed=observation(0,0);changed.opponent={species:'Garchomp',condition:'100/100'};changed.switching={hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Water']};
 const e=evaluateZOptions(changed)!;assert.ok(e.bestNormal>0,'public Tera can remove an old immunity');assert.ok(e.candidates[0].damage>e.bestNormal);
 changed.switching.opponentTypes=['Ground'];assert.equal(evaluateZOptions(changed)!.candidates[0].damage,0);
});
test('archived NPC policy is byte-identical to baseline; archived Z function retains old behavior',()=>{
 const sha=(p:string)=>createHash('sha256').update(readFileSync(p,'utf8').replaceAll('\r\n','\n')).digest('hex');
 assert.equal(sha('src/battle/npc-policy-v11.ts'),'55a8d77c1ee445754818e9567d616eff2b68e2695b86b81d71574c070d17edb6');
 assert.equal(sha('src/battle/z-move-policy.ts'),'968e8e897323195f974c40e27092592ab73602c70e67a84163392b93ac4ef09a');
 const o=observation(150,240);assert.equal(chooseZMove(o,'move 1'),'move 1 zmove');assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1');
});
test('variable-power ordinary and Z attacks are evaluated despite legacy zero legalActions scores',()=>{
 const o=observation(0,0);o.ownTeam[0].stats.spa=150;o.opponent={species:'Rhyperior',condition:'100/100'};
 o.legalActions[0].label='Grass Knot';o.legalActions[1].label='Bloom Doom';
 const e=evaluateZOptions(o)!;assert.ok(e.bestNormal>0);assert.ok(e.candidates[0].damage>0);
 o.opponent.condition='1/100';assert.equal(chooseResourceZ(o,'move 1','expert'),'move 1');
 const belch=observation(50,0);belch.ownTeam[0].moves=['Belch','Hyper Voice'];belch.legalActions=[{command:'move 1 zmove',label:'Acid Downpour',estimatedDamage:0},{command:'move 2',label:'Hyper Voice',estimatedDamage:50}];
 const b=evaluateZOptions(belch)!;assert.ok(b.candidates[0].damage>0);assert.equal(b.candidates[0].base,undefined);
});
test('v11 saved Z battle reconnects identically, and v12 reconnect/replay is deterministic',async()=>{
 const profile={...defaultProfile('Raichu'),moves:['Thunderbolt','Grass Knot','Focus Blast','Nasty Plot']};
 const teams={p1:packTeam(starters),p2:packTeam(['Raichu','Snorlax','Blastoise'],{Raichu:profile},{Raichu:'Electrium Z'})};
 for(const aiVersion of ['tower-policy-v11','tower-policy-v12']){
  const options={aiVersion,rule:'basic' as const,teams,npcAi:{tier:'expert' as const,tactic:'balanced' as const}},session=new BattleSession(async()=>{},[1,2,3,4],options);
  try{const first=await session.ready(),next=await session.submit(first.id,first.requestId,'move 1');const restored=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1']});
   try{assert.deepEqual(battleEvents((await restored.ready()).messages),battleEvents(next.messages));}finally{await restored.dispose();}
  }finally{await session.dispose();}
 }
 const monitored=monitorZPolicy(createNpcPolicy({tier:'expert',tactic:'balanced'}));
 const log=await runBattle({teams,rule:'basic',opponentRule:'z',seed:[1,2,3,4],player:new DamagePolicy(),opponent:monitored.policy});
 const plain=await runBattle({teams,rule:'basic',opponentRule:'z',seed:[1,2,3,4],player:new DamagePolicy(),opponent:createNpcPolicy({tier:'expert',tactic:'balanced'})});
 assert.deepEqual(log.decisions,plain.decisions);assert.deepEqual(battleEvents(log.publicProtocol),battleEvents(plain.publicProtocol));
 assert.equal(monitored.evaluations.length,log.decisions.filter(d=>d.side==='p2').length);
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 const telemetry=zAiTelemetry(log,monitored.evaluations);assert.ok(telemetry.carriers.length);assert.ok(telemetry.decisions.length);assert.ok(telemetry.decisions.every(d=>Number.isFinite(d.normal)));
});
test('non-Z battles preserve every command and public event for all tiers',async()=>{
 for(const tier of ['basic','tactical','expert'] as const)for(const rule of ['basic','mega','dynamax','tera','chaos'] as const){
  const item=rule==='mega'?'Charizardite X':rule==='dynamax'||rule==='chaos'?'Dynamax Band':'';
  const ai={tier,tactic:'balanced' as const},options={teams:{p1:packTeam(starters),p2:packTeam(starters,{},item?{Charizard:item}:{})},rule,opponentRule:rule,teraTickets:{p1:0,p2:rule==='tera'?1:0},opponentTeraSpecies:rule==='tera'?'Charizard':undefined,seed:[2,3,4,5] as [number,number,number,number]};
  const before=await runBattle({...options,player:new DamagePolicy(),opponent:oldPolicy(ai)}),after=await runBattle({...options,player:new DamagePolicy(),opponent:createNpcPolicy(ai)});
  assert.deepEqual(before.decisions,after.decisions,`${tier}/${rule}`);assert.deepEqual(battleEvents(before.publicProtocol),battleEvents(after.publicProtocol));
  if(tier==='expert'&&rule!=='basic')assert.ok(after.publicProtocol.some(l=>rule==='mega'?l.startsWith('|-mega|p2'):rule==='tera'?l.startsWith('|-terastallize|p2'):l.startsWith('|-start|p2')&&l.includes('|Dynamax')),rule);
 }
});
