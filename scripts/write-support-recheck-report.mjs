import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const audit=read('artifacts/experiments/ai/support-recheck-audit.json'),diagnosis=read('artifacts/experiments/ai/support-decision-diagnosis.json');
const get=(kind,rule,mode)=>audit.aggregates.find(a=>a.kind===kind&&a.rule===rule&&a.mode===mode);
const modes=['v8','v9','v10'],rules={basic:'기본',mega:'메진',dynamax:'다맥',tera:'테라',chaos:'개판'};
const battles=Object.entries(rules).map(([r,n])=>`| ${n} | ${modes.map(m=>{const a=get('battle',r,m);return `${a.wins}/594 (${(a.rate*100).toFixed(1)}%)`;}).join(' | ')} |`).join('\n');
const climbs=['basic','tera','chaos'].map(r=>`| ${rules[r]} | ${modes.map(m=>{const a=get('climb',r,m);return `${a.averageCleared.toFixed(1)}층 / ${a.passed50}/54 / ${a.finished}/54`;}).join(' | ')} |`).join('\n');
const doc=`# 벽 판단의 실패 분석과 새 코스 재검증 · 2026-10-10

벽 설치→교체→랭크업 정책 v9의 승패가 이전 실험 v8과 갈린 사례를 비교하고, 더 보수적인 실험용 v10을 만들었다. 새로운 지역별9코스에서 독립 배틀과 상점/영입을 포함한 등반을 모두 비교했다. 실제 상대 AI·게임 밸런스·기존 v8/v9와 이전 데이터는 유지했다. 모델 학습은 하지 않았다.

## 실패 기록에서 확인한 것

이전 새 코스 기본룰에서 v9가 v8의 패배를 승리로 바꾼 경우10개, 반대로 승리를 패배로 바꾼 경우14개였다. 악화14개 중 벽 후 교체가 있었던 경우9개, 벽 중 랭크업이 있었던 경우10개, 트릭룸 사용이 있었던 경우4개였다. 이 항목들은 중복된다. 같은 시드라도 행동 변경 후 난수 소비와 상대 선택이 달라지므로 이 숫자만으로 원인을 단정하지 않았다. 비교 타임라인은 artifacts/experiments/ai/support-decision-diagnosis.json에 개선과 악화 모두 보존했다.

구체적인 문제:

- 리플렉터만 남아 있는데 특수공격 상대에게도 보호된 상태라고 분류해 랭크업하는 경우. 에브이 팀의 100층 픽시 상대에서 갸라도스와 핫삼이 연달아 랭크업 중 기절했다.
- 피해 추정이 중립 종족값+20/위력80 가정이라 육성된 상대나 강한 기술의 피해를 낮게 잡는 경우. 이 가정은 실제 상대의 숨은 세팅을 조회하는 대신 공개 정보만 사용하기 위한 근사치였다.
- 상대가 바뀌어 필요한 벽이 달라졌는데 이전 벽에 기대는 경우, 화상에 걸린 물리 공격 요원이 랭크업하는 경우, 행동 불가 상태인데 마무리 공격으로 분류하는 경우.
- 교체도 한 턴을 사용하므로 안전한 진입과 다음 행동까지의 생존을 함께 따져야 한다. 벽을 쓴 것이 곧 승리의 원인이라는 뜻은 아니다.

## v10 변경과 검증 방법

공개 종족값에 기반한 피해 추정을 더 크게 잡고, 혼합 공격 가능성을 고려했다. 벽이 예상되는 주요 피해를 줄일 때만 보호로 인정한다. 교체 피해와 다음 공격까지 두 번 버틸 여유, 남은 벽3턴, 랭크업의 생존 여유를 확인한다. 물리 화상 랭크업과 행동 불가 마무리 분류도 제한했다. 무조건 보수적으로 하는 것이 좋다는 가정은 아래 비교로 검증했다.

이전 기존/새 코스는 개발 데이터로 처리했다. 그들과 ID가 겹치지 않는 새9코스를 생성하고 실행 전 정책/팀/코스/하네스 해시를 고정했다. 재검증 결과를 본 뒤 v10을 추가 조정하지 않았다. 파일 artifacts/experiments/ai/support-recheck-manifest.json에 조건을 남겼다.

## 새 코스 독립 배틀

6완전육성 고정팀×9코스×11층×5룰×3정책 = ${audit.battles.toLocaleString()}배틀, ${audit.turnSamples.toLocaleString()}개 행동 직전 기록. 모두 같은 팀·기술·도구/빛의점토로 매번 체력을 회복한 조건이다. 아래는 개별 배틀 승률이며 등반 성공률이 아니다.

| 룰 | v8 | v9 | v10 후보 |
|---|---:|---:|---:|
${battles}

**v10 후보는 독립 배틀에서 v9보다 모든 룰의 승수가 줄었다.** 안전 조건을 과하게 잡으면 충분히 가능한 교체와 랭크업 기회도 놓친다. 따라서 v10을 기본 정책으로 승격하지 않는다. 공개 보호 종류를 구분하는 수정과 강한 생존 제한을 한꺼번에 바꿨기 때문에 각각의 효과는 분리 실험이 필요하다.

## 상점·영입을 포함한 등반

6출발팀×9코스×기본/테라/개판×3정책 = ${audit.climbs}등반, ${audit.climbBattles.toLocaleString()}배틀. 같은 새 코스를 사용했으므로 앞의 독립 배틀과 별도의 검증 코스는 아니다. 새 플레이어 정책을 기존 조합/영입/상점 시뮬레이터에 연결했다. 처음부터 빛의점토를 지급하지 않고 상점에서 구매하며, 돈·리롤·비타민·배틀 소모품·기술머신·영입/파티 재선택을 적용한다. 패배하면 그 등반은 종료한다.

각 칸: 평균 성공 층 / 50층 통과 / 100층 완주. 조건당54등반.

| 룰 | v8 | v9 | v10 후보 |
|---|---:|---:|---:|
${climbs}

이 측정도 사람 플레이나 게임 UI를 자동 조작한 결과는 아니다. 이전 시뮬레이터의 층마다 회복, 자동 구매, 최대6마리 영입, 역할 기반 파티 선택과 기술 정비를 사용했다. 실제 플레이어의 판단/누적 부상이나 모든 영구 도감 육성 지출을 재현하지 않는다. 등반 중 영입과 기술 정비로 벽 요원이 파티에서 빠질 수도 있으므로 독립 배틀의 벽 사용 횟수와 직접 비교할 수 없다. 표본이 지역별1코스로 작아 작은 차이를 전체 난이도의 변화로 해석하지 않는다.

## 저장과 검사

- 새 행동/공개 상태/결과 데이터: artifacts/experiments/ai/support-recheck-new-*-turns.jsonl 및 재생용 *-battles.jsonl.
- 등반 데이터: artifacts/experiments/ai/support-climb-*-battles.jsonl 및 simulation-support-climb-*-balanced.json. 기존 입력/결과 분리 규칙을 유지하며 상대 전체 팀은 재생 전용이다.
- 관련 테스트35개와 TypeScript 검사 통과. 새 코스 중복/파일 해시/선택 순서/합법 행동/결과 합계/교체 제한, 등반 돈 수지·층 순서·패배 종료를 감사했다.
- ${audit.replays}개 대표 배틀을 재생해 승패·턴·모든 행동이 일치했다. 독립 배틀은 전체 공개 프로토콜도 일치했다(시각 메타데이터 제외). 등반 JSONL은 전체 프로토콜을 저장하지 않으므로 그 검사를 주장하지 않는다.
- 실행: node scripts/run-support-recheck.mjs. 재실행은 새 실험 파일을 덮어쓰므로 필요한 원본을 먼저 보존한다. 감사: node node_modules/tsx/dist/cli.mjs scripts/audit-support-recheck.ts. 보고서: node scripts/write-support-recheck-report.mjs.

다음 실험은 벽 종류 구분만 적용한 버전, 교체 제한만 바꾼 버전, 랭크업 생존 조건만 바꾼 버전을 나눠 비교하는 것이다. 지금 결과에서는 벽 활용을 없애거나 상대에게 확대할 근거가 없다. 기존 v9와 새 후보의 성공/실패 데이터를 모두 유지한다.
`;
writeFileSync('artifacts/experiments/ai/SUPPORT_RECHECK.md',doc);
// Current docs are maintained separately; a simulation writes only its report.

console.log('Wrote support recheck report');
