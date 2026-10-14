import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,battleEvents} from '../src/battle/run';
import {allowsGimmick} from '../src/data/run-rules';

const id=process.argv[2]??'20261011',prefix=`artifacts/experiments/samples/room-sample-${id}`;
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8')),manifest=read(prefix+'-manifest.json');
for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256,f.path);
const courses=read(manifest.courseFile).courses;
async function* rows(path:string){for await(const line of createInterface({input:createReadStream(path),crlfDelay:Infinity}))if(line.trim())yield JSON.parse(line);}
const cells:any[]=[];let totalBattles=0,replays=0,reproducedBattles=0;
for(const mode of manifest.modes)for(const rule of manifest.rules){
 const report=read(`artifacts/experiments/balance/simulation-room-sample-${id}-${rule}-${mode}-balanced.json`);
 const oldReport=read(`artifacts/experiments/balance/simulation-opponent-learning-20261011-${rule}-v8-balanced.json`);
 for(const key of ['prices','sourceCourseHash','playerAI','opponentAI','format','behavior','composition','totalFloors'])assert.deepEqual(report[key],oldReport[key],key);
 assert.deepEqual(report.caseDefinitions,read(manifest.caseFiles[mode]));assert.equal(report.stages.length,1);
 const stage=report.stages[0];assert.equal(stage.stage,manifest.caseId);assert.equal(stage.climbs.length,18);
 const oldBattles:any[]=[];
 if(mode==='baseline'){
  assert.deepEqual(stage,oldReport.stages.find((s:any)=>s.stage===manifest.caseId));
  for await(const b of rows(`artifacts/experiments/ai/opponent-learning-20261011-${rule}-v8-battles.jsonl`))if(b.caseId===manifest.caseId)oldBattles.push(b);
 }
 const sequences=new Map<string,{n:number;wins:number;lost:boolean}>(),failures:Record<string,{uses:number;fails:number}>={};let battles=0,losses=0;
 for await(const b of rows(prefix+`-${rule}-${mode}-battles.jsonl`)){
  assert.equal(b.caseId,manifest.caseId);
  if(mode==='baseline'){const {phase,...value}=b,{phase:oldPhase,...old}=oldBattles[battles];assert.deepEqual(value,old);reproducedBattles++;}
  const seq=sequences.get(b.courseId)??{n:0,wins:0,lost:false};assert(!seq.lost);assert.equal(b.floor,seq.n+1);seq.n++;seq.wins+=Number(b.winner==='Player');seq.lost=b.winner!=='Player';sequences.set(b.courseId,seq);battles++;
  if(b.winner==='Player')continue;
  losses++;let attack='';
  for(const line of b.publicProtocol){const [,event,actor,move]=line.split('|');
   if(event==='turn')attack='';
   if(event==='move'){attack=actor==='p1a: Bronzong'?move:'';if(attack)(failures[attack]??={uses:0,fails:0}).uses++;}
   if(event==='-fail'&&actor==='p1a: Bronzong'&&attack)failures[attack].fails++;
  }
  const e=courses.find((c:any)=>c.id===b.courseId).encounters[b.floor-1];
  const queue=(side:'p1'|'p2')=>{const choices=b.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>{assert(n<choices.length);return choices[n++].action;}};};
  const replay=await runBattle({rule:b.rule,format:b.format,seed:b.seed,teams:{p1:Showdown.Teams.pack(b.playerTeam),p2:Showdown.Teams.pack(b.opponentTeam)},teraTickets:{p1:b.teraTicketsBefore,p2:allowsGimmick(b.rule,'terastallize')?e.enemyTeraTickets??1:0},battleItems:b.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
  assert.equal(replay.winner,b.winner);assert.equal(replay.turns,b.turns);assert.deepEqual(battleEvents(replay.publicProtocol),b.publicProtocol);assert.deepEqual(replay.decisions.map(d=>[d.side,d.action]),b.decisions.map((d:any)=>[d.side,d.action]));replays++;
 }
 if(mode==='baseline')assert.equal(battles,oldBattles.length);
 for(const c of stage.climbs){const seq=sequences.get(c.id)!;assert.equal(seq.wins,c.cleared);assert.equal(seq.n,c.cleared+(c.cleared<100?1:0));assert.equal(c.coins,c.earned-c.spent);}
 assert.equal(battles,stage.battles);totalBattles+=battles;
 cells.push({mode,rule,battles,losses,failures,runs:stage.climbs,passed50:stage.climbs.filter((c:any)=>c.cleared>=50).length,finished:stage.climbs.filter((c:any)=>c.cleared===100).length,averageCleared:stage.climbs.reduce((s:number,c:any)=>s+c.cleared,0)/18});
 console.log('Audited '+mode+' '+rule);
}
const aggregates=manifest.modes.map((mode:string)=>{const group=cells.filter(c=>c.mode===mode),runs=group.flatMap(c=>c.runs.map((r:any)=>({...r,rule:c.rule}))),baseline=cells.filter(c=>c.mode==='baseline').flatMap(c=>c.runs.map((r:any)=>({...r,rule:c.rule})));let higher=0,lower=0,same=0;
 for(const r of runs){const old=baseline.find(b=>b.id===r.id&&b.rule===r.rule)!;higher+=Number(r.cleared>old.cleared);lower+=Number(r.cleared<old.cleared);same+=Number(r.cleared===old.cleared);}
 return{mode,climbs:runs.length,passed50:group.reduce((s,c)=>s+c.passed50,0),finished:group.reduce((s,c)=>s+c.finished,0),averageCleared:runs.reduce((s:number,c:any)=>s+c.cleared,0)/runs.length,higher,lower,same};
});
const labels:Record<string,string>={baseline:'기존 배치',steel:'아이언롤러만 교체',psychic:'미래예지만 교체',both:'두 기술 교체'};
const table=aggregates.map((c:any)=>`| ${labels[c.mode]} | ${c.averageCleared.toFixed(2)} | ${c.passed50}/90 | ${c.finished}/90 | ${c.higher}/${c.lower}/${c.same} |`).join('\n');
const result={manifest:prefix+'-manifest.json',totalBattles,replays,reproducedBattles,cells,aggregates,notes:manifest.notes};
writeFileSync(prefix+'-audit.json',JSON.stringify(result,null,2),{flag:'wx'});
writeFileSync(prefix+'-report.md',`# 동탁군 트릭룸 샘플 기술배치 비교\n\n동탁군·데스니칸·어흥염 팀, 18코스 × 5룰 × 4배치 = 360등반. 총 ${totalBattles}배틀, 마지막 패배 ${replays}전의 공개 로그·행동·결과 재생 일치. 기존 배치 ${reproducedBattles}전 전체 기록과 90등반 결과는 앞선 v8 실험과 정확히 일치했다.\n\n기존: 트릭룸 / 아이언롤러 / 미래예지 / 지진. 강철 교체: 아이언헤드, 에스퍼 교체: 사념의박치기. 공격 투자·성격·특성·팀 구성·다른 기술·가격·적 AI는 유지했다. 17개 다른 샘플은 변경하지 않았다.\n\n| 배치 | 평균 성공 층 | 50층 통과 | 100층 완주 | 기존보다 상승/하락/동일 |\n|---|---:|---:|---:|---:|\n${table}\n\n아이언롤러는 필드가 없으면 실패하고, 미래예지는 예약 공격이 이미 있으면 다시 사용할 수 없다. 현재 샘플 생성과 플레이어 선택은 이런 조건을 충분히 처리하지 않는다. 이번에는 초기 기술배치만 바꾸어 비교했다. 이후 영입·구매는 승패에 따라 달라질 수 있다. 실패 기술 횟수는 마지막 패배 로그에서만 집계했으며 전체 배틀의 실패율이 아니다.\n\n검증에 사용했던 코스를 다시 사용한 국소 수정 실험으로, 독립된 새 홀드아웃이나 사람 승률이 아니다. 새로운 배치를 전체 게임 난이도로 일반화하지 않는다.\n`);
console.log(JSON.stringify({totalBattles,replays,reproducedBattles,aggregates},null,2));
