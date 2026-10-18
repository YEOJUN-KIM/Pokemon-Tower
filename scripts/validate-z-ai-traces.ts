import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {evaluateZOptions} from '../src/battle/z-decision';
import type {Observation} from '../src/battle/policy';

const root=process.env.Z_AI_OUTPUT??'artifacts/experiments/balance/z-ai-20261018';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const policyHash=digest(['src/battle/npc-policy.ts','src/battle/z-decision.ts'].map(p=>readFileSync(p,'utf8')).join('\n'));
const metricHash=digest('final-model-2\n'+['scripts/lib/z-ai-telemetry.ts','src/battle/z-decision.ts'].map(p=>readFileSync(p,'utf8')).join('\n'));
let traces=0,candidates=0,uses=0;
for(const file of readdirSync(root+'/traces').filter(f=>f.endsWith('.json'))){
 const log=JSON.parse(readFileSync(root+'/traces/'+file,'utf8'));
 assert.equal(log.policyHash,policyHash,file);assert.equal(log.metricHash,metricHash,file);
 assert.equal(log.aiVersion,file.startsWith('before-')?'tower-policy-v11':'tower-policy-v12',file);
 for(const d of log.z.decisions){
  const raw=log.decisions.find((r:{observation:Observation})=>r.observation.turn===d.turn&&r.observation.ownTeam.some(p=>p.active&&p.ident.split(': ')[1]===d.actor)&&r.observation.legalActions.some(a=>a.command.endsWith(' zmove')));
  assert.ok(raw,`${file}: missing observation`);
  const current=evaluateZOptions(raw.observation)!;
  for(const candidate of d.candidates){
   const expected=current.candidates.find(c=>c.action.command===candidate.command);assert.ok(expected);
   assert.ok(Math.abs(expected.damage-candidate.damage)<1e-7,`${file} turn ${d.turn} ${candidate.command}: stale metric ${candidate.damage} vs ${expected.damage}`);candidates++;
  }
 }
 const actual=log.publicProtocol.filter((l:string)=>l.startsWith('|-zpower|p2')).length;
 assert.equal(log.z.basic.used.filter((u:{kind:string})=>u.kind==='z').length,actual,file);
 assert.equal(log.z.decisions.filter((d:{used:boolean})=>d.used).length,actual,file);
 uses+=actual;traces++;
}
console.log(JSON.stringify({traces,candidates,uses,staleMetrics:0}));
