import {createReadStream,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {compositionSnapshot,compositionChanges} from './lib/composition-diagnostics';
import {auditProfile} from './lib/sample-audit';

const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric seed required');
const prefix=`artifacts/composition-diagnostics-${seed}`,read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
async function rows(path:string){const out:any[]=[];for await(const l of createInterface({input:createReadStream(path),crlfDelay:Infinity}))if(l.trim())out.push(JSON.parse(l));return out;}
const manifest=read(prefix+'-manifest.json');for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256);
const strip=(b:any)=>{const {phase,...rest}=b;return rest;},key=(r:any)=>[r.rule,r.caseId,r.courseId].join('|');
let reproducedBattles=0,terminalLosses=0;const changes:any[]=[],terminals:any[]=[],battles:any[]=[],summaries:any[]=[],initials=new Map<string,any>();
for(const rule of manifest.rules){
 const current=await rows(prefix+`-${rule}-battles.jsonl`),previous=await rows(`artifacts/coverage-factors-${seed}-${rule}-immunity-battles.jsonl`);
 assert.deepEqual(current.map(strip),previous.map(strip));reproducedBattles+=current.length;
 const report=read(`artifacts/simulation-composition-diagnostics-${seed}-${rule}-balanced.json`),old=read(`artifacts/simulation-coverage-factors-${seed}-${rule}-immunity-balanced.json`);
 assert.deepEqual(report.prices,old.prices);assert.deepEqual(report.stages,old.stages);
 summaries.push({rule,battles:current.length,climbs:report.stages.flatMap((s:any)=>s.climbs).length,finished:report.stages.reduce((s:number,c:any)=>s+c.finished,0)});
 const trace=await rows(prefix+`-${rule}-trace.jsonl`);let selections=0;
 for(const e of trace){
  assert.deepEqual(e.changes,compositionChanges(e.before,e.after));
  assert.deepEqual(e.after,compositionSnapshot(e.after.team,e.after.profiles));
  if(e.kind==='battle-selection'){
   const b=current[selections++];assert(b);assert.equal(key(e),key(b));assert.equal(e.floor,b.floor);assert.deepEqual(e.after.team,b.playerTeam.map((p:any)=>p.species));
   for(const p of b.playerTeam)assert.deepEqual(p.moves,e.after.profiles[p.species].moves);
   if(e.floor===1)initials.set(key(e),e.after);battles.push(e);
  }else if(e.kind==='terminal-loss'){
   const b=current.find((b:any)=>key(b)===key(e)&&b.floor===e.floor);assert(b&&b.winner!=='Player');terminalLosses++;terminals.push({...e,repeatedImmune:b.immunityMetrics.repeated>0});
  }else changes.push(e);
 }
 assert.equal(selections,current.length);console.log('Reproduced and audited '+rule);
}
const unique=(a:any[])=>new Set(a.map(key)).size;
const mutations=changes.filter(e=>JSON.stringify(e.before.profiles)!==JSON.stringify(e.after.profiles));
const roleKinds=['screens','pairedScreens','room','roomWithSlowAlly'];
const roles=roleKinds.map(role=>{
 const losses=mutations.filter(e=>e.changes.lostRoles.includes(role)),initial=[...initials].filter(([,p])=>p.roles[role]);
 const endMissing=terminals.filter(e=>initials.get(key(e))?.roles[role]&&!e.after.roles[role]);
 return {role,initialClimbs:initial.length,lossEvents:losses.length,climbsWithLoss:unique(losses),byKind:Object.fromEntries(['machine','recruitment','vitamin'].map(k=>[k,losses.filter(e=>e.kind===k).length])),terminalMissing:endMissing.length,examples:losses.slice(0,4).map(example)};
});
function example(e:any){return {rule:e.rule,caseId:e.caseId,courseId:e.courseId,floor:e.floor,kind:e.kind,detail:e.kind==='recruitment'?{selected:e.detail.selected,removed:e.detail.removed}:e.detail,beforeTeam:e.before.team,afterTeam:e.after.team,lostRoles:e.changes.lostRoles,lostAttackTypes:e.changes.lostAttackTypes,beforeMoves:Object.fromEntries(e.before.team.map((n:string)=>[n,e.before.profiles[n].moves])),afterMoves:Object.fromEntries(e.after.team.map((n:string)=>[n,e.after.profiles[n].moves]))};}
const coverageLosses=mutations.filter(e=>e.changes.lostShedinjaAnswer),reserved=battles.filter(e=>!e.after.shedinjaAnswerMembers.length&&e.after.reserveShedinjaAnswers.length);
const badProfiles=terminals.flatMap(e=>e.after.team.flatMap((species:string)=>auditProfile(species,e.after.profiles[species]).filter(i=>['training-category-mismatch','nature-category-mismatch','room-speed-review'].includes(i.kind)).map(i=>({rule:e.rule,caseId:e.caseId,courseId:e.courseId,floor:e.floor,species,...i})));
const result={reproducedBattles,terminalLosses,summaries,eventCounts:Object.fromEntries(['recruitment','machine','vitamin'].map(k=>[k,{events:changes.filter(e=>e.kind===k).length,mutations:mutations.filter(e=>e.kind===k).length}])),roles,coverage:{lostAnswerEvents:coverageLosses.length,byKind:Object.fromEntries(['machine','recruitment','vitamin'].map(k=>[k,coverageLosses.filter(e=>e.kind===k).length])),climbsLosingAnswer:unique(coverageLosses),selectedGapBattles:battles.filter(e=>!e.after.shedinjaAnswerMembers.length).length,answerOnReserveBattles:reserved.length,climbsLeavingAnswerInReserve:unique(reserved),terminalGap:terminals.filter(e=>!e.after.shedinjaAnswerMembers.length).length,terminalGapWithReserve:terminals.filter(e=>!e.after.shedinjaAnswerMembers.length&&e.after.reserveShedinjaAnswers.length).length,repeatImmuneTerminalGap:terminals.filter(e=>e.repeatedImmune&&!e.after.shedinjaAnswerMembers.length).length,repeatImmuneTerminalTotal:terminals.filter(e=>e.repeatedImmune).length,examples:coverageLosses.slice(0,5).map(example),reserveExamples:reserved.slice(0,3).map(e=>({rule:e.rule,caseId:e.caseId,courseId:e.courseId,floor:e.floor,team:e.after.team,reserve:e.after.reserveShedinjaAnswers}))},terminalProfileReviews:badProfiles,notes:'Identical immunity-only actions and outcomes, not a counterfactual intervention. Role loss may be a reasonable tradeoff; correlation is not causation. Wonder Guard coverage static versus original Shedinja, ignores PP/disabled moves/tera/status/item/entry survival. Reserve answer is own stored moves, not proof of a legal or winning battle switch. Trace never feeds policy or exposes hidden enemy information to it.'};
writeFileSync(prefix+'-audit.json',JSON.stringify(result,null,2));
const table=roles.map(r=>`| ${r.role} | ${r.initialClimbs} | ${r.lossEvents} | ${r.byKind.machine} | ${r.byKind.recruitment} | ${r.byKind.vitamin} | ${r.terminalMissing} |`).join('\n');
writeFileSync(prefix+'-report.md',`# 팀 선발·기술 정비 진단\n\n기존 무효 처리만 적용한 결과 ${reproducedBattles}배틀의 팀·행동·결과·경제·등반 요약이 모두 정확히 재현됐다. 마지막 패배 ${terminalLosses}개도 기존 재생 검증 기록과 동일하다. 실제 NPC나 가격을 바꾸지 않았다.\n\n| 역할 | 시작 보유 등반 | 역할 손실 사건 | TM | 영입 | 영양제 | 시작 보유 후 마지막 패배에서 없음 |\n|---|---:|---:|---:|---:|---:|---:|\n${table}\n\n껍질몬 직접 공격 수단 손실 ${result.coverage.lostAnswerEvents}회, ${result.coverage.climbsLosingAnswer}등반. 선택 파티에 공격 수단이 없지만 보유 후보에 남은 경우 ${reserved.length}배틀 / ${unique(reserved)}등반. 마지막 패배 파티의 정적 공격 수단 없음 ${result.coverage.terminalGap}개; 그중 후보에는 남음 ${result.coverage.terminalGapWithReserve}개. 반복 무효가 발생한 마지막 패배 ${result.coverage.repeatImmuneTerminalTotal}개 중 정적 공격 수단 없음 ${result.coverage.repeatImmuneTerminalGap}개.\n\n역할이 없어졌다는 것만으로 나쁜 선택이나 패배 원인으로 단정하지 않는다. 벽은 하나라도 보유 / 양쪽 벽 또는 오로라베일을 분리했고, 트릭룸은 보유 / 별도 느린 동료(현재 스피드≤105)를 분리했다. 직접 공격 수단은 원래 타입의 껍질몬·불가사의부적에 대한 정적 검사로 PP·봉인·테라·상태이상·도구·생존을 반영하지 않는다. 같은 9코스를 재사용한 관찰 진단이며 사람 승률·독립 검증·학습 모델 훈련이 아니다. 상세 사례와 실제 전체 보유 프로필은 audit.json 및 trace.jsonl에 보존했다.\n`);
console.log(JSON.stringify({...result,terminalProfileReviews:{count:badProfiles.length,examples:badProfiles.slice(0,3)},roles:roles.map(({examples,...r})=>r),coverage:{...result.coverage,examples:undefined,reserveExamples:undefined}},null,2));
