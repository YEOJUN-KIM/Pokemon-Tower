import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {reliableSampleMoves} from './lib/reliable-samples';
import {validateProfile} from '../src/server/training';
import {auditTeam} from './lib/sample-audit';
const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric seed');
const prefix=`artifacts/reliable-samples-${seed}`;if(existsSync(prefix+'-cases.json'))throw Error('Preserve existing samples');
const source=`artifacts/auto-suite-${seed}-cases.json`,original=JSON.parse(readFileSync(source,'utf8')),cases=structuredClone(original),changes:any[]=[];
for(const c of cases)for(const name of c.team){const p=c.profiles[name],before=[...p.moves];p.moves=reliableSampleMoves(name,p);c.moves[name]=[...p.moves];validateProfile(name,p);changes.push({caseId:c.id,species:name,before,after:p.moves});}
assert.deepEqual(cases.map((c:any)=>c.team),original.map((c:any)=>c.team));
const audits=cases.map((c:any)=>({caseId:c.id,...auditTeam(c.team,c.profiles,['Shedinja'])}));assert(!audits.some((a:any)=>a.issues.some((i:any)=>i.kind.startsWith('illegal'))));
writeFileSync(prefix+'-cases.json',JSON.stringify(cases,null,2));
writeFileSync(prefix+'-audit.json',JSON.stringify({changes,audits,notes:'Same species, ability, nature, IVs, points, tera and support moves; only initial attack moves change. TM/recruitment attack score remains original to isolate this intervention.'},null,2));
const files=[source,prefix+'-cases.json','scripts/prepare-reliable-samples.ts','scripts/lib/reliable-samples.ts'];
writeFileSync(prefix+'-manifest.json',JSON.stringify({files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}))},null,2));
console.log(JSON.stringify({cases:cases.length,changedSlots:changes.filter(c=>JSON.stringify(c.before)!==JSON.stringify(c.after)).length,coverageGaps:audits.filter((a:any)=>a.gaps.length).length}));
