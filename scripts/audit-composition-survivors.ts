import {createReadStream,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {immuneLossSignals} from './lib/immune-loss-signals';

const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric seed required');
const prefix=`artifacts/experiments/samples/composition-diagnostics-${seed}`;
const manifest=JSON.parse(readFileSync(prefix+'-manifest.json','utf8'));
for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256);
const cases=JSON.parse(readFileSync(`artifacts/experiments/samples/auto-suite-${seed}-cases.json`,'utf8'));
const initialMoves=cases.flatMap((c:any)=>c.team.map((species:string)=>({caseId:c.id,species,recharge:c.profiles[species].moves.filter((m:string)=>Showdown.Dex.moves.get(m).flags.recharge)})));
const losses:any[]=[];
for(const rule of manifest.rules)for await(const l of createInterface({input:createReadStream(prefix+`-${rule}-battles.jsonl`),crlfDelay:Infinity})){
 const b=JSON.parse(l);if(b.winner==='Player'||b.immunityMetrics.repeated===0)continue;
 losses.push({rule,caseId:b.caseId,courseId:b.courseId,floor:b.floor,signals:immuneLossSignals(b.playerTeam,b.publicProtocol)});
}
const kinds=['no-static-direct-answer-among-survivors','static-answer-only-on-bench','static-answer-on-current-pokemon'];
const result={repeatImmuneTerminalLosses:losses.length,groups:kinds.map(kind=>({kind,losses:losses.filter(b=>b.signals[kind]>0).length,immuneEvents:losses.reduce((s,b)=>s+(b.signals[kind]??0),0)})),initialSlots:initialMoves.length,initialSlotsWithRecharge:initialMoves.filter((m:any)=>m.recharge.length).length,initialMoves,losses,notes:'Overlapping groups at actual public immune events; answers reconstructed from living members, public enemy types/ability and stored own moves. Ignores PP/disable/own Tera Blast/item/entry survival and does not prove an available switch or winning action. Descriptive, not causal. Initial slots deduplicate courses/rules but not species between teams.',files:['scripts/audit-composition-survivors.ts','scripts/lib/immune-loss-signals.ts',...manifest.rules.map((r:string)=>prefix+`-${r}-battles.jsonl`)].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}))};
writeFileSync(prefix+'-survivors.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({repeatImmuneTerminalLosses:losses.length,groups:result.groups,initialSlots:result.initialSlots,initialSlotsWithRecharge:result.initialSlotsWithRecharge},null,2));
