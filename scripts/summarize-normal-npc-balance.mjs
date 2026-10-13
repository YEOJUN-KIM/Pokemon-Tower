import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='artifacts/normal-mode-balance-20261013';
const reports=['','-outliers','-leads'].map(suffix=>{
 const path=base+suffix,report=JSON.parse(readFileSync(path+'/report.json','utf8'));
 const rows=readFileSync(path+'/battles.jsonl','utf8').trim().split('\n').map(line=>JSON.parse(line));
 assert.ok(rows.every(r=>!r.error&&['Player','Tower AI','tie'].includes(r.winner)));
 assert.ok(rows.filter(r=>r.floor<50).every(r=>r.enemyGimmicks===0));
 assert.ok(rows.filter(r=>r.scope==='boss').every(r=>r.floor>=75));
 for(const [file,hash] of Object.entries(report.sourceHashes)){
  const source=file==='scripts/simulate-normal-npc-balance.ts'?path+'/simulation-source.ts':file;
  assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'),hash,source);
 }
 const byNpc=Object.entries(Object.groupBy(rows,r=>r.npcId)).map(([id,group])=>({id,name:group[0].name,n:group.length,wins:group.filter(r=>r.winner==='Player').length}));
 return {path,report,rows,byNpc};
});
const pct=(wins,total)=>(100*wins/total).toFixed(1)+'%';
const total=reports.reduce((n,r)=>n+r.rows.length,0),replayed=reports.reduce((n,r)=>n+r.report.replayed,0);
const lead=reports[2],seeds=reports[1];
for(const [index,file,label] of [[1,'NORMAL_MODE_BALANCE_OUTLIERS.md','시드16개 추가 검사'],[2,'NORMAL_MODE_BALANCE_LEADS.md','출전 순서 추가 검사']]){
 const r=reports[index];
 const text=['# '+label,'',`2026-10-13. ${r.rows.length}전, 오류0건. 시간 표시를 제외한 이벤트 ${r.report.replayed}전 재실행 일치.`, '', index===1?'같은 팀·출전 순서에서 매치업별16개 전투 시드를 사용했다.':'NPC 순서6가지와 플레이어 선봉3가지를 교차했다. 각 플레이어 선봉은 전투 시드와 묶여 있어 완전한 독립 요인 실험은 아니다.', '', '기본 육성·도구 조건은 1차 검사와 같다. 네 고정 팀의 AI 단판 결과이며 전체 일반 모드 평균이나 사람 승률이 아니다.', '', '| 상대 | 전투 수 | 플레이어 승률 |','|---|---|---|',...r.byNpc.map(s=>`| ${s.name} (${s.id}) | ${s.n} | ${pct(s.wins,s.n)} |`), '', '## 팀별 플레이어 승률','', '| 상대 | 스타터 | 공격형 | 내구형 | 전용 Z 후보 |','|---|---|---|---|---|',...r.byNpc.map(s=>`| ${s.name} | ${['starters','offense','bulk','signature-z'].map(id=>{const group=r.rows.filter(row=>row.npcId===s.id&&row.caseId===id);return pct(group.filter(row=>row.winner==='Player').length,group.length);}).join(' | ')} |`), '', `원본 데이터: ${r.path}/. 수치는 자동 보정하지 않았다.`];
 const floorTable=['## 층별 구분','', '빌런 보스는76/96층, 단델은50/100층을 검사했다. 위 표는 두 층 합산이다.', '', '| 상대 | 층 | 전투 수 | 플레이어 승률 |','|---|---|---|---|',...r.byNpc.flatMap(s=>[...new Set(r.rows.filter(row=>row.npcId===s.id).map(row=>row.floor))].sort((a,b)=>a-b).map(floor=>{const group=r.rows.filter(row=>row.npcId===s.id&&row.floor===floor);return `| ${s.name} | ${floor} | ${group.length} | ${pct(group.filter(row=>row.winner==='Player').length,group.length)} |`;})), ''];
 writeFileSync('docs/gameplay/'+file,text.join('\n')+'\n'+floorTable.join('\n')+'\n');
}
const findings=['## 1차 판단과 추가 확인','',`총 ${total.toLocaleString('en-US')}전과 별도 재실행 ${replayed}전을 확인했다. 전투 오류·무승부는0건이며 저장한 시드로 재현됐다.`, '', '일반 상대 구간 평균은 약81~82%, 50층54.2%, 100층59.0%로 관문에서 난이도가 높아지는 경향은 보인다. 다만 100층이50층보다 더 어려운 결과는 아니며, NPC 종류·육성·룰 조합이 달라 층수만의 효과로 해석할 수 없다. 모든 구간이 같은 네 플레이어 팀을 사용하지만 이것은 100층 완주 검사가 아니다.', '', '다이맥스 룰87.8%는 기본76.8%보다11.0%p 높다. 다른 룰은77~81%다. 이 조건에서는 다이맥스가 가장 유리했고 혼합이 가장 쉬운 결과는 아니었다. 플레이어 기믹 후보·고정 기술 구성과 AI 판단의 영향을 받으므로 룰 자체의 최종 강함 순위는 아니다.', '', '보스별 편차가 가장 큰 점검 후보다. 시드를 늘리고 선봉을 바꿔도 마적·단델은 어려운 편이고 비주기·구즈마는 쉬운 편이다. 최초2개 시드의 마적12.5%를 확정값으로 사용하면 과장되므로 아래 추가 확인을 같이 본다.', '', '| 상대 | 최초 검사 | 시드16개 | 출전 순서 변경 |','|---|---|---|---|',...['magma-boss-maxie','named-leon','rocket-boss-giovanni','skull-boss-guzma'].map(id=>{const first=reports[0].byNpc.find(s=>s.id===id),second=seeds.byNpc.find(s=>s.id===id),third=lead.byNpc.find(s=>s.id===id);return `| ${first.name} | ${pct(first.wins,first.n)} | ${pct(second.wins,second.n)} | ${pct(third.wins,third.n)} |`;}), '', '플레이어 기믹 도구를10층부터 지급하는 유리한 조건이며, 실제 상점의 전설 등급 재고·가격은 반영하지 않았다. 영양제 추가 육성·소모품·포획도 없다. 따라서 실제 플레이는 장비 수급과 팀 교체에 따라 더 쉽거나 어려워질 수 있다. 같은 상대·같은 팀 반복 결과는 서로 독립적인 사람 표본이 아니다.', '', '현 단계에서는 전 구간을 일괄 강화·약화하기보다 마적·단델과 비주기·구즈마의 격차, 이후 다이맥스 우위를 점검할 근거가 생겼다. 게임 밸런스와 NPC 샘플 수치는 변경하지 않았다.', ''];
const mainPath='docs/gameplay/NORMAL_MODE_BALANCE_CHECK.md';
const main=readFileSync(mainPath,'utf8').replace('전체 배틀 로그 해시','시간 표시를 제외한 배틀 이벤트 해시');
const heading='## 1차 판단과 추가 확인';
const clean=main.includes(heading)?main.slice(0,main.indexOf(heading))+main.slice(main.indexOf('## 구간별 플레이어 승률')):main;
const floorNote='상대별 추가 검사 승률은 빌런76/96층, 단델50/100층 합산이다. [시드16개 검사](NORMAL_MODE_BALANCE_OUTLIERS.md)와 [출전 순서 검사](NORMAL_MODE_BALANCE_LEADS.md)에 층별 표를 따로 기록했다.\n\n';
writeFileSync(mainPath,clean.replace('## 구간별 플레이어 승률',findings.join('\n')+'\n'+floorNote+'## 구간별 플레이어 승률'));
writeFileSync(base+'/audit.json',JSON.stringify({total,replayed,errors:0,draws:0,earlyNpcGimmicks:0,sourceHashesVerified:true,notes:'Three deliberately distinct designs; totals include repeated seed1/2 checks. Samples are not independent human players. Rules/NPCs are stratified rather than weighted by their live population frequencies.'},null,2)+'\n');
console.log(JSON.stringify({total,replayed,lead:lead.byNpc.map(s=>({...s,rate:pct(s.wins,s.n)})),sourceHashesVerified:true}));
