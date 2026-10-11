import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,battleEvents} from '../src/battle/run';
import {allowsGimmick} from '../src/data/run-rules';

const id=process.argv[2]??'20261011',prefix=`artifacts/opponent-learning-${id}`;
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const manifest=read(prefix+'-manifest.json');
for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256,f.path);
const courses=read(manifest.courseFile).courses,cases=read(manifest.caseFile);
assert.equal(courses.length,18);assert.equal(cases.length,18);
async function* rows(path:string){for await(const l of createInterface({input:createReadStream(path),crlfDelay:Infinity}))if(l.trim())yield JSON.parse(l);}
const cells:any[]=[];let totalBattles=0,replays=0,reproducedBattles=0,common:any;
for(const mode of manifest.modes)for(const rule of manifest.rules){
 const report=read(`artifacts/simulation-opponent-learning-${id}-${rule}-${mode}-balanced.json`);
 const config={cases:report.caseDefinitions,prices:report.prices,sourceCourseHash:report.sourceCourseHash,playerAI:report.playerAI,format:report.format,behavior:report.behavior,composition:report.composition,totalFloors:report.totalFloors};
 if(common)assert.deepEqual(config,common);common=config;assert.equal(report.opponentAI,mode);
 assert.deepEqual(report.caseDefinitions,cases);
 const oldMode=mode==='v7'&&['basic','tera','chaos'].includes(rule);
 const previous=oldMode?rows(`artifacts/sample-holdout-20261011-${rule}-samples-battles.jsonl`)[Symbol.asyncIterator]():null;
 if(oldMode)assert.deepEqual(report.stages,read(`artifacts/simulation-sample-holdout-20261011-${rule}-samples-balanced.json`).stages);
 const sequences=new Map<string,{n:number;wins:number;loss:boolean}>();
 const metric={battles:0,npcDecisions:0,npcKnownBlocked:0,npcPreventableBlocked:0,npcImmune:0,npcRepeatImmune:0,npcSwitches:0,npcQuickReturns:0};
 for await(const b of rows(prefix+`-${rule}-${mode}-battles.jsonl`)){
  if(previous){const old=await previous.next();assert(!old.done);const {phase,npcImmunityMetrics,npcDecisionMetrics,...value}=b;const {phase:oldPhase,...oldValue}=old.value;assert.deepEqual(value,oldValue);reproducedBattles++;}
  const key=b.caseId+':'+b.courseId,seq=sequences.get(key)??{n:0,wins:0,loss:false};assert(!seq.loss);assert.equal(b.floor,seq.n+1);seq.n++;seq.wins+=Number(b.winner==='Player');seq.loss=b.winner!=='Player';sequences.set(key,seq);
  metric.battles++;metric.npcDecisions+=b.decisions.filter((d:any)=>d.side==='p2'&&d.action.startsWith('move ')).length;
  metric.npcKnownBlocked+=b.npcDecisionMetrics.knownBlocked;metric.npcPreventableBlocked+=b.npcDecisionMetrics.preventableBlocked;
  metric.npcImmune+=b.npcImmunityMetrics.total;metric.npcRepeatImmune+=b.npcImmunityMetrics.repeated;
  metric.npcSwitches+=b.npcDecisionMetrics.voluntarySwitches;metric.npcQuickReturns+=b.npcDecisionMetrics.quickReturns;
  assert(b.npcDecisionMetrics.voluntarySwitches<=4,'NPC switch limit');
  if(b.winner==='Player')continue;
  const encounter=courses.find((c:any)=>c.id===b.courseId).encounters[b.floor-1];
  const queue=(side:'p1'|'p2')=>{const a=b.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>a[n++].action};};
  const replay=await runBattle({rule:b.rule,format:b.format,seed:b.seed,teams:{p1:Showdown.Teams.pack(b.playerTeam),p2:Showdown.Teams.pack(b.opponentTeam)},teraTickets:{p1:b.teraTicketsBefore,p2:allowsGimmick(b.rule,'terastallize')?encounter.enemyTeraTickets??1:0},battleItems:b.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
  assert.equal(replay.winner,b.winner);assert.deepEqual(battleEvents(replay.publicProtocol),b.publicProtocol);assert.deepEqual(replay.decisions.map(d=>[d.side,d.action]),b.decisions.map((d:any)=>[d.side,d.action]));replays++;
 }
 if(previous)assert((await previous.next()).done);
 const runs=report.stages.flatMap((s:any)=>s.climbs.map((c:any)=>({...c,caseId:s.stage,category:s.category,initialTeam:s.initialTeam})));
 assert.equal(runs.length,324);
 for(const c of runs){const seq=sequences.get(c.caseId+':'+c.id)!;assert.equal(seq.wins,c.cleared);assert.equal(seq.n,c.cleared+(c.cleared<100?1:0));assert.equal(c.coins,c.earned-c.spent);}
 assert.equal(metric.battles,report.stages.reduce((s:number,c:any)=>s+c.battles,0));totalBattles+=metric.battles;
 cells.push({mode,rule,...metric,climbs:runs.length,passed10:runs.filter((r:any)=>r.cleared>=10).length,passed50:runs.filter((r:any)=>r.cleared>=50).length,finished:runs.filter((r:any)=>r.cleared===100).length,averageCleared:runs.reduce((s:number,c:any)=>s+c.cleared,0)/runs.length,runs});
 console.log('Audited '+mode+' '+rule);
}
const paired:any[]=[];
for(const rule of manifest.rules){
 const before=cells.find(c=>c.rule===rule&&c.mode==='v7'),after=cells.find(c=>c.rule===rule&&c.mode==='v8');
 let higher=0,lower=0,same=0;const byCase:Record<string,any>={},byCategory:Record<string,any>={},byTheme:Record<string,any>={};
 for(const r of after.runs){const old=before.runs.find((q:any)=>q.caseId===r.caseId&&q.id===r.id);assert(old);const h=Number(r.cleared>old.cleared),l=Number(r.cleared<old.cleared),s=Number(r.cleared===old.cleared);higher+=h;lower+=l;same+=s;
  for(const [map,key] of [[byCase,r.caseId],[byCategory,r.category],[byTheme,r.theme]] as const){const row=map[key]??={n:0,beforeSum:0,afterSum:0,before50:0,after50:0,higher:0,lower:0,same:0};row.n++;row.beforeSum+=old.cleared;row.afterSum+=r.cleared;row.before50+=Number(old.cleared>=50);row.after50+=Number(r.cleared>=50);row.higher+=h;row.lower+=l;row.same+=s;}
 }
 paired.push({rule,higher,lower,same,byCase,byCategory,byTheme});
}
const labels:Record<string,string>={basic:'기본룰',mega:'메진룰',dynamax:'다맥룰',tera:'테라룰',chaos:'혼합룰'};
const table=manifest.rules.map((rule:string)=>{const b=cells.find(c=>c.mode==='v7'&&c.rule===rule),a=cells.find(c=>c.mode==='v8'&&c.rule===rule),pct=(v:number)=>(v/324*100).toFixed(1)+'%';return`| ${labels[rule]} | ${pct(b.passed10)} → ${pct(a.passed10)} | ${pct(b.passed50)} → ${pct(a.passed50)} | ${pct(b.finished)} → ${pct(a.finished)} | ${b.averageCleared.toFixed(2)} → ${a.averageCleared.toFixed(2)} |`;}).join('\n');
const behaviorTable=cells.map(c=>`| ${labels[c.rule]} ${c.mode} | ${c.npcPreventableBlocked}/${c.npcDecisions} | ${c.npcRepeatImmune} | ${c.npcSwitches} | ${c.npcQuickReturns} |`).join('\n');
const result={totalBattles,replays,reproducedBattles,manifest:prefix+'-manifest.json',cells,paired,notes:manifest.notes};
writeFileSync(prefix+'-audit.json',JSON.stringify(result,null,2),{flag:'wx'});
writeFileSync(prefix+'-report.md',`# 적 AI v7/v8 난이도 비교\n\n18팀 × 18코스 × 5룰 × 2조건 = 3,240등반, 총 ${totalBattles}배틀. 각 룰·AI별 324등반. 마지막 패배 ${replays}전 전체 공개 로그·행동 재생 일치. v7 기본·테라·혼합룰 ${reproducedBattles}전은 이전 수정 샘플 실험과 전체 데이터가 일치했다.\n\n각 비율은 해당 층을 승리하고 통과한 비율이며 사람 승률이 아니다. 시작 팀·코스·난수·상점·플레이어 판단은 같고, 적 AI만 달라진다. 이후 승패가 달라지면 영입과 구매도 달라질 수 있다. 기존 검증 코스를 재사용했으며 새 홀드아웃은 아니다.\n\n| 룰 | 10층 통과 v7→v8 | 50층 통과 | 100층 완주 | 평균 성공 층 |\n|---|---:|---:|---:|---:|\n${table}\n\n| 조건 | 다른 공격이 있는데 무효 공격 선택 / 공격 결정 | 실제 반복 무효 | 자발 교체 | 5턴 미만 동료 복귀 |\n|---|---:|---:|---:|---:|\n${behaviorTable}\n\n무효 공격 선택은 당시 공개된 정보와 실제 합법 공격 후보로 판정한다. 다른 공격이 없거나 교체가 불가능한 경우의 무효 공격은 별도이며, 반복 무효는 시도한 공격이 실제 엔진에서 무효가 된 횟수다. 흡수로 회복·능력치 상승이 발생한 경우는 실제 무효 횟수에 포함되지 않지만 공개 정보 기반 선택 지표에는 포함된다. 복귀 횟수는 불필요함의 확정 판정이 아닌 단기 재교체 진단 지표다. 팀/지역/룰 반복이 연관되어 독립적인 3,240개 코스로 해석하지 않는다. 가격·육성치 조정은 이 실험에서 하지 않았다.\n`);
console.log(JSON.stringify({totalBattles,replays,reproducedBattles,cells:cells.map(({runs,...c})=>c),paired:paired.map(({byCase,byCategory,byTheme,...p})=>p)},null,2));
