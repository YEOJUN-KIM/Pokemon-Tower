import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {villainLeaders} from '../src/data/villain-organizations';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {defaultProfile} from '../src/server/training';
import {packTeam,starters} from '../src/data/teams';
import {megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {zCrystals} from '../src/data/z-crystals';
import {battleRules,type BattleRule} from '../src/data/run-rules';
import {runBattle,replayBattle,battleEvents,FORMAT} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {BattleSession} from '../src/server/battle-session';
import {earlyNpcAssignments,npcGimmick,npcExtraCandidates} from '../src/data/npc-gimmicks';
import {presentationFrames} from '../src/web/battle-presentation';
import {species} from '../src/web/catalog';
import {PRE_NPC_FORMAT} from '../src/data/battle-rules';
import {normalNpcCategory,normalNpcGimmicksEnabled} from '../src/data/normal-mode-stages';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {primalOrbs} from '../src/data/primal-forms';
import {hoennTrainer} from '../src/data/hoenn-trainers';

test('all named NPCs and villain leaders have one legal representative carrier at early and late floors',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 const samples=[...namedTrainerSamples,...Object.values(villainLeaders).flatMap(p=>[p.executive,...p.executives??[],p.boss])];
 for(const sample of samples)for(const floor of [5,35,75].filter(f=>f>=sample.minFloor)){
  const team=generateOpponentTeam(floor,[1,2,3,4],[],null,sample,CURRENT_PROGRESSION);
  const carriers=team.filter(p=>p.item && (megaStones[p.item] || primalOrbs[p.item] || p.item===DYNAMAX_ITEM || zCrystals[p.item]));
  assert.ok(carriers.length<=1,sample.id);
  const reviewed=normalNpcTemplate(sample.id,floor,sample.role);
  const planned=reviewed?reviewed.signature:npcGimmick(sample.id,sample.generation,[...sample.entries!,...(npcExtraCandidates[sample.id] ?? [])],sample.ace);
  if(!planned){assert.ok(normalNpcTemplate(sample.id,floor,sample.role)?.signature===null||['named-roxanne','named-tateandliza','tabitha'].includes(sample.id));assert.equal(carriers.length,0);continue;}
  const enabled=normalNpcGimmicksEnabled(floor,normalNpcCategory(sample.role,sample.id,sample.kind));
  assert.equal(carriers.length,!enabled || planned.rule==='tera'?0:1,sample.id);
  for(const p of carriers){if(zCrystals[p.item!]){const crystal=zCrystals[p.item!];assert.ok(p.moves.some(m=>crystal.from?Showdown.Dex.moves.get(m).name===crystal.from:Showdown.Dex.moves.get(m).type===crystal.type && !!Showdown.Dex.moves.get(m).zMove),sample.id);}
   if(p.item===DYNAMAX_ITEM){assert.ok(Showdown.Dex.species.get(p.name).canGigantamax,sample.id);assert.equal(p.gigantamax,true);}}
  const profiles=Object.fromEntries(team.map(p=>[p.name,{...(p.profile??defaultProfile(p.name)),moves:p.moves,...(p.ability?{ability:p.ability}:{})}]));
  const sets=Showdown.Teams.unpack(packTeam(team.map(p=>p.name),profiles,Object.fromEntries(team.map(p=>[p.name,p.item ?? ''])),team.filter(p=>p.gigantamax).map(p=>p.name)))!;
  for(const set of sets){if(set.item===DYNAMAX_ITEM)set.item='';set.pokeball='';set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};set.evs={hp:1,atk:0,def:0,spa:0,spd:0,spe:0};set.gender='';}
  assert.equal(validator.validateTeam(sets),null,sample.id+' '+floor);
 }
});

test('NPC Mega, Dynamax, Z and Tera work against every player rule and replay independently',async()=>{
 const cases=[['mega','Charizardite X','mega'],['dynamax',DYNAMAX_ITEM,'dynamax'],['z','Firium Z','zmove'],['tera','','terastallize']] as const;
 for(const rule of Object.keys(battleRules) as BattleRule[])for(const [opponentRule,item,command] of cases){
  const team=packTeam(starters,{Charizard:{...defaultProfile('Charizard'),moves:['Flamethrower','Protect']}},{Charizard:item}),policy=new DamagePolicy();let used=false;
  const log=await runBattle({rule,opponentRule,opponentTeraSpecies:opponentRule==='tera'?'Charizard':undefined,teams:{p1:team,p2:team},teraTickets:{p1:1,p2:1},player:{choose:o=>{
   if(rule==='basic')assert.ok(o.legalActions.every(a=>!/(mega|dynamax|zmove|terastallize)$/.test(a.command)));
   return policy.choose(o);
  }},opponent:{choose:o=>{
   const action=o.legalActions.find(a=>a.command.endsWith(' '+command));if(action && !used){used=true;return action.command;}return policy.choose(o);
  }}});
  assert.ok(used,rule+' vs '+opponentRule);assert.equal(log.opponentRule,opponentRule);
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 }
});

test('all player rules save the same Leon gimmick; reopening restores NPC powers while old v9 stays symmetric',async()=>{
 const store=new TowerStore(':memory:');
 try{for(const rule of Object.keys(battleRules) as BattleRule[]){
  store.ensurePlayer(rule);const first=store.battle(store.start(rule,starters,rule));
  store.db.prepare("UPDATE run_themes SET theme='galar' WHERE run_id=?").run(first.run_id);
  store.db.prepare("UPDATE runs SET floor=50,state='select' WHERE id=?").run(first.run_id);
  const boss=store.battle(store.enter(rule,first.run_id,50,starters));
  assert.equal(boss.ai_version,'tower-policy-v12');assert.equal(boss.rule,rule);
  assert.equal(Showdown.Teams.unpack(boss.opponent_team)!.find(p=>p.species==='Charizard')!.item,DYNAMAX_ITEM);
  assert.equal(Showdown.Teams.unpack(boss.opponent_team)!.find(p=>p.species==='Charizard')!.gigantamax,true);
  assert.equal(JSON.parse(boss.boss!).gimmick.rule,'dynamax');assert.equal(JSON.parse(boss.tera_tickets).p2,0);
  const service=new TowerService(store);try{assert.equal((await service.state(rule)).battle!.opponentRule,'dynamax');}finally{await service.dispose();}
 }}finally{store.close();}
 const teams={p1:packTeam(starters,{Charizard:{...defaultProfile('Charizard'),moves:['Protect']}}),p2:packTeam(starters,{Charizard:{...defaultProfile('Charizard'),moves:['Flamethrower']}},{Charizard:'Firium Z'})};
 for(const version of ['tower-policy-v9','tower-policy-v10']){
  const session=new BattleSession(async()=>{},[1,2,3,4],{rule:'basic',aiVersion:version,teams});
  try{const before=await session.ready();assert.equal(before.opponentRule,version==='tower-policy-v10'?'z':undefined);
   const after=await session.submit(before.id,before.requestId,'move 1');assert.equal(after.messages.some(l=>l.startsWith('|-zpower|p2')),version==='tower-policy-v10');
  }finally{await session.dispose();}
 }
});

test('NPC Gigantamax changes the actual move, displayed form and restored history; dedicated Z and Mega Dragonite also fire',async()=>{
 for(const [name,item,moves,gmax,marker] of [
  ['Charizard',DYNAMAX_ITEM,['Flamethrower'],true,'G-Max Wildfire'],
  ['Mimikyu','Mimikium Z',['Play Rough'],false,"Let's Snuggle Forever"],
  ['Kommo-o','Kommonium Z',['Clanging Scales'],false,'Clangorous Soulblaze'],
  ['Dragonite','Dragoninite',['Dragon Pulse'],false,'Dragonite-Mega'],
 ] as const){
  const teams={p1:packTeam(['Snorlax','Blastoise','Venusaur'],{Snorlax:{...defaultProfile('Snorlax'),moves:['Protect']}}),p2:packTeam([name,'Blastoise','Venusaur'],{[name]:{...defaultProfile(name),moves:[...moves]},Blastoise:{...defaultProfile('Blastoise'),moves:['Protect']},Venusaur:{...defaultProfile('Venusaur'),moves:['Protect']}},{[name]:item},gmax?[name]:[])};
  const options={rule:'basic' as const,aiVersion:'tower-policy-v10',teams};
  const session=new BattleSession(async()=>{},[1,2,3,4],options);
  try{const before=await session.ready(),after=await session.submit(before.id,before.requestId,'move 1');
   assert.ok(after.messages.some(l=>l.includes(marker)),name);
   if(gmax){assert.equal(after.opponent!.displaySpecies,'Charizard-Gmax');assert.equal(species['Charizard-Gmax'].spriteKey,'10196');assert.ok(presentationFrames(before,after).some(f=>f.view.opponent?.displaySpecies==='Charizard-Gmax'));}
   const restored=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1']});
   try{const view=await restored.ready();assert.deepEqual(battleEvents(view.messages),battleEvents(after.messages));assert.equal(view.opponent?.displaySpecies,after.opponent?.displaySpecies);}finally{await restored.dispose();}
  }finally{await session.dispose();}
 }
 const legacy=await runBattle({format:PRE_NPC_FORMAT,rule:'basic',player:new DamagePolicy(),opponent:new DamagePolicy()});
 assert.equal((await replayBattle(legacy)).format,PRE_NPC_FORMAT);
});

test('every generation 1–5 NPC has an explicit individual assignment; later generations keep their own mechanic',()=>{
 for(const sample of namedTrainerSamples){
  const entries=[...sample.entries!,...(npcExtraCandidates[sample.id] ?? [])];
  const plan=npcGimmick(sample.id,sample.generation,entries,sample.ace)!;
  if(sample.generation!<=5){if(hoennTrainer(sample.id)?.signature===null||normalNpcTemplate(sample.id,95,sample.role)?.signature===null){assert.equal(plan,null);continue;}assert.ok(earlyNpcAssignments[sample.id],sample.id);assert.equal(plan.rule,earlyNpcAssignments[sample.id].rule);}
  else assert.equal(plan.rule,({6:'mega',7:'z',8:'dynamax',9:'tera'} as const)[sample.generation as 6|7|8|9],sample.id);
 }
});

test('only the NPC Tera carrier can transform, including after a switch',async()=>{
 const policy=new DamagePolicy();let first=true,sawCarrier=false;
 const log=await runBattle({rule:'basic',opponentRule:'tera',opponentTeraSpecies:'Blastoise',teams:{p1:packTeam(starters),p2:packTeam(starters)},teraTickets:{p1:0,p2:1},player:policy,opponent:{choose:o=>{
  if(first && o.legalActions.some(a=>a.command==='switch 2')){assert.ok(o.legalActions.every(a=>!a.command.endsWith(' terastallize')));first=false;return 'switch 2';}
  const tera=o.legalActions.find(a=>a.command.endsWith(' terastallize'));if(tera){sawCarrier=true;return tera.command;}return policy.choose(o);
 }}});
 assert.ok(sawCarrier);assert.ok(log.publicProtocol.some(l=>l.startsWith('|-terastallize|p2a: Blastoise')));
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
