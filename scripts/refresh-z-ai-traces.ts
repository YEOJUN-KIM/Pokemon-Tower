import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {runBattle} from '../src/battle/run';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {createNpcPolicy as archivedNpcPolicy} from '../src/battle/npc-policy-v11';
import {ZMovePolicy} from '../src/battle/z-move-policy';
import {monitorZPolicy,zAiTelemetry} from './lib/z-ai-telemetry';

const root=process.env.Z_AI_OUTPUT??'artifacts/experiments/balance/z-ai-20261018';
const jsonl=(p:string)=>readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const policyHash=digest(['src/battle/npc-policy.ts','src/battle/z-decision.ts'].map(p=>readFileSync(p,'utf8')).join('\n'));
const metricHash=digest('final-model-2\n'+['scripts/lib/z-ai-telemetry.ts','src/battle/z-decision.ts'].map(p=>readFileSync(p,'utf8')).join('\n'));
const cache=new Map(jsonl(root+'/outcomes.jsonl').map(r=>[r.key,r]));
let refreshed=0;
for(const phase of ['before','after']){
 const rows=new Map(jsonl(`${root}/${phase}-battles.jsonl`).map(r=>[[r.npcId,r.floor,r.n,r.caseId,r.rule].join(':'),r]));
 for(const file of readdirSync(root+'/traces').filter(f=>f.startsWith(phase+'-'))){
  const path=root+'/traces/'+file,original=JSON.parse(readFileSync(path,'utf8'));
  const {foe,seed,teams}=original,caseId=file.match(/-(starters|offense|bulk|signature)\.json$/)![1];
  const row=rows.get([foe.npcId,seed[1],seed[0],caseId,'basic'].join(':'));assert.ok(row);
  // Every saved trace is the basic player-rule stratum, with no trainer gear.
  const inputKey=digest(JSON.stringify({p1:teams.p1,p2:foe.packed,seed,rule:'basic',ai:foe.ai,enemyRule:foe.rule,tera:foe.tera,teraSpecies:foe.teraSpecies,equipment:[]}));
  assert.equal(phase==='after'?digest(inputKey+':z-v12:'+policyHash):inputKey,row.key,file);
  const monitored=monitorZPolicy((phase==='before'?archivedNpcPolicy:createNpcPolicy)(foe.ai));
  const log=await runBattle({teams,seed,rule:'basic',opponentRule:foe.rule,opponentTeraSpecies:foe.teraSpecies,teraTickets:{p1:0,p2:foe.tera},trainerEquipment:[],player:new ZMovePolicy('p1'),opponent:monitored.policy});
  assert.equal(digest(log.publicProtocol.filter(l=>!l.startsWith('|t:|')).join('\n')),cache.get(row.key).hash,file);
  assert.equal(log.winner,row.winner,file);
  writeFileSync(path,JSON.stringify({foe,seed,teams,winner:log.winner,aiVersion:phase==='before'?'tower-policy-v11':'tower-policy-v12',policyHash,metricHash,publicProtocol:log.publicProtocol,z:zAiTelemetry(log,monitored.evaluations),decisions:log.decisions.filter(d=>d.side==='p2')},null,2));
  refreshed++;
 }
}
console.log(JSON.stringify({refreshed,inputAndProtocolHashesMatched:refreshed}));
