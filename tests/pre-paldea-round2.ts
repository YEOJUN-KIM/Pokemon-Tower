import {readFileSync} from 'node:fs';
import baseline from './fixtures/paldea-round2-baseline.json' with {type:'json'};

/** Prior round's scope checksum still describes its own input/output. Restore
 * only this round's four authorized rows; current data is pinned independently. */
export function readPrePaldeaRound2(path:string,encoding:'utf8'){
 const text=readFileSync(path,encoding),ref=baseline.paths[path as keyof typeof baseline.paths];if(!ref)return text;
 const d=JSON.parse(text),rows=d.trainers??d.samples??d;
 const old=new Map(ref.rows.map(r=>[r.id,r]));const restored=rows.map((r:{id:string})=>old.get(r.id)??r);
 return JSON.stringify(Array.isArray(d)?restored:d.trainers?{...d,trainers:restored}:{...d,samples:restored});
}
