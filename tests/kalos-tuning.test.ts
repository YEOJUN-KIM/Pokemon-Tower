import {readPreHauGuzmaFile as readFileSync} from './hau-guzma-preservation';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import baseline from './fixtures/alola-preservation.json' with {type:'json'};

test('three-trainer Kalos adjustment preserves every other reviewed and runtime NPC',()=>{
 const preservation=baseline.tuning;const ids=new Set(['named-wikstrom','named-ramos','named-siebold',...baseline.excludedAlola]);
 const sort=(a:{id:string;stage:string},b:{id:string;stage:string})=>(a.id+a.stage).localeCompare(b.id+b.stage);
 const runtime=JSON.parse(readFileSync('src/data/normal-npc-templates.json','utf8')).filter((r:{id:string})=>!ids.has(r.id)).sort(sort);
 const source=JSON.parse(readFileSync('scripts/data/npc/normal-npc-samples.json','utf8')).samples.filter((r:{id:string})=>!ids.has(r.id)).sort(sort);
 const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 assert.equal(runtime.length,preservation.count);assert.equal(source.length,preservation.count);
 assert.equal(hash(runtime),preservation.runtime);assert.equal(hash(source),preservation.source);
});
