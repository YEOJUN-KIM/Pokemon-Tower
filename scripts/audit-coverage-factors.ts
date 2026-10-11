import {createReadStream,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,battleEvents} from '../src/battle/run';

const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric seed required');
const prefix=`artifacts/coverage-factors-${seed}`,read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
async function rows(path:string){const out:any[]=[];for await(const l of createInterface({input:createReadStream(path),crlfDelay:Infinity}))if(l.trim())out.push(JSON.parse(l));return out;}
const manifest=read(prefix+'-manifest.json');for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256);
const source=read('artifacts/observed-damage-validation-courses.json').courses;
const cells:any[]=[];let totalBattles=0,replays=0,endpointBattlesReproduced=0;let common:any;
const strip=(b:any)=>{const {phase,playerAI,...rest}=b;return rest;};
for(const mode of manifest.modes)for(const rule of manifest.rules){
 const report=read(`artifacts/simulation-coverage-factors-${seed}-${rule}-${mode}-balanced.json`),battles=await rows(prefix+`-${rule}-${mode}-battles.jsonl`);
 const config={prices:report.prices,cases:report.caseDefinitions,sourceCourseHash:report.sourceCourseHash,opponentAI:report.opponentAI,format:report.format,behavior:report.behavior,composition:report.composition,totalFloors:report.totalFloors};
 if(common)assert.deepEqual(config,common);common=config;assert.equal(report.opponentAI,'v7');
 assert.equal(battles.length,report.stages.reduce((s:number,c:any)=>s+c.battles,0));assert.equal(report.stages.length,manifest.cases);totalBattles+=battles.length;
 if(['baseline','both'].includes(mode)){
  const old=await rows(`artifacts/coverage-compare-${seed}-${rule}-${mode==='baseline'?'matchup':'adaptive'}-battles.jsonl`);
  assert.deepEqual(battles.map(strip),old.map(strip));endpointBattlesReproduced+=battles.length;
 }
 let repeatedLosses=0,knownBlocked=0,preventableBlocked=0,repeatAttacks=0;
 const reasons:Record<string,number>={},runs:any[]=[];
 for(const b of battles){knownBlocked+=b.immunityDecisionMetrics.knownBlocked;preventableBlocked+=b.immunityDecisionMetrics.preventableBlocked;repeatAttacks+=b.immunityMetrics.repeated;for(const [key,n] of Object.entries(b.decisionReasons))reasons[key]=(reasons[key]??0)+Number(n);}
 for(const st of report.stages){assert.equal(st.climbs.length,manifest.courses);for(const c of st.climbs){
  runs.push({caseId:st.stage,courseId:c.id,cleared:c.cleared});
  const seq=battles.filter((b:any)=>b.caseId===st.stage&&b.courseId===c.id);assert.equal(seq.length,c.cleared+(c.cleared<100?1:0));assert(seq.every((b:any,i:number)=>b.floor===i+1));assert(seq.slice(0,c.cleared).every((b:any)=>b.winner==='Player'));assert.equal(c.coins,c.earned-c.spent);assert(c.coins>=0);
  if(c.cleared===100)continue;
  const loss=seq.at(-1)!;assert.notEqual(loss.winner,'Player');repeatedLosses+=Number(loss.immunityMetrics.repeated>0);
  const queue=(side:'p1'|'p2')=>{const actions=loss.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>actions[n++].action};};
  const e=source.find((s:any)=>s.id===c.id).encounters[loss.floor-1];
  const replay=await runBattle({rule:loss.rule,format:loss.format,seed:loss.seed,teams:{p1:Showdown.Teams.pack(loss.playerTeam),p2:Showdown.Teams.pack(loss.opponentTeam)},teraTickets:{p1:loss.teraTicketsBefore,p2:rule==='basic'?0:e.enemyTeraTickets??1},battleItems:loss.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
  assert.equal(replay.winner,loss.winner);assert.deepEqual(replay.decisions.map(d=>[d.side,d.action]),loss.decisions.map((d:any)=>[d.side,d.action]));assert.deepEqual(battleEvents(replay.publicProtocol),loss.publicProtocol);replays++;
 }}
 const cell={mode,rule,battles:battles.length,climbs:runs.length,finished:report.stages.reduce((s:number,c:any)=>s+c.finished,0),passed50:report.stages.reduce((s:number,c:any)=>s+c.passed50,0),averageCleared:runs.reduce((s:number,c:any)=>s+c.cleared,0)/runs.length,repeatedLosses,knownBlocked,preventableBlocked,repeatAttacks,reasons,runs};cells.push(cell);
 console.log('Audited '+mode+' '+rule);
}
const aggregate=manifest.modes.map((mode:string)=>{const a=cells.filter(c=>c.mode===mode);return{mode,climbs:a.reduce((s,c)=>s+c.climbs,0),battles:a.reduce((s,c)=>s+c.battles,0),finished:a.reduce((s,c)=>s+c.finished,0),passed50:a.reduce((s,c)=>s+c.passed50,0),averageCleared:a.reduce((s,c)=>s+c.averageCleared,0)/a.length,repeatedLosses:a.reduce((s,c)=>s+c.repeatedLosses,0),preventableBlocked:a.reduce((s,c)=>s+c.preventableBlocked,0),repeatAttacks:a.reduce((s,c)=>s+c.repeatAttacks,0)};});
const paired=manifest.modes.filter((m:string)=>m!=='baseline').map((mode:string)=>{let higher=0,lower=0,same=0;const teams:any[]=[];for(const rule of manifest.rules){const before=cells.find(c=>c.mode==='baseline'&&c.rule===rule),after=cells.find(c=>c.mode===mode&&c.rule===rule);for(const r of after.runs){const b=before.runs.find((b:any)=>b.caseId===r.caseId&&b.courseId===r.courseId);higher+=Number(r.cleared>b.cleared);lower+=Number(r.cleared<b.cleared);same+=Number(r.cleared===b.cleared);}for(const caseId of new Set<string>(after.runs.map((r:any)=>r.caseId))){const avg=(c:any)=>c.runs.filter((r:any)=>r.caseId===caseId).reduce((s:number,r:any)=>s+r.cleared,0)/manifest.courses;teams.push({rule,caseId,before:avg(before),after:avg(after)});}}return{mode,higher,lower,same,teams};});
const contrasts=[['immunity','baseline','immunity'],['immunity-with-switching','switching','both'],['switching','baseline','switching'],['switching-with-immunity','immunity','both']].map(([name,beforeMode,afterMode])=>{
 const before=aggregate.find((c:any)=>c.mode===beforeMode),after=aggregate.find((c:any)=>c.mode===afterMode);let higher=0,lower=0,same=0;
 for(const rule of manifest.rules){const b=cells.find(c=>c.mode===beforeMode&&c.rule===rule),a=cells.find(c=>c.mode===afterMode&&c.rule===rule);for(const r of a.runs){const old=b.runs.find((q:any)=>q.caseId===r.caseId&&q.courseId===r.courseId);higher+=Number(r.cleared>old.cleared);lower+=Number(r.cleared<old.cleared);same+=Number(r.cleared===old.cleared);}}
 return{name,beforeMode,afterMode,higher,lower,same,finishedDelta:after.finished-before.finished,passed50Delta:after.passed50-before.passed50,meanClearedDelta:after.averageCleared-before.averageCleared};
});
const result={seed,totalBattles,replays,endpointBattlesReproduced,aggregate,cells,paired,contrasts,notes:'Factor groups: public immunity memory/gimmick guard vs forced/emergency/fallback switching. Each cell same 18 teams and nine seen courses/NPC/economy. Same public checker. Correlated course repeats; not human win rates or held-out evaluation. No live change or model training.'};
writeFileSync(prefix+'-audit.json',JSON.stringify(result,null,2));
const labels:Record<string,string>={baseline:'기존',immunity:'무효 처리만',switching:'교체 판단만',both:'둘 다'};
const table=aggregate.map((c:any)=>`| ${labels[c.mode]} | ${c.finished}/${c.climbs} | ${c.passed50} | ${c.averageCleared.toFixed(2)} | ${c.preventableBlocked} | ${c.repeatedLosses} |`).join('\n');
const rules=cells.map(c=>`| ${labels[c.mode]} | ${c.rule} | ${c.finished} | ${c.passed50} | ${c.averageCleared.toFixed(2)} |`).join('\n');
writeFileSync(prefix+'-report.md',`# 무효·교체 판단 분리 비교 · ${seed}\n\n같은 18팀·9코스·3룰을 네 정책에 실행했다. 각 486등반, 합계 1,944등반·${totalBattles}배틀이다. 기존/둘다 끝점 ${endpointBattlesReproduced}배틀은 이전 비교의 모든 기록과 정확히 일치했다. 마지막 패배 ${replays}개는 전체 공개 프로토콜로 재생해 일치 확인했다.\n\n| 정책 | 100층 완주 | 50층 통과 | 평균 성공 층 | 유효 합법 대안 있는데 무효 선택 | 반복 무효 마지막 패배 |\n|---|---:|---:|---:|---:|---:|\n${table}\n\n| 정책 | 룰 | 완주 /162 | 50층 통과 | 평균 성공 층 |\n|---|---|---:|---:|---:|\n${rules}\n\n무효 처리에는 추가 공개 특성/회복·발동/테라 이후 기억/특성별 실패 기억/기믹 공격 검사, 교체 판단에는 강제 교체 후보/긴급 교체 간격 및 상한/가짜 강제 교체 폴백 방지가 묶여 있다. 단일 함수의 인과 효과가 아니라 두 기능 묶음의 2×2 비교다.\n\n예상 생존과 공격 가능성은 공개 정보의 추정이며 PP·봉인·선택 잠금까지 완벽히 다루지 않는다. 동일 코스를 사용한 기존 진단으로 사람이 플레이하는 승률이나 독립 검증은 아니다. 룰/팀 결과는 서로 연관되며 새 정책의 행동이 난수와 상대 행동을 바꿀 수 있다. 실제 상대 v7/난이도/가격/기술 샘플은 고정했고 게임에 승격하거나 학습 모델을 훈련하지 않았다.\n\n파일: coverage-factors-${seed}-manifest.json, 룰/정책별 battles.jsonl, audit.json. 감사 실행: node node_modules/tsx/dist/cli.mjs scripts/audit-coverage-factors.ts ${seed}. 기존 결과는 보존한다.\n`);
console.log(JSON.stringify({totalBattles,replays,endpointBattlesReproduced,aggregate,paired:paired.map(({teams,...p}:any)=>p)},null,2));
