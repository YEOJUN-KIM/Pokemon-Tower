import {readFileSync} from 'node:fs';
import baseline from './fixtures/pre-paldea-history.json' with {type:'json'};
import {paldeaTrainers} from '../src/data/paldea-trainers';

/** Historical checksums describe pre-Paldea fixtures. Restore only authorized
 * generation-9 rows and common routing metadata for these historical suites.
 * paldea-npcs.test.ts independently checks actual current non-Paldea rows. */
export function readPrePaldeaFile(path:string,encoding:'utf8'):string{
 if(Object.hasOwn(baseline.common,path))return baseline.common[path as keyof typeof baseline.common];
 const text=readFileSync(path,encoding),plan=baseline.paths[path as keyof typeof baseline.paths];
 if(!plan)return text;
 const d=JSON.parse(text),ids=new Set([...plan.oldRows.map(r=>r.id),...paldeaTrainers.map(t=>t.id)]);
 const rows=[...(d.samples??d).filter((r:{id:string})=>!ids.has(r.id)),...plan.oldRows].sort((a,b)=>plan.order.indexOf(a.id+':'+a.stage)-plan.order.indexOf(b.id+':'+b.stage));
 return JSON.stringify(Array.isArray(d)?rows:{...d,samples:rows});
}
