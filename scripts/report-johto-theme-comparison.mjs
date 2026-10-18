import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const root=process.env.THEME_BALANCE_OUTPUT??'artifacts/experiments/balance/johto-expansion-20261018';
const read=name=>JSON.parse(readFileSync(`${root}/${name}`,'utf8'));
const before=read('before-report.json'),after=read('after-report.json');
const rows=phase=>readFileSync(`${root}/${phase}-battles.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
const oldRows=rows('before'),newRows=rows('after');
const themes={kanto:'관동 · 1세대',johto:'성도 · 2세대',hoenn:'호연 · 3세대',sinnoh:'신오 · 4세대',unova:'하나 · 5세대',kalos:'칼로스 · 6세대',alola:'알로라 · 7세대',galar:'가라르 · 8세대',paldea:'팔데아 · 9세대'};
const bands=['1-50','51-100'],pct=n=>`${(n*100).toFixed(2)}%`,pp=n=>`${n>=0?'+':''}${(n*100).toFixed(2)}%p`;
const at=(report,theme,band)=>report.byTheme.find(r=>r.theme===theme&&r.band===band);
const identity=r=>[r.theme,r.floor,r.kind,r.caseId,r.rule,r.n].join(':');
const lookup=new Map(newRows.filter(r=>r.theme==='johto').map(r=>[identity(r),r]));
assert.equal(before.total.errors+after.total.errors,0,'Resolve simulation errors before publishing results.');
assert.equal(after.byTheme.length,18);
const paired=oldRows.map(old=>{const current=lookup.get(identity(old));assert.ok(current);return {old,current};});
const expectedChanged=['bugsy','morty','chuck','jasmine','pryce','will','koga','bruno','karen'].map(id=>`named-${id}`).sort();
const actualChanged=[...new Set(paired.filter(p=>p.old.key!==p.current.key).map(p=>p.old.npcId))].sort();
assert.deepEqual(actualChanged,expectedChanged,'Only the nine expanded Johto NPCs should change.');
for(const group of after.byTheme){
 assert.equal(group.all.n,after.seeds*4*6*50);
 assert.equal(group.named.n,after.seeds*4*6*10);
 assert.equal(group.ordinary.n,after.seeds*4*6*40);
 assert.equal(group.all.wins+group.all.losses+group.all.draws,group.all.completed);
 assert.deepEqual(group.ordinary,at(after,'johto',group.band).ordinary,'Ordinary NPCs must be identical across themes.');
}
const switches=b=>{
 const pairs=paired.filter(p=>p.old.band===b&&p.old.kind!=='hidden');
 return {changedInput:pairs.filter(p=>p.old.key!==p.current.key).length,winToLoss:pairs.filter(p=>p.old.winner==='Player'&&p.current.winner==='Tower AI').length,lossToWin:pairs.filter(p=>p.old.winner==='Tower AI'&&p.current.winner==='Player').length};
};
const comparison=Object.keys(themes).flatMap(theme=>bands.map(band=>({theme,label:themes[theme],band,...at(after,theme,band)})));
const deltas=bands.map(band=>({band,before:at(before,'johto',band),after:at(after,'johto',band),...switches(band)}));
const otherAverages=bands.map(band=>({band,all:after.byTheme.filter(r=>r.band===band&&r.theme!=='johto').reduce((s,r)=>s+r.all.rate,0)/8,named:after.byTheme.filter(r=>r.band===band&&r.theme!=='johto').reduce((s,r)=>s+r.named.rate,0)/8}));
const npc=before.byNpc.map(old=>{const current=after.byNpc.find(r=>r.key===old.key);assert.ok(current);return {key:old.key,name:old.name,n:old.n,before:old.rate,after:current.rate,delta:current.rate-old.rate};});
const lines=[
 '# 성도 테마 확장 전후 승률 비교',
 '',
 '승률은 **플레이어 대리 AI의 단일 전투 승률**이다. 낮을수록 NPC가 강하다. 실제 사용자의 승률이나 50층/100층 연속 돌파 확률을 뜻하지 않는다.',
 '',
 '## 테마별 현재 승률',
 '',
 '| 테마 | 1–50층 전체 | 51–100층 전체 | 1–50층 네임드 | 51–100층 네임드 |',
 '|---|---:|---:|---:|---:|',
 ...Object.entries(themes).map(([theme,label])=>{const a=at(after,theme,bands[0]),b=at(after,theme,bands[1]);return `| ${label} | ${pct(a.all.rate)} | ${pct(b.all.rate)} | ${pct(a.named.rate)} | ${pct(b.named.rate)} |`;}),
 `| 성도 제외 8테마 평균 | ${pct(otherAverages[0].all)} | ${pct(otherAverages[1].all)} | ${pct(otherAverages[0].named)} | ${pct(otherAverages[1].named)} |`,
 '',
 '## 성도 변경 전후',
 '',
 '| 구간 | 전체 이전 → 현재 | 전체 변화 | 네임드 이전 → 현재 | 네임드 변화 |',
 '|---|---:|---:|---:|---:|',
 ...deltas.map(r=>`| ${r.band}층 | ${pct(r.before.all.rate)} → ${pct(r.after.all.rate)} | ${pp(r.after.all.rate-r.before.all.rate)} | ${pct(r.before.named.rate)} → ${pct(r.after.named.rate)} | ${pp(r.after.named.rate-r.before.named.rate)} |`),
 '',
 ...deltas.map(r=>`${r.band}층: 입력이 달라진 조건 ${r.changedInput}개, 플레이어 승→패 ${r.winToLoss}개, 패→승 ${r.lossToWin}개.`),
 '',
 '이번 표본에서 성도는 전반 9개 테마 중 플레이어 승률이 가장 낮고, 후반은 가라르 다음으로 낮다. 초반 네임드 강화 효과가 후반보다 크다. 일반 NPC 80%가 동일하므로 네임드 변화가 전체 평균에는 1/5 크기로 반영된다.',
 '',
 '개별 상대는 균일하게 강화되지 않았다. 후반 호일은 플레이어 승률 69.44% → 91.67%, 사도는 66.67% → 73.96%로 오히려 쉬워졌다. 이 결과는 다른 네임드 강화분을 일부 상쇄한다. 규리는 현재도 전반 92.71%, 후반 85.42%로 쉬운 편이다. 다음 검토에서는 후반 호일과 사도의 실제 선출/매치업, 규리의 승리 경로를 우선 확인할 근거가 된다. 개별 NPC 표본은 24~96조건으로 작아 이 순위를 확정적인 난이도 평가로 해석하지 않는다.',
 '',
 '## 성도 네임드별 승률',
 '',
 '| NPC | 구간 | 전투 수 | 이전 | 현재 | 변화 |',
 '|---|---|---:|---:|---:|---:|',
 ...npc.map(r=>`| ${r.name} | ${r.key.split(':')[1]}층 | ${r.n} | ${pct(r.before)} | ${pct(r.after)} | ${pp(r.delta)} |`),
 '',
 '## 성도 룰별 전체 승률',
 '',
 '| 룰 | 1–50층 이전 → 현재 | 51–100층 이전 → 현재 |',
 '|---|---:|---:|',
 ...['basic','mega','dynamax','tera','chaos','z'].map(rule=>`| ${rule} | ${bands.map(band=>{const old=before.byRule.find(r=>r.theme==='johto'&&r.band===band&&r.rule===rule),current=after.byRule.find(r=>r.theme==='johto'&&r.band===band&&r.rule===rule);return `${pct(old.rate)} → ${pct(current.rate)}`;}).join(' | ')} |`),
 '',
 '## 측정 조건과 해석 범위',
 '',
 '- 이전은 커밋 `7217f94e3dc6fd17ce7dd98aa820129c0acbe12b`의 런타임 템플릿(성도 9명 확장 직전)이다. 앞서 완료한 6종 파일럿과 v11 AI는 양쪽에 동일하게 적용했다. AI 개편 자체의 전후 효과는 측정하지 않았다.',
 `- ${after.seeds}개 고정 시드 × 4개 플레이어 팀 × 6개 룰 × 50개 층 = 테마·구간당 4,800조건이다. 그중 네임드 960조건, 일반 NPC 3,840조건이다. 룰은 동일 비중으로 집계했다.`,
 '- 1~100층을 각각 독립된 전투로 측정했다. 51층 이후는 두 번째 챕터의 셔플을 적용했다. 실제 게임은 챕터 사이에 테마가 바뀌므로 같은 테마로 100층을 연속 플레이한 결과가 아니다.',
 '- 현재 게임의 NPC 생성·육성·AI 등급·기믹 해금 경로를 사용했다. 플레이어 팀은 스타팅/공격/내구/전용기 중심 4종이며 층별 육성 상한을 적용했다. 회복약, 상점 성장, 누적 피해, 영입 선택은 반영하지 않았다.',
 '- 플레이어는 ZMovePolicy를 사용했다. 기본 소지품은 11층부터, 역할 성격은 55층부터 적용했다. 다이맥스밴드·테라스탈오브는 해당 룰에서 11층부터 지급하지만 플레이어 테라 티켓은 0장이다. 따라서 모든 실전 플레이어 빌드나 기믹 사용량을 대표하지 않는다.',
 '- 일반 NPC는 테마 공통 풀이다. 같은 팀·시드·룰·AI·장비 입력은 결과를 재사용했다. 표의 조건 수를 전부 독립 표본으로 간주하면 안 된다. 4개 경로 시드에 따른 결과이며 모집단 추정치나 유의성 검정은 제공하지 않는다.',
 '- 정규 50/100층은 챔피언이며, 선택형 히든 보스는 전체/네임드 표에서 제외했다. 히든 결과는 별도 JSON에 보존했다.',
 `- 오류 ${before.total.errors+after.total.errors}건. 현재 ${after.actualBattles}전, 이전 ${before.actualBattles}전을 추가 실행했고 동일 입력은 캐시를 공유했다.`,
 '- 캐시를 쓰지 않고 96전을 다시 실행해 승패·턴 수·시간 표시를 제외한 공개 전투 로그 해시가 모두 일치함을 확인했다.',
 '',
 '## 재현',
 '',
 '저장소 루트에서 PowerShell로 실행한다. HEAD가 이동한 뒤에도 같은 이전 상태를 쓰려면 보존한 before-runtime.json을 사용한다.',
 '',
 '```powershell',
 "$experiment = 'artifacts/experiments/balance/johto-expansion-20261018'",
 'New-Item -ItemType Directory -Force $experiment | Out-Null',
 "git show 7217f94e3dc6fd17ce7dd98aa820129c0acbe12b:src/data/normal-npc-templates.json | Set-Content -Encoding utf8 $experiment/before-runtime.json",
 'node --import tsx scripts/simulate-johto-theme-comparison.ts',
 '$env:NPC_BALANCE_BASELINE = "$experiment/before-runtime.json"',
 'node --import ./scripts/lib/npc-balance-baseline.mjs --import tsx scripts/simulate-johto-theme-comparison.ts --before',
 'Remove-Item Env:NPC_BALANCE_BASELINE',
 'node scripts/report-johto-theme-comparison.mjs',
 '```',
 '',
 '각 phase의 manifest에는 엔진 버전, 로드한 템플릿 해시, 주요 소스 해시와 실제 생성된 NPC 팀을 저장했다. 원시 결과는 before/after-battles.jsonl, 중복 제거 결과는 outcomes.jsonl, 기계 판독용 요약은 comparison.json 및 comparison.csv이다.',
 ];
writeFileSync(`${root}/REPORT.md`,lines.join('\n')+'\n');
writeFileSync(`${root}/comparison.json`,JSON.stringify({comparison,deltas,npc,otherAverages},null,2));
writeFileSync(`${root}/comparison.csv`,['theme,band,all_n,all_player_win_rate,named_n,named_player_win_rate',...comparison.map(r=>[r.theme,r.band,r.all.n,r.all.rate,r.named.n,r.named.rate].join(','))].join('\n')+'\n');
console.log(JSON.stringify({deltas:deltas.map(r=>({band:r.band,allBefore:r.before.all.rate,allAfter:r.after.all.rate,namedBefore:r.before.named.rate,namedAfter:r.after.named.rate,...switches(r.band)})),npc},null,2));
