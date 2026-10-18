import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import baseline from './fixtures/hau-guzma-preservation.json' with {type:'json'};
import design from '../scripts/data/npc/alola-design.json' with {type:'json'};
import {alolaTrainers,alolaSample} from '../src/data/alola-trainers';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {towerThemes} from '../src/data/tower-themes';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {packTeam,pokemonSets,starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {monitorEntryPolicy} from '../scripts/lib/hau-guzma-telemetry';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {FORMAT,PRE_GOLISOPOD_FORMAT} from '../src/data/battle-rules';
import {installGolisopodMega} from '../src/battle/golisopod-mega';
import {species,pokemonName} from '../src/data/pokemon-catalog';

const sample=(id:string)=>alolaSample(alolaTrainers.find(t=>t.id===id)!);
test('requested commit: ALL 224 other current source/runtime rows and all other Alola metadata remain exact',()=>{
 const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const keep=(rows:{id:string;stage:string}[])=>rows.filter(r=>!baseline.ids.includes(r.id)).sort((a,b)=>(a.id+a.stage).localeCompare(b.id+b.stage));
 const runtime=keep(JSON.parse(readFileSync('src/data/normal-npc-templates.json','utf8'))),source=keep(JSON.parse(readFileSync('scripts/data/npc/normal-npc-samples.json','utf8')).samples);
 assert.equal(runtime.length,224);assert.equal(source.length,224);assert.equal(hash(runtime),baseline.runtime);assert.equal(hash(source),baseline.source);
 assert.equal(hash(design.trainers.filter(t=>!baseline.ids.includes(t.id))),baseline.otherTrainers);assert.equal(hash(design.builds),baseline.sharedBuilds);
 for(const [id,sets]of Object.entries(baseline.originalOverrides))assert.deepEqual(design.overrides[id as keyof typeof design.overrides],sets,id);
 assert.deepEqual(Object.keys(design.overrides).sort(),[...Object.keys(baseline.originalOverrides),...baseline.ids].sort());
 const before=baseline.oldRuntime.find(r=>r.id==='named-guzma')!,after=normalNpcTemplate('named-guzma',95,'villain')!;
 assert.deepEqual(after.team.filter(p=>p.species!=='Golisopod'),before.team.filter(p=>p.species!=='Golisopod'));
 assert.equal(sample('named-guzma').aiCeiling,'expert');assert.equal(npcAi(95,sample('named-guzma')).tier,'expert');
});
test('Hau is one catalog identity beside Kukui; every floor/seed keeps all three and the intended lead/ace order',()=>{
 assert.equal(trainerCatalog.filter(t=>t.id==='named-hau').length,1);assert.ok(trainerCatalog.some(t=>t.id==='named-kukui'));assert.equal(towerThemes.alola.champion,'named-kukui');assert.equal(towerThemes.alola.final,'named-hau');
 for(const floor of [5,45,49,50,54,55,95,100]){
  const row=normalNpcTemplate('named-hau',floor,'champion')!;
  assert.equal(row.allFloors,true);assert.equal(row.select,true);assert.deepEqual(row.required,['Noivern','Primarina','Raichu-Alola']);
  assert.deepEqual(row.selectionRules,{preferredLead:['Noivern'],preferredLast:['Raichu-Alola']});
  for(let n=1;n<=100;n++){
   const team=generateOpponentTeam(floor,[n,floor,29,43],[],null,sample('named-hau'),CURRENT_PROGRESSION);
   assert.deepEqual(team.map(p=>p.name),['Noivern','Primarina','Raichu-Alola']);
   assert.equal(team.find(p=>p.name==='Raichu-Alola')!.item??'',floor<50?'':'Aloraichium Z');
   assert.ok(team.filter(p=>p.name!=='Raichu-Alola').every(p=>p.item!=='Aloraichium Z'));
  }
 }
});
test('Hau special builds and Guzma HP/attack four-move entry build retain normal rank budgets',()=>{
 const hau=normalNpcTemplate('named-hau',95,'champion')!.team;
 assert.deepEqual(hau.map(p=>[p.species,p.profile.ability,p.item,p.profile.nature]),[['Noivern','Infiltrator','Life Orb','Timid'],['Primarina','Torrent','Assault Vest','Modest'],['Raichu-Alola','Surge Surfer','Aloraichium Z','Timid']]);
 for(const p of hau)assert.equal(Object.values(p.profile.evs).reduce((a,b)=>a+b,0),66);
 assert.ok(hau[0].profile.evs.spa>0&&hau[0].profile.evs.spe>0);assert.ok(hau[1].profile.evs.hp>0&&hau[1].profile.evs.spa>0);
 const g=normalNpcTemplate('named-guzma',95,'villain')!.team.find(p=>p.species==='Golisopod')!;
 assert.deepEqual(g.profile.moves,['First Impression','Liquidation','Leech Life','Aqua Jet']);assert.equal(g.profile.ability,'Emergency Exit');assert.equal(g.item,'Golisopite');assert.equal(g.profile.nature,'Adamant');assert.equal(Object.values(g.profile.evs).reduce((a,b)=>a+b,0),54);assert.ok(g.profile.evs.hp>0&&g.profile.evs.atk>0);
});
function physicalTeam(){const names=['Garchomp','Metagross','Gyarados'];return packTeam(names,Object.fromEntries(names.map(n=>[n,{...defaultProfile(n),moves:[...pokemonSets[n].moves],nature:'Adamant',ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs:{hp:16,atk:32,def:0,spa:0,spd:0,spe:18}}])));}
for(const [id,floor,seed] of [['named-hau',50,1],['named-guzma',45,6]] as const)test(`${id}: actual signature sequence uses real v13 decisions and replays`,async()=>{
 const snapshot=snapshotTrainerEventBattle(`hau-guzma:physical:${seed}`,sample(id),floor,'basic',CURRENT_PROGRESSION),monitor=monitorEntryPolicy(createNpcPolicy(npcAi(floor,sample(id))));
 const log=await runBattle({teams:{p1:physicalTeam(),p2:snapshot.opponentTeam},rule:'basic',opponentRule:packedNpcRule(snapshot.team.map(p=>({item:p.item??''})),0),seed:snapshot.seed,player:new DamagePolicy(),opponent:monitor.policy});
 const t=monitor.finish(log);
 if(id==='named-hau'){
  assert.ok(t.z.used>0);assert.ok(log.publicProtocol.some(l=>l.startsWith('|move|p2')&&l.includes('|Stoked Sparksurfer|')));assert.ok((t.pokemon.Noivern.moves['U-turn']??0)>0);
 }else{
  assert.ok(t.entry.firstImpressionUsed>=2);assert.ok(t.entry.emergencyExit>0);assert.ok(t.entry.exitReturns>0);assert.ok(t.entry.firstImpressionAfterExitReturn>0);assert.ok(t.entry.completeEntryChains>0);assert.equal(t.entry.firstImpressionInvalid,0);assert.equal(t.entry.firstImpressionFailed,0);assert.equal(t.entry.switchLoops,0);
  const protocol=log.publicProtocol.join('\n');assert.match(protocol,/\|move\|p2[^\n]+\|First Impression\|[\s\S]+ability: Emergency Exit[\s\S]+\|switch\|p2[^\n]+\|Golisopod,[\s\S]+\|move\|p2[^\n]+\|First Impression\|/);
 }
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
for(const [rule,item,event]of [['mega','Charizardite X','|-mega|p2'],['dynamax','Dynamax Band','|-start|p2'],['tera','','|-terastallize|p2']] as const)test(`v13 ${rule} resource actually activates and replay retains it`,async()=>{
 const log=await runBattle({teams:{p1:packTeam(starters),p2:packTeam(starters,{},item?{Charizard:item}:{})},rule:'basic',opponentRule:rule,opponentTeraSpecies:rule==='tera'?'Charizard':undefined,teraTickets:{p1:0,p2:rule==='tera'?1:0},seed:[2,3,4,5],player:new DamagePolicy(),opponent:createNpcPolicy({tier:'expert',tactic:'balanced'})});
 assert.ok(log.publicProtocol.some(l=>l.startsWith(event)&&(rule!=='dynamax'||l.includes('|Dynamax'))));assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
test('TowerService retains saved v12 records and restores the same public history after reconnect',async()=>{
 const store=new TowerStore(':memory:');let service=new TowerService(store);
 try{
  store.ensurePlayer('v12-save');const row=store.battle(store.start('v12-save',starters,'basic'));
  store.db.prepare('UPDATE battles SET ai_version=?,format=? WHERE id=?').run('tower-policy-v12',PRE_GOLISOPOD_FORMAT,row.id);
  const ready=(await service.state('v12-save')).battle!,played=(await service.action('v12-save',row.id,ready.requestId,'move 1')).battle!;
  await service.dispose();service=new TowerService(store);const restored=(await service.state('v12-save')).battle!;
  assert.equal(store.battle(row.id).ai_version,'tower-policy-v12');assert.equal(store.battle(row.id).opponent_team,row.opponent_team);assert.deepEqual(battleEvents(restored.messages),battleEvents(played.messages));
 }finally{await service.dispose();store.close();}
});

test('Guzma Mega is gated normally, all other candidates stay ordinary, and rendering identifies Bug/Steel Mega Golisopod',()=>{
 for(const floor of [5,45,49,50,54,55,95,100]){
  const snapshot=snapshotTrainerEventBattle('mega-guzma-gate',sample('named-guzma'),floor,'basic',CURRENT_PROGRESSION),sets=Showdown.Teams.unpack(snapshot.opponentTeam)!;
  assert.equal(sets.find(s=>s.species==='Golisopod')!.item,floor<50?'':'Golisopite');assert.equal(snapshot.trainer.gimmick?.rule,floor<50?undefined:'mega');
  assert.equal(sets.filter(s=>s.item==='Golisopite').length,floor<50?0:1);
 }
 assert.equal(pokemonName('Golisopod-Mega'),'메가갑주무사');assert.deepEqual(species['Golisopod-Mega'].types,['벌레','강철']);assert.equal(species['Golisopod-Mega'].spriteKey,'10316');
 const validator=new Showdown.TeamValidator(PRE_GOLISOPOD_FORMAT);assert.ok(validator.validateSet({...structuredClone(pokemonSets.Golisopod),item:'Golisopite'},{}),'old format still excludes the new stone');
});
test('new format Mega really gains Tough Claws, boosts contact power and stops Emergency Exit; shared/old Dex stays unchanged',()=>{
 const native=Showdown.Dex.species.get('Golisopod-Mega').abilities[0],battle=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 installGolisopodMega(battle);
 try{
  const own=Showdown.Teams.unpack(packTeam(['Golisopod','Scizor','Pinsir'],{Golisopod:{...defaultProfile('Golisopod'),moves:['Iron Defense','Liquidation']}},{Golisopod:'Golisopite'}))!,enemy=Showdown.Teams.unpack(packTeam(['Mew','Snorlax','Blissey']))!;enemy[0].moves=['Seismic Toss'];
  battle.setPlayer('p1',{name:'Guzma',team:own});battle.setPlayer('p2',{name:'Player',team:enemy});battle.makeChoices('team 123','team 123');
  const p=battle.p1.active[0];p.hp=Math.floor(p.maxhp*.55);battle.makeChoices('move 1 mega','move 1');
  assert.equal(p.species.name,'Golisopod-Mega');assert.equal(p.ability,'toughclaws');assert.deepEqual(p.getTypes(),['Bug','Steel']);assert.ok(p.hp>0&&p.hp<p.maxhp/2);assert.equal(battle.p1.active[0],p);assert.ok(!battle.log.some(l=>l.includes('ability: Emergency Exit')));
  assert.equal(battle.runEvent('BasePower',p,battle.p2.active[0],battle.dex.moves.get('Liquidation'),100),130);
  assert.equal(Showdown.Dex.species.get('Golisopod-Mega').abilities[0],native);
 }finally{battle.destroy();}
});
test('actual late Guzma Mega battles keep First Impression legal and replay transformed ability/history',async()=>{
 let activations=0;
 for(let seed=1;seed<=6;seed++){
  const snapshot=snapshotTrainerEventBattle(`hau-guzma:physical:${seed}`,sample('named-guzma'),95,'basic',CURRENT_PROGRESSION),monitor=monitorEntryPolicy(createNpcPolicy(npcAi(95,sample('named-guzma'))));
  const log=await runBattle({teams:{p1:physicalTeam(),p2:snapshot.opponentTeam},rule:'basic',opponentRule:'mega',seed:snapshot.seed,player:new DamagePolicy(),opponent:monitor.policy}),t=monitor.finish(log);
  activations+=t.entry.golisopodMegaActivations;assert.equal(t.entry.firstImpressionInvalid,0);assert.equal(t.entry.firstImpressionFailed,0);assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 }
 assert.ok(activations>0);
});
