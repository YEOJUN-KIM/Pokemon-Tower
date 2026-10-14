import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {abilityLearningCases,runAbilityLearningCase} from './lib/ability-learning-cases';
import {battleEvents,replayBattle} from '../src/battle/run';

const rows=[];
for(const [index,fixture] of abilityLearningCases.entries())for(let repeat=0;repeat<3;repeat++)for(const control of [false,true]){
 const result=await runAbilityLearningCase(index,[100+index,200+repeat,300,400],control);
 const reveal=result.lines.some(l=>l.includes('ability: '+fixture.ability)||l.includes('|-ability|p2a: '+fixture.target+'|'+fixture.ability));
 assert.equal(reveal,!control,fixture.target+' public reveal');
 const next=result.choices.find(d=>d.turn===2);
 assert(next,fixture.target+' next decision');
 const turn1=result.lines.slice(result.lines.indexOf('|turn|1'),result.lines.indexOf('|turn|2'));
 assert(turn1.some(l=>l.startsWith('|move|p1a: ')&&l.includes('|'+fixture.moves[0]+'|')),'first probe actually executed');
 if(control)assert(turn1.some(l=>l.startsWith('|-damage|p2a: '+fixture.target+'|')),'control probe actually damaged target');
 else{
  assert(next.action.startsWith('move '),'should use available alternative');
  const nextMove=next.observation.legalActions.find(a=>a.command===next.action)!;
  assert.notEqual(Showdown.Dex.moves.get(nextMove.label).type,fixture.blockedType,'blocked type repeated');
 }
 for(const d of result.log.decisions){
  assert(d.observation.legalActions.some(a=>a.command===d.action));
  assert(Object.keys(d.observation.opponent??{}).every(k=>['species','condition'].includes(k)),'private opponent information leaked');
 }
 const replay=await replayBattle(result.log);
 assert.deepEqual(battleEvents(result.log.publicProtocol),battleEvents(replay.publicProtocol));
 assert.deepEqual(result.log.decisions.map(d=>[d.side,d.action]),replay.decisions.map(d=>[d.side,d.action]));
 rows.push({...result,nextAction:next.action,nextMove:next.observation.legalActions.find(a=>a.command===next.action)?.label,exactReplay:true});
}
const files=['scripts/check-ability-learning.ts','scripts/lib/ability-learning-cases.ts','src/battle/coverage-factor-policy.ts','src/battle/public-immunity-v2.ts','src/battle/run.ts','src/battle/switch-policy.ts','pnpm-lock.yaml'];
const report={purpose:'Controlled first-attack probes; ability learning correctness, not win rate or machine learning training.',policy:'CoverageFactorPolicy immunity=true switching=false; live NPC unchanged',matches:rows.length,immunityCases:rows.filter(r=>!r.control).length,controls:rows.filter(r=>r.control).length,exactReplays:rows.length,sourceHashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),rows};
writeFileSync('artifacts/experiments/ai/ability-learning-20261011.json',JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({matches:report.matches,immunityCases:report.immunityCases,controls:report.controls,exactReplays:report.exactReplays}));
