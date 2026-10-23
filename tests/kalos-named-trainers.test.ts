import {publicAssetExists} from './helpers/runtime-assets';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {kalosTrainers} from '../src/data/kalos-trainers';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {organizationGrunt,villainLeaders,villainEncounter} from '../src/data/villain-organizations';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {CURRENT_PROGRESSION,towerDifficulty} from '../src/data/tower-progression';
import {normalNpcGimmicksEnabled,normalNpcCategory} from '../src/data/normal-mode-stages';
import {npcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {DamagePolicy} from '../src/battle/policy';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {kalosBattleTelemetry} from '../scripts/lib/kalos-battle-telemetry';

function sampleFor(id:string){
 const named=trainerCatalog.find(s=>s.id===id);if(named)return named;
 if(id==='flare-grunt')return organizationGrunt('flare');
 const g=villainLeaders.flare;return {...(id.includes('-boss-')?g.boss:[g.executive,...g.executives??[]].find(s=>id.endsWith('-'+s.portrait))!),id,role:'villain' as const};
}
const packed=(team:ReturnType<typeof generateOpponentTeam>)=>packTeam(team.map(p=>p.name),Object.fromEntries(team.map(p=>[p.name,p.profile!])),Object.fromEntries(team.map(p=>[p.name,p.item??''])));

for(const t of kalosTrainers)test(`${t.id}: fixed legal sets, varied triples, ace/carrier, floor gates and standard training`,()=>{
 const sample=sampleFor(t.id),validator=new Showdown.TeamValidator(FORMAT);
 for(const floor of [5,45,50,54,55,75,95,100]){
  const template=normalNpcTemplate(t.id,floor,sample.role)!;assert.ok(template,t.id);assert.equal(template.team.length,6);assert.equal(template.ace,t.ace);assert.equal(template.signature?.species??null,t.mega);assert.equal(template.selectionRules,undefined);
  assert.deepEqual(template.team.map(p=>p.species),t.entries);
  for(const p of template.team){assert.ok(!p.profile.moves.includes('Trick Room'));assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.profile.ability,item:p.item,moves:p.profile.moves},{}),null,t.id+'/'+p.species);}
  const combinations=new Set<string>();
  for(let n=1;n<=80;n++){
   const seed:[number,number,number,number]=[n,floor,29,43],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),names=team.map(p=>p.name);
   assert.equal(new Set(names).size,3);if(t.ace)assert.ok(names.includes(t.ace));if(t.mega)assert.ok(names.includes(t.mega));
   assert.deepEqual(team,generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION));
   const enabled=normalNpcGimmicksEnabled(floor,normalNpcCategory(sample.role,sample.id,sample.kind));
   assert.equal(packedNpcRule(team.map(p=>({item:p.item??''})),0),enabled&&t.mega?'mega':'basic');
   for(const p of team)assert.equal(Object.values(p.profile!.evs).reduce((a,b)=>a+b,0),Math.min(66,(template.gate50?46:towerDifficulty(floor).points)));
   combinations.add([...names].sort().join(','));
  }
  assert.ok(combinations.size>=4,'Pool collapsed');
 }
});
for(const t of kalosTrainers.filter(t=>t.mega))test(`${t.id}: ${t.mega} actually Mega Evolves through v12 and deterministic replay`,async()=>{
 const sample=sampleFor(t.id);let n=1,team=generateOpponentTeam(95,[n,95,29,43],[],null,sample,CURRENT_PROGRESSION);
 while(team[0].name!==t.mega&&n<200){n++;team=generateOpponentTeam(95,[n,95,29,43],[],null,sample,CURRENT_PROGRESSION);}
 assert.equal(team[0].name,t.mega);
 const log=await runBattle({teams:{p1:packTeam(starters),p2:packed(team)},seed:[n,95,37,101],rule:'basic',opponentRule:'mega',player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(95,sample))});
 const telemetry=kalosBattleTelemetry(log);assert.equal(telemetry.telemetry.available.length,1);assert.equal(telemetry.mega.length,1);assert.equal(telemetry.mega[0].species,t.mega);assert.ok(telemetry.mega[0].activationTurn>=1);
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
test('Wikstrom Stance Change changes Aegislash into Blade form on its attack',async()=>{
 const p=normalNpcTemplate('named-wikstrom',95,'elite')!.team.find(p=>p.species==='Aegislash')!;
 const log=await runBattle({teams:{p1:packTeam(['Snorlax','Blastoise','Venusaur']),p2:packTeam(['Aegislash','Scizor','Probopass'],{Aegislash:p.profile},{Aegislash:p.item})},seed:[1,2,3,4],rule:'basic',player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(95,sampleFor('named-wikstrom')))});
 assert.ok(log.publicProtocol.some(l=>l.includes('|Aegislash-Blade|')&&l.includes('Stance Change')));
});
test('Flare selects both distinct officers, excludes other scientists and keeps deterministic reviewed snapshots',()=>{
 const g=villainLeaders.flare;assert.deepEqual([g.executive,...g.executives!].map(s=>s.portrait).sort(),['aliana','xerosic']);
 assert.equal(g.executive.ace,'Manectric');assert.equal(g.executives![0].ace,'Malamar');
 const seen=new Set<string>();for(let n=0;n<5000;n++){const e=villainEncounter('kalos-officer-'+n,56,'flare',false,false,{gruntWins:100,executiveWins:0});if(e?.event.rank==='executive')seen.add(e.sample.portrait);}
 assert.deepEqual([...seen].sort(),['aliana','xerosic']);
 for(const t of kalosTrainers.filter(t=>['grunt','executive','boss'].includes(t.category))){
  const s=sampleFor(t.id),snap=snapshotTrainerEventBattle('kalos-snapshot',s,95,'basic',CURRENT_PROGRESSION);
  assert.deepEqual(snap,snapshotTrainerEventBattle('kalos-snapshot',s,95,'basic',CURRENT_PROGRESSION));assert.ok(publicAssetExists(`public/sprites/trainers/${s.portrait}.png`));
  const names=Showdown.Teams.unpack(snap.opponentTeam)!.map(p=>p.species);if(t.ace)assert.ok(names.includes(t.ace));assert.equal(snap.trainer.gimmick?.species??null,t.mega);
 }
 assert.deepEqual(normalNpcTemplate('named-lysandre',95,'villain'),{...normalNpcTemplate('flare-boss-lysandre',95,'villain')!,id:'named-lysandre'});
 assert.equal(kalosTrainers.length,17);assert.equal(kalosTrainers.filter(t=>t.mega).length,9);assert.equal(new Set(kalosTrainers.flatMap(t=>t.mega?[t.mega]:[])).size,9);
});
test('Mega telemetry joins forme usage, counts post-activation direct KOs and excludes poison faints',()=>{
 const log={teams:{p1:packTeam(starters),p2:packTeam(['Gardevoir','Hawlucha','Goodra'],{}, {Gardevoir:'Gardevoirite'})},turns:5,winner:'Player',decisions:[3,4].map(turn=>({side:'p2',action:'move 1',observation:{turn,legalActions:turn===3?[{command:'move 1 mega'}]:[{command:'move 1'}],ownTeam:[{active:true,details:'Gardevoir-Mega, L50'}]}})),publicProtocol:[
  '|turn|3','|switch|p2a: Gardevoir|Gardevoir, L50|100/100','|-mega|p2a: Gardevoir|Gardevoir|Gardevoirite',
  '|move|p2a: Gardevoir|Moonblast|p1a: Target','|-damage|p1a: Target|0 fnt','|faint|p1a: Target',
  '|turn|4','|switch|p1a: Other|Blastoise, L50|100/100','|move|p2a: Gardevoir|Moonblast|p1a: Other','|-damage|p1a: Other|10/100','|-damage|p1a: Other|0 fnt|[from] psn','|faint|p1a: Other',
  '|turn|5','|faint|p2a: Gardevoir',
 ]} as unknown as Parameters<typeof kalosBattleTelemetry>[0];
 const r=kalosBattleTelemetry(log);assert.deepEqual(r.moveUsage,{Gardevoir:{Moonblast:2}});assert.equal(r.directKOs.Gardevoir,1);
 assert.deepEqual(r.megaAvailability,[{species:'Gardevoir',legalDecisionTurns:[3]}]);
 assert.deepEqual(r.mega,[{species:'Gardevoir',activationTurn:3,directKOs:1,activeDecisionTurns:2,faintTurn:5,survivedElapsedTurns:2,survivedBattle:false}]);
});
