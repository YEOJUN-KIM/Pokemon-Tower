import {publicAssetExists} from './helpers/runtime-assets';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readPrePaldeaFile as readFileSync} from './pre-paldea-preservation';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {galarTrainers,galarSample} from '../src/data/galar-trainers';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {packTeam,pokemonSets,starters} from '../src/data/teams';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy,type Policy,type Observation} from '../src/battle/policy';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {GalarPolicy} from '../src/battle/galar-policy';
import {organizationGrunt,villainLeaders} from '../src/data/villain-organizations';
import preservation from './fixtures/galar-preservation.json' with {type:'json'};

test('Galar preserves every other generation source and runtime row',()=>{
 for(const [path,expected] of Object.entries(preservation.hashes)){
  const data=JSON.parse(readFileSync(path,'utf8')),rows=(Array.isArray(data)?data:data.samples).filter((r:{id:string})=>!preservation.excluded.includes(r.id));
  assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),expected,path);
 }
});
test('exactly 13 Galar samples, deferred identities absent, campaign uses reviewed samples',()=>{
 assert.equal(galarTrainers.length,13);assert.equal(trainerCatalog.filter(t=>t.generation===8).length,13);
 for(const id of ['milo','opal','piers','hop','raihan-cup'])assert.ok(!trainerCatalog.some(t=>t.id===`named-${id}`));
 assert.deepEqual(organizationGrunt('macrocosmos'),galarSample(galarTrainers.find(t=>t.category==='grunt')!));
 assert.equal(villainLeaders.macrocosmos.executive.aiCeiling,'expert');
});
for(const t of galarTrainers)test(`${t.id}: deterministic ordered triples, legal builds and designated carrier`,()=>{
 const sample=galarSample(t),validator=new Showdown.TeamValidator(FORMAT);
 assert.ok(publicAssetExists(`public/sprites/trainers/${sample.portrait}.png`));
 for(const floor of [5,45,50,54,55,75,95,100].filter(f=>f>=t.minFloor)){
  const template=normalNpcTemplate(t.id,floor,sample.role)!;assert.ok(template,t.id);
  for(let seed=1;seed<=20;seed++){
   const team=generateOpponentTeam(floor,[seed,floor,29,43],[],null,sample,CURRENT_PROGRESSION);
   assert.deepEqual(team.map(p=>p.name),t.entries);
   assert.deepEqual(team,generateOpponentTeam(floor,[seed,floor,29,43],[],null,sample,CURRENT_PROGRESSION));
   for(const p of team){
    assert.ok(pokemonSets[p.name]);assert.ok(Showdown.Dex.abilities.get(p.ability).exists);
    assert.ok(!p.item||Showdown.Dex.items.get(p.item).exists);
    assert.ok(p.moves.every(m=>Showdown.Dex.moves.get(m).exists));
    if(p.gigantamax){assert.equal(p.name,t.ace);assert.equal(p.item,t.id==='named-leon'?'Life Orb':'');assert.ok(Showdown.Dex.species.get(p.name).canGigantamax);}
    assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.name]),ability:p.ability,item:p.item,moves:p.moves,nature:p.profile!.nature},{}),null);
   }
  }
  const snapshot=snapshotTrainerEventBattle(`galar:${t.id}`,sample,floor,'basic',CURRENT_PROGRESSION);
  const sets=Showdown.Teams.unpack(snapshot.opponentTeam)!;
  assert.equal(packedNpcRule(sets,0),t.signature&&floor>=(sample.role==='champion'||sample.role==='villain'?50:55)?'dynamax':'basic');
  if(t.category==='grunt')assert.ok(sets.every(p=>!p.item&&!p.gigantamax));
  if(t.category==='boss'){assert.equal(sets[2].species,'Eternatus');assert.ok(!sets[2].gigantamax);assert.equal(snapshot.team[2].special,'hidden');assert.equal(snapshot.trainer.gimmick?.species,'Copperajah');}
 }
});
for(const t of galarTrainers)test(`${t.id}: real battle and deterministic replay`,async()=>{
 const sample=galarSample(t),snapshot=snapshotTrainerEventBattle(`galar-battle:${t.id}`,sample,95,'basic',CURRENT_PROGRESSION);
 const log=await runBattle({teams:{p1:packTeam(starters),p2:snapshot.opponentTeam},seed:snapshot.seed,rule:'basic',opponentRule:packedNpcRule(Showdown.Teams.unpack(snapshot.opponentTeam)!,0),player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(95,sample))});
 assert.ok(log.winner);assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 if(t.category==='boss'){
  assert.ok(log.decisions.filter(d=>d.side==='p2'&&d.action.startsWith('switch ')).every(d=>!d.observation.legalActions.some(a=>a.command.startsWith('move '))));
  assert.ok(log.decisions.filter(d=>d.side==='p2'&&d.action.endsWith(' dynamax')).every(d=>d.observation.ownTeam.find(p=>p.active)?.details.startsWith('Copperajah')));
 }
});

const force=(names:string[]):Policy=>({choose(o){
 for(const name of names){const a=o.legalActions.find(a=>a.label===name&&a.command.startsWith('move '));if(a)return a.command;}
 return o.legalActions[0].command;
}});
function focusedTeam(id:string,lead:string){
 const snap=snapshotTrainerEventBattle('focus:'+id,galarSample(galarTrainers.find(t=>t.id===id)!),95,'basic',CURRENT_PROGRESSION);
 const sets=Showdown.Teams.unpack(snap.opponentTeam)!;sets.sort((a,b)=>Number(b.species===lead)-Number(a.species===lead));return Showdown.Teams.pack(sets);
}
for(const [id,weather] of [['nessa','RainDance'],['kabu','SunnyDay'],['gordie','Sandstorm'],['raihan','Sandstorm']])test(`${id}: entry weather`,async()=>{
 const snapshot=snapshotTrainerEventBattle('weather:'+id,galarSample(galarTrainers.find(t=>t.id===`named-${id}`)!),95,'basic',CURRENT_PROGRESSION);
 const log=await runBattle({teams:{p1:packTeam(starters),p2:snapshot.opponentTeam},rule:'basic',opponentRule:'basic',player:new DamagePolicy(),opponent:new DamagePolicy()});
 assert.ok(log.publicProtocol.some(l=>l.includes(`|-weather|${weather}|`)));
});
test('Shuckle installs both hazards in the engine',async()=>{
 let turn=0;const log=await runBattle({teams:{p1:packTeam(['Blissey','Snorlax','Lapras']),p2:focusedTeam('named-gordie','Shuckle')},rule:'basic',opponentRule:'basic',player:force(['Soft-Boiled','Rest','Surf']),opponent:{choose(o){const a=o.legalActions.find(a=>a.label===(turn===0?'Sticky Web':'Stealth Rock'));if(a)turn++;return a?.command??new DamagePolicy().choose(o);}}});
 for(const name of ['Sticky Web','Stealth Rock'])assert.ok(log.publicProtocol.some(l=>l.includes('|-sidestart|p1: Player|')&&l.includes(name)),name);
});
test('Hatterene reflects a status move with Magic Bounce',async()=>{
 const player=Showdown.Teams.unpack(packTeam(['Blissey','Snorlax','Lapras']))!;player[0].moves=['Thunder Wave','Seismic Toss','Soft-Boiled','Ice Beam'];
 const log=await runBattle({teams:{p1:Showdown.Teams.pack(player),p2:focusedTeam('named-bede','Hatterene')},rule:'basic',opponentRule:'basic',player:force(['Thunder Wave']),opponent:new DamagePolicy()});
 assert.ok(log.publicProtocol.some(l=>l.includes('Magic Bounce')));
 assert.ok(log.publicProtocol.some(l=>l.includes('|-status|p1a:')&&l.includes('|par')));
});
test('normal Eternatus cannot Dynamax even before the NPC resource is spent',async()=>{
 let observed=false;
 const log=await runBattle({teams:{p1:packTeam(starters),p2:focusedTeam('named-rose','Eternatus')},rule:'basic',opponentRule:'dynamax',player:new DamagePolicy(),opponent:{choose(o){if(o.ownTeam.find(p=>p.active)?.details.startsWith('Eternatus')&&o.legalActions.some(a=>a.command.startsWith('move '))){observed=true;assert.ok(o.legalActions.every(a=>!a.command.endsWith(' dynamax')));}return new DamagePolicy().choose(o);}}});
 assert.ok(observed);assert.ok(!log.publicProtocol.some(l=>l.includes('Eternatus-Eternamax')));
});
test('Rose phases resist forced phazing and retain their rule during replay',async()=>{
 const t=galarTrainers.find(t=>t.id==='named-rose')!,sample=galarSample(t),snapshot=snapshotTrainerEventBattle('rose-roar',sample,95,'basic',CURRENT_PROGRESSION);
 const player=Showdown.Teams.unpack(packTeam(['Blastoise','Charizard','Venusaur']))!;player[0].moves=['Roar','Surf','Ice Beam','Dark Pulse'];
 let roared=false;
 const log=await runBattle({teams:{p1:Showdown.Teams.pack(player),p2:snapshot.opponentTeam},rule:'basic',opponentRule:'dynamax',player:{choose(o){const roar=o.legalActions.find(a=>a.label==='Roar');if(roar&&!roared){roared=true;return roar.command;}return new DamagePolicy().choose(o);}},opponent:createNpcPolicy(npcAi(95,sample))});
 assert.ok(roared);assert.equal(log.fixedOpponentOrder,true);assert.ok(!log.publicProtocol.some(l=>l.startsWith('|drag|p2')));
 const entries=log.publicProtocol.filter(l=>l.startsWith('|switch|p2')).map(l=>l.split('|')[3].split(',')[0]);
 assert.deepEqual(entries,t.entries.slice(0,entries.length));assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
for(const t of galarTrainers.filter(t=>t.signature))test(`${t.id}: actual designated Gigantamax including Leon's held-item exception`,async()=>{
 const team=focusedTeam(t.id,t.ace),sets=Showdown.Teams.unpack(team)!;
 const log=await runBattle({teams:{p1:packTeam(['Blissey','Snorlax','Lapras']),p2:team},rule:'basic',opponentRule:packedNpcRule(sets,0),player:new DamagePolicy(),opponent:{choose(o){return o.legalActions.find(a=>a.command.endsWith(' dynamax')&&a.label===Showdown.Dex.species.get(t.ace).canGigantamax)?.command??o.legalActions.find(a=>a.command.endsWith(' dynamax')&&a.label!=='Max Guard')?.command??new DamagePolicy().choose(o);}}});
 assert.ok(log.publicProtocol.some(l=>l.includes('|-start|p2a:')&&l.includes('|Dynamax')));
 assert.ok(log.publicProtocol.some(l=>l.includes('|-start|p2a:')&&l.includes('|Dynamax|Gmax')));
 if(t.id==='named-melony')assert.ok(log.publicProtocol.some(l=>l.includes('|-sidestart|p2: Tower AI|')&&l.includes('Aurora Veil')));
 if(t.id==='named-leon'){assert.ok(log.publicProtocol.some(l=>l.includes('G-Max Wildfire')));assert.ok(log.publicProtocol.some(l=>l.startsWith('|-damage|p2a: Charizard|')&&l.includes('[from] item: Life Orb')));}
 if(t.id==='named-gordie')assert.ok(log.publicProtocol.some(l=>l.includes('G-Max Volcalith')));
});

test('safe boosts are conditional, phase switching is disabled, champion retains active switching',()=>{
 const base:Observation={turn:1,ownTeam:[{ident:'p2: Falinks',active:true,details:'Falinks',condition:'180/180',stats:{atk:120,def:120,spa:60,spd:90,spe:90}}],opponent:{species:'Blissey',condition:'100/100'},legalActions:[{command:'move 1',label:'No Retreat',estimatedDamage:0},{command:'move 2',label:'Iron Head',estimatedDamage:30},{command:'switch 2',label:'Switch',estimatedDamage:0}]};
 const policy=new GalarPolicy(new DamagePolicy(),'brawler');assert.equal(policy.choose(base),'move 1');assert.equal(policy.choose({...base,turn:2}),'move 2');
 const switcher:Policy={choose:o=>o.legalActions.find(a=>a.command.startsWith('switch '))?.command??'move 2'};
 assert.equal(new GalarPolicy(switcher,'phases').choose({...base,opponent:{species:'Charizard',condition:'100/100'}}),'move 2');
 assert.equal(new GalarPolicy(switcher,'champion').choose({...base,opponent:{species:'Charizard',condition:'100/100'}}),'switch 2');
 const trapped=new GalarPolicy(switcher,'champion');trapped.observePublicLine('|-start|p2a: Falinks|move: No Retreat');assert.equal(trapped.choose({...base,opponent:{species:'Charizard',condition:'100/100'}}),'move 2');
 assert.equal(npcAi(95,galarSample(galarTrainers.find(t=>t.id==='named-leon')!)).tier,'expert');
 assert.equal(npcAi(95,galarSample(galarTrainers.find(t=>t.id==='named-nessa')!)).tier,'tactical');
});
