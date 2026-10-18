import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import preservation from './fixtures/unova-preservation.json' with {type:'json'};
import {unovaTrainers} from '../src/data/unova-trainers';
import {sinnohTrainers} from '../src/data/sinnoh-trainers';
import {trainerCatalog,namedTrainerSamples,legacyNamedTrainerSamples} from '../src/data/trainer-catalog';
import {organizationGrunt,villainLeaders,villainEncounter} from '../src/data/villain-organizations';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam,selectTrainerSample} from '../src/server/opponent-team';
import {satisfiesSelectionRules} from '../src/data/npc-selection-rules';
import {CURRENT_PROGRESSION,towerDifficulty} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {npcGimmick} from '../src/data/npc-gimmicks';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {DamagePolicy} from '../src/battle/policy';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {hiddenBossFixture} from './hidden-boss-fixture';
import {finishChallengerBattle} from './challenger-fixture';
import {HiddenBossEvents,hiddenBossEligible} from '../src/server/hidden-boss-events';
import {TowerService} from '../src/server/tower-service';
import {TowerStore} from '../src/server/tower-store';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {unovaBattleTelemetry} from '../scripts/lib/unova-battle-telemetry';

const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function sampleFor(id:string){
 const named=trainerCatalog.find(s=>s.id===id);if(named)return named;
 if(id==='plasma-grunt')return organizationGrunt('plasma');
 const g=villainLeaders.plasma;return {...(id.includes('-boss-')?g.boss:[g.executive,...g.executives??[]].find(s=>id.endsWith('-'+s.portrait))!),id,role:'villain' as const};
}
test('Unova preserves every other region runtime and reviewed definition and every common policy',()=>{
 const ids=new Set([...unovaTrainers.map(t=>t.id),'named-ghetsis']);
 const sort=(a:{id:string;stage:string},b:{id:string;stage:string})=>(a.id+a.stage).localeCompare(b.id+b.stage);
 const runtime=JSON.parse(readFileSync('src/data/normal-npc-templates.json','utf8')).filter((r:{id:string})=>!ids.has(r.id)).sort(sort);
 const reviewed=JSON.parse(readFileSync('scripts/data/npc/normal-npc-samples.json','utf8')).samples.filter((r:{id:string})=>!ids.has(r.id)).sort(sort);
 assert.equal(runtime.length,preservation.unova.count);assert.equal(digest(runtime),preservation.unova.runtime);assert.equal(digest(reviewed),preservation.unova.source);
 for(const [path,hash]of Object.entries(preservation.common))assert.equal(createHash('sha256').update(readFileSync(path,'utf8').replace(/\r\n/g,'\n')).digest('hex'),hash,path);
 for(const t of sinnohTrainers)assert.ok(normalNpcTemplate(t.id,95,t.category==='boss'||t.category==='executive'?'villain':t.category)?.team.every(p=>!p.profile.moves.includes('Trick Room')));
});
for(const t of unovaTrainers)test(`${t.id}: legal fixed builds, varying triples, real ace and unchanged floor training`,()=>{
 const sample=sampleFor(t.id),validator=new Showdown.TeamValidator(FORMAT);
 for(const floor of t.category==='hidden'?[5,50,95,100]:[5,45,55,95]){
  const template=normalNpcTemplate(t.id,floor,sample.role)!;assert.ok(template,t.id);
  assert.equal(template.signature,null);assert.equal(npcGimmick(sample.id,sample.generation,template.team.map(p=>p.species),template.ace),null);
  assert.equal(template.team.length,t.category==='hidden'&&floor<100?5:6);
  for(const p of template.team){assert.ok(!p.profile.moves.includes('Trick Room'));assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.profile.ability,item:p.item,moves:p.profile.moves},{}),null,t.id+'/'+p.species);}
  const combinations=new Set<string>();
  for(let n=1;n<=60;n++){
   const seed:[number,number,number,number]=[n,floor,29,43],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),names=team.map(p=>p.name);
   assert.equal(names.length,3);assert.equal(new Set(names).size,3);assert.ok(satisfiesSelectionRules(names,template.selectionRules));
   if(template.ace)assert.ok(names.includes(template.ace));
   assert.deepEqual(team,generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION));
   for(const p of team)assert.equal(Object.values(p.profile!.evs).reduce((a,b)=>a+b,0),Math.min(66,towerDifficulty(floor).points));
   if(t.category==='hidden')assert.equal(names.includes('Zekrom'),floor===100);
   combinations.add([...names].sort().join(','));
  }
  assert.ok(combinations.size>=5,'Candidate pool must not collapse to a fixed triple');
  assert.equal(npcAi(floor,sample).tier,t.category==='grunt'?(floor<20?'basic':'tactical'):t.aiCeiling);
 }
});
test('Unova identities: Champion Iris, veteran Alder, Plasma officers and hidden-only N',()=>{
 const alder=sampleFor('named-alder'),iris=sampleFor('named-iris'),n=sampleFor('named-n');
 assert.equal(alder.role,'elite');assert.equal(alder.title,'강자');assert.equal(alder.aiCeiling,'tactical');assert.equal(iris.aiCeiling,'expert');
 assert.equal(towerTrainerEncounter(50,'unova','unova',true)!.boss.id,'named-iris');
 assert.equal(towerTrainerEncounter(100,'unova','unova',true,true)!.boss.id,'named-n');
 assert.ok(!legacyNamedTrainerSamples.some(s=>s.id===n.id));assert.equal(n.minFloor,50);
 for(let floor=1;floor<=100;floor++)assert.notEqual(selectTrainerSample(floor,[floor,2,3,4],[],CURRENT_PROGRESSION).id,'named-n');
 assert.ok(![villainLeaders.plasma.executive,...villainLeaders.plasma.executives!,villainLeaders.plasma.boss].some(s=>s.id===n.id));
 const seen=new Set<string>();
 for(let seed=0;seed<5000;seed++){const e=villainEncounter('unova-officers-'+seed,56,'plasma',false,false,{gruntWins:100,executiveWins:0});if(e?.event.rank==='executive')seen.add(e.sample.portrait);}
 assert.deepEqual([...seen].sort(),['colress','zinzolin']);
 for(const s of [n,villainLeaders.plasma.executive,...villainLeaders.plasma.executives!])assert.ok(existsSync(`public/sprites/trainers/${s.portrait}.png`));
 for(let seed=0;seed<200;seed++){const e=villainEncounter('unova-only-colress-'+seed,56,'plasma',false,false,{gruntWins:100,executiveWins:0},s=>s.portrait==='colress');if(e)assert.equal(e.sample.portrait,'colress');}
 assert.deepEqual(normalNpcTemplate('named-ghetsis',95,'villain'),{...normalNpcTemplate('plasma-boss-ghetsis',95,'villain')!,id:'named-ghetsis'});
 assert.ok(normalNpcTemplate('named-ghetsis',95,'villain')!.team.every(p=>p.species!=='Kyurem'));
});
test('Elesa actually chooses Volt Switch and pivots in a real v12 battle',async()=>{
 const sample=sampleFor('named-elesa');let seed:[number,number,number,number]=[1,95,29,43],team=generateOpponentTeam(95,seed,[],null,sample,CURRENT_PROGRESSION);
 for(let n=1;team[0].name!=='Zebstrika'&&n<100;n++){seed=[n,95,29,43];team=generateOpponentTeam(95,seed,[],null,sample,CURRENT_PROGRESSION);}
 assert.equal(team[0].name,'Zebstrika');
 const log=await runBattle({teams:{p1:packTeam(['Blastoise','Slowbro','Lapras']),p2:packTeam(team.map(p=>p.name),Object.fromEntries(team.map(p=>[p.name,p.profile!])),Object.fromEntries(team.map(p=>[p.name,p.item??''])))},seed,rule:'basic',player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(95,sample))});
 const index=log.publicProtocol.findIndex(l=>l.startsWith('|move|p2a: Zebstrika|Volt Switch|'));assert.ok(index>=0);
 assert.ok(log.publicProtocol.slice(index+1).some(l=>l.startsWith('|switch|p2a:')&&!l.startsWith('|switch|p2a: Zebstrika|')));
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
for(const floor of [50,100])test(`N F${floor}: champion victory → event snapshot → full recovery → retry/reconnect → reward and chapter advance once`,async()=>{
 const path=`.data/tests/n-unova-${randomUUID()}.sqlite`,f=hiddenBossFixture('unova',floor,path);let store=f.store;
 let service=new TowerService(store);
 try{
  assert.equal(JSON.parse(store.battle(f.champion).boss!).id,'named-iris');
  assert.equal(hiddenBossEligible('unova',floor,'named-alder'),false);
  const roster=store.view(f.owner).run!.roster;finishChallengerBattle(store,f.champion);
  const event=store.view(f.owner).run!.event!;assert.equal(event.kind,'hidden-boss');assert.equal(event.hiddenBoss?.name,'N');
  const snapshot=new HiddenBossEvents(store.db).row(event.id)!.snapshot_json;
  store.chooseEvent(f.owner,f.run,event.id,'challenge');let battle=store.currentBattle(f.owner)!;
  assert.equal(battle.stage,1);assert.equal(JSON.parse(battle.trainer!).id,'named-n');
  assert.equal(Showdown.Teams.unpack(battle.opponent_team)!.some(p=>p.species==='Zekrom'),floor===100);
  assert.equal(JSON.parse(battle.trainer!).gimmick,undefined);
  const state=await service.state(f.owner);assert.ok(state.battle!.team.every(p=>p.condition.split('/')[0]===p.condition.split('/')[1]));assert.ok(state.battle!.movePP!.every(p=>p.pp===p.maxpp));
  await service.dispose();store.close();store=new TowerStore(path);service=new TowerService(store);
  assert.equal(new HiddenBossEvents(store.db).row(event.id)!.snapshot_json,snapshot);assert.equal(store.currentBattle(f.owner)!.opponent_team,battle.opponent_team);
  const coins=()=>Number(store.db.prepare('SELECT coins FROM players WHERE id=?').get(f.owner)!.coins);
  const beforeLoss=coins();finishChallengerBattle(store,battle.id,'Tower AI');assert.equal(coins(),beforeLoss);
  store.retry(f.owner,f.run,battle.id);const retry=store.battle(store.enter(f.owner,f.run,floor,starters));
  assert.equal(retry.opponent_team,battle.opponent_team);assert.equal(retry.seed,battle.seed);assert.equal(retry.ai_version,'tower-policy-v12');
  battle=retry;finishChallengerBattle(store,battle.id);const receipt=coins();
  assert.equal(store.view(f.owner).run!.event!.phase,'reward');assert.deepEqual(store.view(f.owner).run!.roster,roster);
  store.continueEvent(f.owner,f.run,event.id);assert.equal(coins(),receipt);
  assert.equal(store.view(f.owner).run!.state,floor===50?'select':'cleared');assert.equal(store.view(f.owner).run!.floor,floor===50?51:100);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{await service.dispose();store.close();}
});
test('N legendary attribution excludes poison faints and resolves Illusion through own requests',()=>{
 const log={decisions:[{side:'p2',action:'move 1',observation:{turn:1,ownTeam:[{active:true,details:'Zoroark, L50'}]}},{side:'p2',action:'move 1',observation:{turn:2,ownTeam:[{active:true,details:'Zekrom, L50'}]}}],publicProtocol:['|turn|1','|move|p2a: Zekrom|Dark Pulse|p1a: Target','|-damage|p1a: Target|0 fnt','|faint|p1a: Target','|turn|2','|switch|p1a: Other|Blastoise, L50|100/100','|move|p2a: Zekrom|Bolt Strike|p1a: Other','|-damage|p1a: Other|10/100','|-damage|p1a: Other|0 fnt|[from] psn','|faint|p1a: Other']} as unknown as Parameters<typeof unovaBattleTelemetry>[0];
 const r=unovaBattleTelemetry(log);assert.equal(r.moveUsage.Zoroark['Dark Pulse'],1);assert.equal(r.directKOs.Zoroark,1);assert.equal(r.legendaryKOs,0);assert.equal(r.unassistedLegendarySweep,false);
});
