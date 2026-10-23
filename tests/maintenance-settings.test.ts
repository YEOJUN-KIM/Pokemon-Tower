import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectNpcRuntime} from '../scripts/lib/npc-runtime.mjs';
import {eventEncounterSettings,eventDefinitions,eventDefinition,type RunEventRegistry} from '../src/data/run-events';
import {selectRunEvent} from '../src/game/run-events';
import {normalNpcStage,normalNpcStageRange} from '../src/data/normal-mode-stages';

test('production encounter gate stays at the reviewed 20 percent, without changing v1 weighted selection',()=>{
 assert.equal(eventEncounterSettings.encounterPercent,20);
 assert.ok(Number.isInteger(eventEncounterSettings.cooldownFloors)&&eventEncounterSettings.cooldownFloors>=0);
 const selected=Array.from({length:100},(_,roll)=>selectRunEvent(1,null,max=>max===100?roll:0));
 assert.equal(selected.filter(Boolean).length,20);
});

test('event definitions have valid gates, weights, distinct choices and internal result tables',()=>{
 for(const version of [1,2])for(const kind of Object.keys(eventDefinitions)){
  const definition=eventDefinition(kind,eventDefinitions as RunEventRegistry,version)!;
  assert.ok(Number.isFinite(definition.weight)&&definition.weight>=0,kind);
  assert.ok(Number.isInteger(definition.minFloor??1)&&(definition.minFloor??1)>=1&&(definition.minFloor??1)<=100,kind);
  assert.ok([1,2].includes(definition.minRulesVersion??1),kind);
  assert.equal(new Set(definition.choices.map(c=>c.id)).size,definition.choices.length,kind);
  for(const choice of definition.choices){
   if(choice.outcome!=='reward'&&choice.outcome!=='reward-result')continue;
   assert.ok(Number.isSafeInteger(choice.cost)&&choice.cost>=0,kind);
   const rows=choice.outcome==='reward'?choice.rewards:choice.results;
   assert.ok(rows.length&&rows.every(row=>Number.isFinite(row.weight)&&row.weight>0),kind);
   if(choice.outcome==='reward-result')assert.equal(new Set(choice.results.map(row=>row.option.id)).size,choice.results.length,kind);
  }
 }
});

test('NPC review ranges agree with runtime stage selection on every floor',()=>{
 for(const category of ['leader','boss'] as const)for(let floor=1;floor<=100;floor++){
  const [min,max]=normalNpcStageRange(normalNpcStage(floor,category));
  assert.ok(floor>=min&&floor<=max,`${category}/${floor}`);
 }
});

test('reviewed NPC source projects exactly to runtime, including single-build candidates and aliases',()=>{
 const source=JSON.parse(readFileSync('scripts/data/npc/normal-npc-samples.json','utf8'));
 const runtime=JSON.parse(readFileSync('src/data/normal-npc-templates.json','utf8'));
 assert.deepEqual(JSON.parse(JSON.stringify(projectNpcRuntime(source))),runtime);
 const duplicate=structuredClone(source);duplicate.samples.push(duplicate.samples[0]);
 assert.throws(()=>projectNpcRuntime(duplicate),/Duplicate NPC template/);
 const invalid=structuredClone(source);invalid.samples[0].team[0].profile.ivs.hp=32;
 assert.throws(()=>projectNpcRuntime(invalid),/Invalid IV/);
 const missing=structuredClone(source);missing.samples[0].required=['Not a team member'];
 assert.throws(()=>projectNpcRuntime(missing),/Missing required member/);
});
