import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import common from '../tests/fixtures/alola-preservation.json' with {type:'json'};
const root='artifacts/experiments/balance/alola-tuning-20261018';
const ids=['named-olivia','named-kahili','named-kiawe'];
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const keep=(rows:{id:string;stage:string}[])=>rows.filter(r=>!ids.includes(r.id)).sort((a,b)=>(a.id+a.stage).localeCompare(b.id+b.stage));
const runtime=keep(JSON.parse(readFileSync(root+'/baseline-runtime.json','utf8'))),source=keep(JSON.parse(readFileSync(root+'/baseline-reviewed.json','utf8')).samples),design=JSON.parse(readFileSync(root+'/baseline-design.json','utf8'));
writeFileSync('tests/fixtures/alola-tuning-preservation.json',JSON.stringify({ids,count:runtime.length,runtime:hash(runtime),source:hash(source),otherTrainers:hash(design.trainers.filter((t:{id:string})=>!ids.includes(t.id))),sharedBuilds:hash(design.builds),common:{...common.common,...Object.fromEntries(['src/battle/run.ts','src/data/teams.ts','src/data/held-items.ts','src/data/gimmicks.ts','src/data/z-crystals.json','src/data/villain-organizations.ts'].map(path=>[path,createHash('sha256').update(readFileSync(path,'utf8').replace(/\r\n/g,'\n')).digest('hex')]))}},null,2)+'\n');
