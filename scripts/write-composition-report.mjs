import {readFileSync,writeFileSync} from 'node:fs';
const s=JSON.parse(readFileSync('artifacts/composition-simulation-summary.json','utf8'));
const replay=JSON.parse(readFileSync('artifacts/composition-replay-audit.json','utf8'));
const names={basic:'기본',mega:'메진',dynamax:'다맥',tera:'테라',chaos:'개판'};
const lines=['# 조합을 고려한 자동 영입과 재검증','',`2026-10-10 · 주 비교 4,140회 + 대조/보조 실험 45회 = **${s.climbs.toLocaleString()}회 등반 · ${s.battles.toLocaleString()}배틀 · ${s.decisions.toLocaleString()}개의 양측 행동 기록**. 머신러닝 학습과 게임 난이도 변경은 하지 않았다.`,
'','## 적용 범위와 구현','',
'실제 게임에서 플레이어가 직접 고르는 영입을 자동화하거나 상대 AI를 교체한 변경이 아니다. 자동 밸런스 테스트의 플레이어 판단을 개선했고, 기존 실시간 상대 AI와 저장된 리플레이는 v7을 유지한다. 새 판단은 `BALANCE_COMPOSITION=synergy`, 보조 행동은 `BALANCE_PLAYER=v8`로 선택하는 실험 기능이다.',
'','- 각 포켓몬의 실제 개체값·육성 포인트·성격·런 영양제 보너스와 갖고 있는 기술/특성을 평가한다.',
'- 공통 약점, 받아줄 수 있는 타입/특성, 공격 타입 범위, 물리·특수 분담을 팀 단위로 평가한다.',
'- 실제 벽 기술과 랭크업 동료, 트릭룸과 저속 공격수, 회복·피벗, 날씨와 관련 특성/타입을 고려한다. 벤치 전체가 아니라 선택한 세 마리의 효용을 비교한다.',
'- 영입 후보 세 종을 모두 비교해 현재 팀의 점수가 충분히 좋아질 때만 영입한다. 이미 소유한 종은 기존 육성 포인트와 더 높은 개체값을 보존한다. 6종 한도에서는 선택된 세 마리를 보존하고 대체 효용이 낮은 후보를 제거한다.',
'- 기술 수집/기술머신 교체가 보조 기술을 공격력만으로 밀어내지 않도록 하고, 실제 공격 기술도 유지한다. 벽 요원에게 빛의점토 구매를 허용한다.',
'- v8은 공개된 벽·트릭룸·날씨를 추적한다. 이미 깔린 효과를 반복하지 않고, 확실한 마무리 공격/전술 교체를 우선한다. 저속 동료가 사용할 수 있을 때 트릭룸, 상대의 공개 기술/타입·종족값으로 추정한 공격 분류에 맞는 벽을 시도한다.',
'','## 측정 설계','',
'23조건: 1~9세대 육성 스타터, 1·7·9세대 중간 육성, 혼합6팀, 벽/랭크업·트릭룸2팀, 전체 도감에서 고정 해시로 고른 혼합3팀. 무작위 혼합은 드래피온/견고라스/라티아스, 레디안/모단단게/이벨타르, 애프룡/솔록/독케일이다. 기존 미육성9세대 측정은 별도 `DIVERSE_TEAM_SIMULATION.md`에 있으며 이번 다섯 룰 비교에 미육성은 추가하지 않았다.',
'',
'기존 코스에서 지역별1개씩 9코스를 골라 다섯 룰·두 전략으로 비교했다. 새로 생성한 현행 라이브 9코스를 별도 재검증에 사용했다. 새 코스 결과를 보고 판단 기준을 재조정하지 않았다. 각 룰의 전략별 207등반은 9코스를 23조건으로 반복한 결과로 서로 독립인 207코스가 아니다. 지역을 동일하게 가중하며 실제 랜덤 테마 확률을 추정하는 실험도 아니다.',
'',
'두 전략 모두 같은 v8 실험 플레이어·v7 상대·공통 시드·룰·상점 가격/재고/무료 리롤 조건을 사용한다. 영입·파티·기술 판단과 그에 따른 구매/선봉 차이를 함께 비교한 것이며 영입 하나의 효과만 분리한 결과는 아니다. 상대의 미래 엔트리를 미리 보지 않는다. 매 배틀 회복과 10층 상점 구매를 가정하고 영구 성장 포인트의 정비 판단은 하지 않는다.',
'','## 같은 기존 코스에서 비교','', '| 룰 | 기존 평균층 | 새 평균층 | 기존 50층 | 새 50층 | 기존 100층 | 새 100층 |','|---|---:|---:|---:|---:|---:|---:|'];
for(const c of s.comparisons.filter(c=>c.cohort==='matched'))lines.push(`| ${names[c.rule]} | ${c.legacy.averageCleared.toFixed(1)} | ${c.synergy.averageCleared.toFixed(1)} | ${c.legacy.passed50}/207 | ${c.synergy.passed50}/207 | ${c.legacy.passed100}/207 | ${c.synergy.passed100}/207 |`);
lines.push('','## 새 코스 재검증','','| 룰 | 기존 평균층 | 새 평균층 | 기존 50층 | 새 50층 | 기존 100층 | 새 100층 |','|---|---:|---:|---:|---:|---:|---:|');
for(const c of s.comparisons.filter(c=>c.cohort==='new'))lines.push(`| ${names[c.rule]} | ${c.legacy.averageCleared.toFixed(1)} | ${c.synergy.averageCleared.toFixed(1)} | ${c.legacy.passed50}/207 | ${c.synergy.passed50}/207 | ${c.legacy.passed100}/207 | ${c.synergy.passed100}/207 |`);
lines.push('','## 보조 행동 효과와 한계','','같은 조합 평가를 사용하면서 플레이어 v7/v8을 바꿔 기본룰 기존9코스의 벽/트릭룸 팀을 따로 비교했다. 영입은 양쪽 모두 조합 전략이다. 아래 기술 횟수는 공개 프로토콜에서 실제로 시도한 횟수이며 성공 횟수라고 해석하지 않는다.','','| 팀 | 플레이어 | 평균층 | 50층 | 100층 | 보조 기술 시도 |','|---|---|---:|---:|---:|---|');
for(const p of s.supports)for(const c of p.cases)lines.push(`| ${c.id} | ${p.player} | ${c.averageCleared.toFixed(1)} | ${c.passed50}/9 | ${c.passed100}/9 | ${Object.entries(c.supportMoves).map(([m,n])=>m+': '+n).join(', ')||'0'} |`);
lines.push('','기존 기본룰의 드래피온/견고라스/라티아스 팀에서는 강철톤을 영입해 공유하던 얼음·드래곤·페어리 약점 문제를 줄인 기록이 있다. 종족값 최대 후보 하나를 고르는 대신 팀에서 무엇을 보완하는지 기록했다.',
'',
'이 휴리스틱의 점수 상승은 실제 승리를 보장하지 않는다. 특히 벽 팀의 초기 결과가 좋지 않아 벽 시도 타이밍, 선봉과 안전한 전개/교체를 더 개선해야 한다. 트릭룸도 상대의 실제 스피드를 읽지 않고 공개 종족값으로 추정한다. 날씨 후보 팀의 패리퍼는 기본 특성 날카로운눈이므로 완성된 비 파티로 주장하지 않는다. 지닌 도구의 잠재 메가 능력치, 모든 특성·상태 기술·상대 행동까지 모델링한 최적 팀 선택기는 아니다.',
'',
'결과는 이 자동 전략들의 비교이지 사람의 승률이 아니다. 모든 조합이 좋아진다는 결론이나 라이브 난이도를 바로 낮추는 근거로 쓰지 않는다. 신규 코스도 이번에 결과를 확인했으므로 향후 머신러닝 최종 평가에는 별도의 새 코스를 남겨둔다.',
'','## 저장과 검증','',
'`artifacts/composition-team-cases.json`은 조건, `composition-experiment-manifest.json`은 작업·코스/실험 코드 해시, `composition-simulation-summary.json`은 룰/팀/코스별 비교와 파일별 해시를 보관한다. 각 `simulation-composition-*-balanced.json`에는 구매·실패 층·최종 팀과 후보별 영입 점수/역할/보완한 약점 기록이 있다. 각 `composition-*-battles.jsonl`에는 실제 팀·육성 인코딩·시드·재화·소모품·승패·턴·행동 순서·보조 시도를 저장했다. 상대 테라권 재현에는 매니페스트의 원본 코스 메타데이터를 함께 사용한다.',
'',
`8개 새 조합/보조 검사와 기존 교체·배틀·룰20개 검사, TypeScript 검사가 통과했다. 모든 배틀 생성 중 금지 기믹 활성화를 검사했다. 통합 검사에서 코스 분리·동일 코스 짝·배틀 수·층 순서·승리 수·재화·조합 점수 하락 방지와 이전 v7 대조군의 완전 일치를 확인했다. JSONL에서 선택한 ${replay.checked}배틀은 원본 코스 메타데이터를 합쳐 승패·턴·행동 수를 다시 재현했다. 새 실제 트릭룸 배틀의 전체 공개 프로토콜 리플레이도 별도 테스트에서 통과했다.`,
'',
'실행: `node node_modules/tsx/dist/cli.mjs scripts/prepare-composition-cases.ts`, `node scripts/run-composition-simulation.mjs --resume`, `node scripts/summarize-composition-simulation.mjs`, `node node_modules/tsx/dist/cli.mjs scripts/audit-composition-replays.ts`, `node scripts/write-composition-report.mjs`. 기존 산출물 경로는 고정이며 새 실험은 별도 phase/코스 파일을 사용한다. 재개는 코드/조건/원본 코스 해시와 완료된 조건 수가 맞는 작업만 건너뛴다.',
'',
'머신러닝 학습은 아직 하지 않았다. 코스 단위 분리, 패배 후 미관측 층 처리, 당시 공개 관측 추가, 대안 행동 비교가 필요하다. 현재 행동은 정답이 아니라 각 휴리스틱의 선택이다. 상대 전체 팀 정보는 오프라인 분석용이며 공개되지 않은 기술/도구/능력치를 실제 AI 입력에 넣지 않는다.');
writeFileSync('docs/COMPOSITION_SIMULATION.md',lines.join('\n')+'\n');
const news=`최신 조합 실험: 자동 테스트의 영입·파티·기술 평가를 육성/약점/공격 범위/벽·트릭룸 역할 기반으로 개선. 23조건·5룰·기존/새 코스·두 전략, 주 비교4,140회와 대조45회, ${s.battles.toLocaleString()}배틀. 실험용 플레이어v8·실제 상대v7 유지, 모델 학습/게임 난이도 변경 없음. [조합 비교·재검증](COMPOSITION_SIMULATION.md).`;
for(const path of ['docs/STATUS.md','docs/SESSION_HANDOFF.md']){
 const text=readFileSync(path,'utf8').replace(/^최신 조합 실험:.*\n/gm,''),at=text.indexOf('\n');writeFileSync(path,text.slice(0,at+1)+'\n'+news+'\n'+text.slice(at+1));
}
console.log('Saved composition report and status');
