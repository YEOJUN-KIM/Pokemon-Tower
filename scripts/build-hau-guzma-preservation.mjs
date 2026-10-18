import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Read the requested commit, never the modified working tree.
const commit='7f2be76aecfdc4b92911a774cd8d9b29912e6ef8';
const read=path=>execFileSync('git',['show',`${commit}:${path}`],{encoding:'utf8'});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ids=['named-hau','named-guzma'];
const runtime=JSON.parse(read('src/data/normal-npc-templates.json'));
const source=JSON.parse(read('scripts/data/npc/normal-npc-samples.json')).samples;
const design=JSON.parse(read('scripts/data/npc/alola-design.json'));
const root='artifacts/experiments/balance/hau-guzma-20261019';mkdirSync(root,{recursive:true});
for(const [name,path]of Object.entries({'runtime':'src/data/normal-npc-templates.json','reviewed':'scripts/data/npc/normal-npc-samples.json','design':'scripts/data/npc/alola-design.json'}))writeFileSync(`${root}/baseline-${name}.json`,read(path));
const keep=rows=>rows.filter(r=>!ids.includes(r.id)).sort((a,b)=>(a.id+a.stage).localeCompare(b.id+b.stage));
writeFileSync('tests/fixtures/hau-guzma-preservation.json',JSON.stringify({
 commit,ids,count:keep(runtime).length,runtime:hash(keep(runtime)),source:hash(keep(source)),
 otherTrainers:hash(design.trainers.filter(t=>!ids.includes(t.id))),sharedBuilds:hash(design.builds),
 oldRuntime:runtime.filter(r=>ids.includes(r.id)),oldSource:source.filter(r=>ids.includes(r.id)),
 oldTrainers:design.trainers.filter(t=>ids.includes(t.id)),trainerOrder:design.trainers.map(t=>t.id),originalOverrides:design.overrides,
},null,2)+'\n');
