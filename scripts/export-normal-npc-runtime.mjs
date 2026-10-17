import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {projectNpcRuntime} from './lib/npc-runtime.mjs';
const source=JSON.parse(readFileSync('scripts/data/npc/normal-npc-samples.json','utf8'));
const rows=projectNpcRuntime(source),output='src/data/normal-npc-templates.json';
if(process.argv.includes('--check')){
 assert.deepEqual(JSON.parse(readFileSync(output,'utf8')),JSON.parse(JSON.stringify(rows)),'NPC runtime differs from reviewed source; run node scripts/export-normal-npc-runtime.mjs');
 console.log(`Verified ${rows.length} live NPC templates against reviewed source.`);
}else{
 writeFileSync(output,JSON.stringify(rows)+'\n');
 console.log(`Exported ${rows.length} live NPC templates. DO NOT EDIT ${output} directly.`);
}
