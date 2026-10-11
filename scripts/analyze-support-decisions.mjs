import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
const results=[];
for(const cohort of ['matched','new'])for(const rule of ['basic','mega','dynamax','tera','chaos']){
 const maps={};for(const mode of ['v8','v9']){const m=new Map();for await(const line of createInterface({input:createReadStream(`artifacts/support-player-${cohort}-${rule}-${mode}-battles.jsonl`),crlfDelay:Infinity})){const r=JSON.parse(line);m.set(`${r.caseId}/${r.courseId}/${r.floor}`,r);}maps[mode]=m;}
 const paired=new Map();let better=0,worse=0;
 for(const [key,r] of maps.v9){const b=maps.v8.get(key);if(!b)throw Error('Missing baseline');if(r.winner===b.winner)continue;const improved=r.winner==='Player';if(improved)better++;else worse++;paired.set(key,{key,caseId:r.caseId,floor:r.floor,improved,baselineTurns:b.turns,supportTurns:r.turns,decisions:[]});}
 for await(const line of createInterface({input:createReadStream(`artifacts/support-player-${cohort}-${rule}-v9-turns.jsonl`),crlfDelay:Infinity})){
  const r=JSON.parse(line),key=`${r.caseId}/${r.courseId}/${r.floor}`,pair=paired.get(key);if(!pair)continue;
  const own=r.observation.ownTeam.find(p=>p.active);
  pair.decisions.push({turn:r.observation.turn,own:own?.details,condition:own?.condition,opponent:r.observation.opponent,action:r.action,reason:r.reason,context:r.context});
 }
 const count=reason=>[...paired.values()].filter(p=>!p.improved&&p.decisions.some(d=>d.reason===reason)).length;
 results.push({cohort,rule,better,worse,worsenedWithHandoff:count('screen-handoff'),worsenedWithSetup:count('screen-setup'),worsenedWithRoom:count('safe-trick-room'),pairs:[...paired.values()]});
}
writeFileSync('artifacts/support-decision-diagnosis.json',JSON.stringify({notes:'Matched outcome changes and timelines are observational associations, not causal proof. Includes both improvements and regressions. Previous new cohort is now development data.',results},null,2));
console.log(results.map(({pairs,...r})=>r));
