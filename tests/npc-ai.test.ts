import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DamagePolicy} from '../src/battle/policy';
import {finishChallengerBattle} from './challenger-fixture';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {tacticScoreBias} from '../src/battle/tactic-score';
import type {Observation,OwnPokemon} from '../src/battle/policy';
import {npcAi,npcAiTiers} from '../src/data/npc-ai';
import {npcSamples,npcTrainerSample} from '../src/data/npc-samples';
import {trainerCatalog,type TrainerTactic} from '../src/data/trainer-catalog';
import {organizationGrunt,villainLeaders} from '../src/data/villain-organizations';
import {TowerStore,AI_VERSION} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {BattleSession} from '../src/server/battle-session';
import {packTeam,starters} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {challengerDefinition} from '../src/data/challengers';

function pokemon(name:string,active=false,moves=['Thunderbolt']):OwnPokemon{
 return {ident:`p2: ${name}`,details:`${name}, L50`,condition:'140/140',active,moves,stats:{atk:100,spa:100,def:100,spd:100,spe:100}};
}
function observation():Observation{
 return {turn:1,ownTeam:[pokemon('Pikachu',true),pokemon('Gyarados',false,['Ice Fang'])],opponent:{species:'Garchomp',condition:'100/100'},lastOpponentMove:'Earthquake',legalActions:[{command:'move 1',label:'Thunderbolt',estimatedDamage:0},{command:'switch 2',label:'Gyarados',estimatedDamage:-1}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Dragon','Ground']}};
}
const policy=(tier:typeof npcAiTiers[number],tactic:TrainerTactic='balanced')=>createNpcPolicy({tier,tactic});

test('Basic keeps damage, healing, status, setup and special move decisions without switching, learning or gimmicks',()=>{
 const o=observation();assert.equal(policy('basic').choose(o),'move 1');
 for(const [label,condition,last] of [['Recover','30/140',''],['Toxic','140/140',''],['Nasty Plot','140/140',''],['Counter','140/140','Earthquake'],['Mirror Coat','140/140','Surf']]){
  const p=policy('basic');o.ownTeam[0].condition=condition;o.lastOpponentMove=last;
  o.opponent={species:'Blissey',condition:'100/100'};
  o.legalActions=[{command:'move 1',label:'Splash',estimatedDamage:0},{command:'move 2',label,estimatedDamage:0},{command:'move 2 terastallize',label,estimatedDamage:0},{command:'switch 2',label:'Gyarados',estimatedDamage:-1}];
  assert.equal(p.choose(o),'move 2',label);assert.equal(p.observePublicLine,undefined);assert.equal(p.switchingInformation,undefined);
 }
 o.opponent={species:'Gyarados',condition:'100/100'};o.legalActions=[{command:'move 1',label:'Thunderbolt',estimatedDamage:50},{command:'move 2',label:'Tackle',estimatedDamage:10}];assert.equal(policy('basic').choose(o),'move 1');
 o.legalActions=o.legalActions.slice(0,1).map(a=>({...a,command:'switch 2'}));assert.equal(policy('basic').choose(o),'switch 2','forced switch stays legal');
});

test('Tactical and Expert reuse safe switching, hazard survival, finishing and boost guards',()=>{
 for(const tier of ['tactical','expert'] as const){
  assert.equal(policy(tier).choose(observation()),'switch 2');
  for(const guard of ['hazards','finish','boost','trap','dynamax']){
   const o=observation();
   if(guard==='hazards'){o.ownTeam[1].condition='60/140';o.switching!.hazards.stealthRock=true;}
   if(guard==='finish'){o.opponent={species:'Blastoise',condition:'1/100'};o.switching!.opponentTypes=['Water'];}
   if(guard==='boost'){o.switching!.boosts.atk=2;o.opponent={species:'Blastoise',condition:'100/100'};o.switching!.opponentTypes=['Water'];}
   if(guard==='trap')o.switching!.maybeTrapped=true;
   if(guard==='dynamax')o.switching!.dynamax=true;
   assert.equal(policy(tier).choose(o),'move 1',`${tier} ${guard}`);
   if(guard==='hazards'){o.ownTeam[1].item='Heavy-Duty Boots';assert.equal(policy(tier).choose(o),'switch 2');}
  }
  const p=policy(tier),o=observation();assert.equal(p.choose(o),'switch 2');o.turn=2;assert.equal(p.choose(o),'move 1');
 }
});

test('only Expert learns public immunity; alternative attacks and bounded safe switches remain available',()=>{
 for(const tier of npcAiTiers){
  const p=policy(tier),o=observation();o.ownTeam=[pokemon('Starmie',true,['Surf','Psychic']),pokemon('Espeon',false,['Psychic'])];
  o.opponent={species:'Quagsire',condition:'100/100'};o.switching!.opponentTypes=['Water','Ground'];o.lastOpponentMove=undefined;
  o.legalActions=[{command:'move 1',label:'Surf',estimatedDamage:70},{command:'move 2',label:'Psychic',estimatedDamage:50},{command:'switch 2',label:'Espeon',estimatedDamage:-1}];
  p.observePublicLine?.('|request|{"side":{"pokemon":[{"ability":"Water Absorb","moves":["Earthquake"]}]}}');
  assert.equal(p.choose(o),'move 1','unrevealed ability is unknown');
  p.observePublicLine?.('|move|p2a: Starmie|Surf|p1a: Quagsire');
  p.observePublicLine?.('|-immune|p1a: Quagsire|[from] ability: Water Absorb');o.turn=2;
  assert.equal(p.choose(o),tier==='expert'?'move 2':'move 1');
  if(tier==='expert'){
   o.legalActions=o.legalActions.filter(a=>a.command!=='move 2');o.ownTeam[0].moves=['Surf'];o.turn=5;
   assert.equal(p.choose(o),'switch 2');o.turn=6;assert.equal(p.choose(o),'move 1');
  }
 }
});

test('Tactical and Expert use all supported active gimmicks, while Basic excludes them',()=>{
 for(const gimmick of ['mega','dynamax','terastallize','zmove'])for(const tier of npcAiTiers){
  const o=observation();o.ownTeam=[pokemon('Charizard',true,['Flamethrower'])];o.opponent={species:'Snorlax',condition:'100/100'};
  o.legalActions=[{command:'move 1',label:'Flamethrower',estimatedDamage:60},{command:`move 1 ${gimmick}`,label:gimmick==='dynamax'?'Max Flare':gimmick==='zmove'?'Inferno Overdrive':'Flamethrower',estimatedDamage:100}];
  assert.equal(policy(tier).choose(o),tier==='basic'?'move 1':`move 1 ${gimmick}`,`${tier} ${gimmick}`);
 }
});

test('tactic biases are bounded, deterministic and respect viability and HP/KO guards',()=>{
 const o=observation();o.opponent={species:'Blissey',condition:'100/100'};o.legalActions=[];
 for(const [tactic,label,hp] of [['status','Toxic','140/140'],['setup','Swords Dance','140/140'],['bulk','Recover','60/140'],['speed','Quick Attack','140/140'],['physical','Tackle','140/140'],['special','Thunderbolt','140/140']] as const){
  o.ownTeam[0].condition=hp;const action={command:'move 1',label,estimatedDamage:20},bias=tacticScoreBias(tactic);
  assert.ok(bias(55,action,o)>0,tactic);assert.ok(bias(55,action,o)<=5);assert.equal(bias(0,action,o),0);
  assert.equal(bias(55,action,o),bias(55,action,o));assert.equal(tacticScoreBias('balanced')(55,action,o),0);
 }
 o.ownTeam[0].condition='7/140';assert.equal(tacticScoreBias('setup')(65,{command:'move 1',label:'Swords Dance',estimatedDamage:0},o),0);
 o.opponent.condition='1/100';assert.equal(tacticScoreBias('status')(55,{command:'move 1',label:'Toxic',estimatedDamage:0},o),0);
 o.opponent.condition='100/100';o.legalActions=[{command:'move 2',label:'Tackle',estimatedDamage:1000}];
 assert.equal(tacticScoreBias('setup')(65,{command:'move 1',label:'Swords Dance',estimatedDamage:0},o),0);
});

test('samples have valid optional ceilings and explicit defaults across roles, ranks and floors',()=>{
 const samples=[...trainerCatalog,...npcSamples,...Object.values(villainLeaders).flatMap(x=>[x.executive,x.boss]),organizationGrunt('rocket')];
 for(const sample of samples){
  assert.ok(sample.aiCeiling===undefined||npcAiTiers.includes(sample.aiCeiling));
  for(const floor of [1,20,50,80,100]){
   const trainer='displayName' in sample?npcTrainerSample(sample,'normal'):sample;
   const ai=npcAi(floor,trainer);assert.ok(npcAiTiers.includes(ai.tier));assert.equal(ai.tactic,sample.tactic);
   if(sample.aiCeiling)assert.ok(npcAiTiers.indexOf(ai.tier)<=npcAiTiers.indexOf(sample.aiCeiling));
  }
 }
 assert.equal(npcAi(1,organizationGrunt('rocket')).tier,'basic');assert.equal(npcAi(80,organizationGrunt('rocket')).tier,'tactical');
 assert.equal(npcAi(1,villainLeaders.rocket.executive).tier,'tactical');assert.equal(npcAi(80,villainLeaders.rocket.executive).tier,'tactical');
 assert.equal(npcAi(1,villainLeaders.rocket.boss).tier,'expert');
 assert.equal(npcAi(80,{...villainLeaders.rocket.boss,aiCeiling:'basic'}).tier,'basic');
 assert.equal(challengerDefinition(npcSamples[0],'master',1).npcAi!.tier,'expert');
});

test('event snapshots freeze v11 tier/tactic independently of later sample edits',()=>{
 const sample=structuredClone(villainLeaders.rocket.boss),snapshot=snapshotTrainerEventBattle('npc-ai-snapshot',sample,10,'basic','hundred-floor-v1');
 assert.equal(snapshot.aiVersion,AI_VERSION);assert.deepEqual(snapshot.trainer.npcAi,{tier:'expert',tactic:'physical'});
 sample.aiCeiling='basic';sample.tactic='status';assert.deepEqual(snapshot.trainer.npcAi,{tier:'expert',tactic:'physical'});
});

test('v11 settings survive retry and reconnect without rerolling the opponent or tier',async()=>{
 const s=new TowerStore(':memory:');s.ensurePlayer('ai');s.db.prepare('UPDATE players SET growth_points=10000 WHERE id=?').run('ai');
 s.permanentAction('ai',randomUUID(),'buy','retry',1,null);
 let service=new TowerService(s);
 try{
  const id=s.start('ai',starters),row=s.battle(id),saved=JSON.parse(row.trainer!);assert.equal(row.ai_version,AI_VERSION);assert.ok(saved.npcAi);
  let state=(await service.state('ai')).battle!;
  await service.action('ai',id,state.requestId,state.actions[0].command);state=(await service.state('ai')).battle!;
  await service.dispose();service=new TowerService(s);const resumed=(await service.state('ai')).battle!;
  assert.deepEqual(resumed.messages,state.messages);assert.equal(resumed.turn,state.turn);assert.deepEqual(resumed.actions,state.actions);
  finishChallengerBattle(s,id,'Tower AI');s.retry('ai',row.run_id,id);const next=s.battle(s.enter('ai',row.run_id,1,starters));
  for(const key of ['ai_version','opponent_team','seed','trainer','boss','reward','candidates'] as const)assert.equal(next[key],row[key],key);
 }finally{await service.dispose();s.close();}
});

test('every archived AI version including v10 remains reconnectable',async()=>{
 const s=new TowerStore(':memory:'),service=new TowerService(s);
 try{for(const version of ['damage-policy-v1',...Array.from({length:9},(_,i)=>`tower-policy-v${i+2}`)]){
  s.ensurePlayer(version);const id=s.start(version,starters);s.db.prepare('UPDATE battles SET ai_version=? WHERE id=?').run(version,id);
  assert.equal((await service.state(version)).battle!.status,'waiting',version);assert.equal(s.battle(id).ai_version,version);
 }}finally{await service.dispose();s.close();}
});

for(const tier of npcAiTiers)test(`${tier} real battles expose only public opponent data, reproduce decisions and replay`,async()=>{
 const options={seed:[1,2,3,4] as [number,number,number,number],teams:{p1:packTeam(starters),p2:packTeam(['Starmie','Espeon','Snorlax'])}};
 const play=()=>runBattle({...options,player:new DamagePolicy(),opponent:policy(tier,'status')});
 const log=await play(),again=await play();assert.deepEqual(log.decisions,again.decisions);
 for(const d of log.decisions.filter(d=>d.side==='p2')){
  assert.ok(d.observation.ownTeam.every(p=>p.ident.startsWith('p2:')));
  if(d.observation.opponent)assert.deepEqual(Object.keys(d.observation.opponent).sort(),['condition','species']);
  assert.ok(d.observation.legalActions.some(a=>a.command===d.action));
 }
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});

test('v10 and v11 Expert balanced produce identical session histories',async()=>{
 const teams={p1:packTeam(starters),p2:packTeam(['Starmie','Espeon','Snorlax'])};
 const sessions=['tower-policy-v10',AI_VERSION].map(aiVersion=>new BattleSession(async()=>{},[1,2,3,4],{teams,aiVersion,npcAi:{tier:'expert',tactic:'balanced'}}));
 try{let states=await Promise.all(sessions.map(s=>s.ready()));
  for(let n=0;states[0].status==='waiting'&&n<200;n++){
   assert.deepEqual(states[0].messages,states[1].messages);
   states=await Promise.all(sessions.map((s,i)=>s.submit(states[i].id,states[i].requestId,states[i].actions[0].command)));
  }
  assert.equal(states[0].status,'complete');assert.equal(states[1].status,'complete');assert.deepEqual(states[0].messages,states[1].messages);
 }finally{await Promise.all(sessions.map(s=>s.dispose()));}
});
