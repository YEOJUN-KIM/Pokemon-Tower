import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {alolaTrainers,alolaSample,alolaScopeIds,alolaVillainSequence} from '../src/data/alola-trainers';
import {namedTrainerSamples,trainerCatalog} from '../src/data/trainer-catalog';
import {towerThemes} from '../src/data/tower-themes';
import {organizationGrunt,villainLeaders} from '../src/data/villain-organizations';
import {normalNpcTemplate,templateProfile} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {packedNpcRule} from '../src/data/npc-gimmicks';

test('20 identities, unique higher roles, route candidates, deferred villain sequence and portraits',()=>{
 assert.equal(alolaTrainers.length,20);assert.equal(new Set(alolaTrainers.map(t=>t.id)).size,20);
 assert.equal(trainerCatalog.some(t=>t.id==='named-acerola-captain'),false);
 assert.equal(towerThemes.alola.gyms.length,8);assert.equal(towerThemes.alola.elites.length,5);
 for(const id of ['hala','olivia','acerola','molayne']){assert.ok(towerThemes.alola.elites.includes(`named-${id}`));assert.ok(!towerThemes.alola.gyms.includes(`named-${id}`));}
 assert.deepEqual(alolaVillainSequence,['skull-grunt','named-guzma','aether-grunt','named-faba','named-lusamine']);
 assert.equal(villainLeaders.skull.executive.portrait,'guzma');assert.equal(villainLeaders.aether.executive.portrait,'faba');
 for(const t of alolaTrainers){const sample=t.category==='grunt'?organizationGrunt(t.id.split('-')[0]):namedTrainerSamples.find(s=>s.id===t.id)!;assert.deepEqual(sample,alolaSample(t));assert.ok(existsSync(`public/sprites/trainers/${sample.portrait}.png`),sample.portrait);}
});

for(const t of alolaTrainers)test(`${t.id}: legal role-oriented builds, deterministic triples, required, difficulty and form packing`,()=>{
 const sample=alolaSample(t),validator=new Showdown.TeamValidator(FORMAT);
 for(const floor of [5,45,54,55,75,95,100].filter(f=>f>=t.minFloor)){
  const template=normalNpcTemplate(t.id,floor,sample.role)!;assert.ok(template,t.id);
  const lineups=new Set<string>();
  for(const p of template.team){
   const dex=Showdown.Dex.species.get(p.profile.forme??p.species),moves=p.profile.moves.map(m=>Showdown.Dex.moves.get(m));
   assert.ok(dex.exists);assert.ok(Showdown.Dex.natures.get(p.profile.nature).exists);assert.ok(Showdown.Dex.abilities.get(p.profile.ability!).exists);assert.ok(!p.item||Showdown.Dex.items.get(p.item).exists);
   assert.ok(moves.every(m=>m.exists));assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),species:dex.name,ability:p.profile.ability,item:p.item,moves:p.profile.moves,nature:p.profile.nature},{}),null,t.id+'/'+p.species);
   const attacks=moves.filter(m=>m.category!=='Status'&&!m.damage&&!m.damageCallback&&m.id!=='mirrorcoat');
   if(p.species!=='Smeargle')assert.ok(attacks.some(m=>dex.types.includes(m.type)),`STAB ${p.species}`);
   if(p.item==='Assault Vest'||p.item.startsWith('Choice '))assert.ok(moves.every(m=>m.category!=='Status'));
   if(p.profile.nature==='Adamant')assert.ok(!attacks.some(m=>m.category==='Special'));
   if(p.profile.nature==='Modest')assert.ok(!attacks.some(m=>m.category==='Physical'&&m.id!=='bodypress'));
   if(dex.baseStats.atk>=dex.baseStats.spa+30)assert.ok(attacks.filter(m=>m.category==='Physical').length>attacks.filter(m=>m.category==='Special').length,p.species);
   if(dex.baseStats.spa>=dex.baseStats.atk+30)assert.ok(attacks.filter(m=>m.category==='Special').length>=attacks.filter(m=>m.category==='Physical'&&m.id!=='bodypress').length,p.species);
   assert.ok(Object.values(p.profile.evs).every(v=>v<=32));assert.equal(Object.values(p.profile.evs).reduce((a,b)=>a+b,0),t.points);
  }
  for(let seed=1;seed<=40;seed++){
   const team=generateOpponentTeam(floor,[seed,floor,29,43],[],null,sample,CURRENT_PROGRESSION),names=team.map(p=>p.name);
   assert.equal(new Set(names).size,3);assert.ok(names.every(n=>template.team.some(p=>p.species===n)));for(const n of template.required??[])assert.ok(names.includes(n));
   assert.deepEqual(team,generateOpponentTeam(floor,[seed,floor,29,43],[],null,sample,CURRENT_PROGRESSION));
   if(t.category==='boss')assert.deepEqual(names,['Clefable','Lilligant','Necrozma']);
   if(t.category==='grunt'){assert.equal(npcAi(floor,sample).tier,'basic');for(const p of team){assert.ok(Object.values(p.profile!.ivs).every(v=>v<=12));assert.equal(p.item,'');}}
   if(['captain','kahuna','executive'].includes(t.category))assert.equal(npcAi(floor,sample).tier,t.aiCeiling);
   for(const p of team){const source=template.team.find(s=>s.species===p.name)!;assert.deepEqual(p.profile!.evs,templateProfile(source.profile,floor).evs);}
   lineups.add([...names].sort().join(','));
  }
  if(template.required?.length===3)assert.equal(lineups.size,1);else assert.ok(lineups.size>=3,t.id);
  const snapshot=snapshotTrainerEventBattle(`alola:${t.id}`,sample,floor,'basic',CURRENT_PROGRESSION);
  assert.deepEqual(snapshot,snapshotTrainerEventBattle(`alola:${t.id}`,sample,floor,'basic',CURRENT_PROGRESSION));
  const sets=Showdown.Teams.unpack(snapshot.opponentTeam)!;assert.equal(sets.length,3);
  if(t.category==='boss')assert.deepEqual(sets.map(s=>s.species),['Clefable','Lilligant','Necrozma-Dusk-Mane']);
  // Tower point budgets and role-budget IVs intentionally differ from cartridge
  // EV and legendary-perfect-IV constraints. Validate learnset/form/item here;
  // the generated training values are checked against the tower curve above.
  for(const set of sets){set.gender='';set.pokeball='';set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};set.evs={hp:1,atk:0,def:0,spa:0,spd:0,spe:0};assert.equal(validator.validateSet(set,{}),null,`${t.id}/${set.species}`);}
 }
});

test('Lusamine has one source row, all three required, no early alternative, valid aliases and physical Dusk Mane',()=>{
 const rows=JSON.parse(readFileSync('scripts/data/npc/normal-npc-samples.json','utf8')).samples.filter((r:{id:string})=>r.id.includes('lusamine'));
 assert.equal(rows.length,1);assert.equal(normalNpcTemplate('named-lusamine',74,'villain'),null);
 const template=normalNpcTemplate('named-lusamine',75,'villain')!;assert.deepEqual(template.required,['Clefable','Lilligant','Necrozma']);assert.deepEqual(template,normalNpcTemplate('aether-boss-lusamine',75,'villain'));
 const p=template.team[2];assert.equal(p.profile.forme,'Necrozma-Dusk-Mane');assert.equal(p.profile.nature,'Adamant');assert.equal(p.item,'Weakness Policy');
 assert.equal(alolaSample(alolaTrainers.find(t=>t.category==='boss')!).minFloor,75);
 assert.equal(normalNpcTemplate('named-mallow',54,'gym')!.team.find(p=>p.species==='Lurantis')!.profile.ability,'Leaf Guard');assert.equal(normalNpcTemplate('named-mallow',55,'gym')!.team.find(p=>p.species==='Lurantis')!.profile.ability,'Contrary');
});

for(const t of alolaTrainers)test(`${t.id}: real battle completes and deterministic replay retains packed forms and Z items`,async()=>{
 const snapshot=snapshotTrainerEventBattle(`alola-battle:${t.id}`,alolaSample(t),95,'basic',CURRENT_PROGRESSION);
 const log=await runBattle({teams:{p1:packTeam(starters),p2:snapshot.opponentTeam},seed:snapshot.seed,rule:'basic',opponentRule:packedNpcRule(snapshot.team.map(p=>({item:p.item??''})),0),player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(95,alolaSample(t)))});
 assert.ok(log.winner);assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
