import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const dev=read('artifacts/observed-damage-dev-audit.json'),v=read('artifacts/observed-damage-validate-audit.json'),selection=read('artifacts/observed-damage-selection.json');
const get=(kind,rule,mode)=>v.aggregates.find(a=>a.kind===kind&&a.rule===rule&&a.mode===mode);
const names={basic:'기본',mega:'메진',dynamax:'다맥',tera:'테라',chaos:'개판'};
const battles=Object.entries(names).map(([r,n])=>{const a=get('battle',r,'v9'),b=get('battle',r,'observed'),p=v.comparisons.find(p=>p.rule===r);return `| ${n} | ${a.wins}/594 | ${b.wins}/594 | ${p.gained} / ${p.lost} | ${p.changedBattles} |`;}).join('\n');
const climbs=['basic','tera','chaos'].map(r=>{const a=get('climb',r,'v9'),b=get('climb',r,'observed');return `| ${names[r]} | ${a.averageCleared.toFixed(1)} / ${a.passed50}/54 / ${a.finished}/54 | ${b.averageCleared.toFixed(1)} / ${b.passed50}/54 / ${b.finished}/54 |`;}).join('\n');
const oldWins=v.aggregates.filter(a=>a.kind==='battle'&&a.mode==='v9').reduce((s,a)=>s+a.wins,0),newWins=v.aggregates.filter(a=>a.kind==='battle'&&a.mode==='observed').reduce((s,a)=>s+a.wins,0);
const document=`# 실제 피해를 기억하는 수집용 AI · 2026-10-10

동결된 수집용 플레이어 v9에 최근 직접 받은 피해를 이용하는 실험 버전을 추가했다. 기존 수집 정책과 게임 상대 v7, 실제 게임 밸런스는 유지했다. 머신러닝 가중치를 학습한 작업이 아니라, 배틀 안에서 공개 정보를 기억해 판단하는 규칙형 실험이다.

## 무엇을 기억하고 어떻게 사용하나

- 자기 팀의 HP와 상대가 공개적으로 사용한 기술을 읽는다. 직접 공격 피해를 같은 공격 동안 합산하여 연속 공격을 처리한다. 독/화상/날씨/반동/도구/능력 피해처럼 출처가 표시된 피해와 회복은 HP만 갱신하고 공격 피해 학습에서 제외한다. 지연 공격도 출처가 표시되면 제외된다.
- 급소가 난 공격 전체와 기절 때문에 실제 총 피해를 알 수 없는 공격은 제외한다. 혼합 연속 공격에서 나중에 급소/기절이 나오면 앞서 쌓은 그 공격의 기록도 제거한다.
- 기록은 같은 아군의 동일 방어 상태·도구·능력·폼·테라·최대 HP에만 적용한다. 다른 아군에게 40% 같은 수치를 그대로 복사하지 않는다. 방어 랭크가 바뀌어 스냅샷이 낡았을 때는 다음 자기 요청까지 해당 피해 기록을 보류한다.
- 벽을 받은 피해는 해당 공격 분류의 벽 효과로 정규화한다. 이후 벽이 생기거나 사라지면 현재 효과로 다시 계산한다. 고정 피해 기술은 벽 정규화를 하지 않는다. 모든 조건부 능력·위력 변화를 완전히 모델링하는 것은 아니므로 추정에는 한계가 있다.
- 상대가 교체/폼/테라/공격 랭크/상태를 바꾸면 기록을 초기화한다. 같은 종으로 돌아와도 이전 기록을 재사용하지 않는다. 기록은 최근3턴, 최대24개만 보관한다.
- 기본 예상 피해보다 관측 피해×1.1이 더 클 때만 예상치를 올린다. 약한 공격을 한 번 봤다고 기본 위험 추정을 낮추지 않는다. 교체·벽·랭크업·트릭룸의 기존 생존 판단이 이 보정된 예상 피해를 사용한다. 체력을 크게 잃었어도 합법 마무리 공격은 기존처럼 우선한다.

단위 테스트에서 빛의장막 아래 40%를 맞은 갸라도스가 다음 턴의 용의춤을 피하는 것을 확인했다. 벽이 있다는 이유로 그 피해가 낮다고 간주하지 않는다. 상대의 실제 능력치/비공개 기술/도구/선택 행동은 조회하지 않는다.

## 개발용 확인과 새 코스 검증

이미 결과를 본 이전 분리 실험의9코스를 개발용으로 명시했다. 6고정팀×9코스×11층×기본/테라/개판×2정책 = ${dev.battles.toLocaleString()}배틀. 개발 승수는 기존 ${selection.scores[0].wins}/1782, 관측형 ${selection.scores[1].wins}/1782이다. 이 작은 차이를 개선의 증명으로 삼지 않았다. 기준 v9의 전체 행동/공개 프로토콜은 이전 실험 기록과 다시 일치했다(시각 메타데이터 제외).

정책과 하네스를 고정한 뒤 이전 코스와 ID가 겹치지 않는 새 지역별9코스를 생성했다. 그 뒤 정책을 튜닝하지 않았다. 6고정팀×9코스×11층×5룰×2정책 = ${v.battles.toLocaleString()}배틀. 다음은 개별 배틀 승수이며 등반 성공률이 아니다. 완전 육성/고정 기술/벽 요원의 빛의점토/매 배틀 HP 회복 조건이다.

| 룰 | 기존 v9 | 관측형 후보 | 같은 상대에서 개선 / 악화 | 행동 경로가 다른 배틀 |
|---|---:|---:|---:|---:|
${battles}

합계 기존 ${oldWins}승, 관측형 ${newWins}승. 작은 코스 표본과 같은 시드를 공유하는 룰/팀/층을 모두 독립 표본으로 취급하지 않는다. 승수 합계가 같아도 개별 행동과 경로는 다를 수 있다. 같은 시드에서도 정책 변경 후 난수 소비/상대 선택이 달라지므로 한 행동만 승패의 원인으로 단정하지 않는다.

## 상점·영입 포함 등반

같은 새 코스에서 6출발팀×9코스×기본/테라/개판×2정책 = ${v.climbs}등반, ${v.climbBattles.toLocaleString()}배틀. 처음부터 빛의점토를 주지 않고 돈/상점/무료 리롤/비타민/기술머신/배틀 소모품/영입/역할 기반 파티와 기술 정비를 적용했다. 패배하면 종료한다.

각 칸: 평균 성공 층 / 50층 통과 / 100층 완주.

| 룰 | 기존 v9 | 관측형 후보 |
|---|---:|---:|
${climbs}

이전 등반 하네스의 층마다 회복/최대6마리 수집/자동 구매를 유지한다. 사람의 플레이나 모든 영구 도감 육성 지출을 재현하지 않는다. 독립 배틀과 등반이 같은 코스를 쓰므로 별도의 검증 표본은 아니다. 새로운 전투에서는 피해 기억을 초기화하고, 보존하는 것은 영입/도구/돈 등 기존 등반 상태다.

관측 기능을 구현했지만 이 작은 측정만으로 일반적인 승률 향상을 선언하거나 기본 수집 정책을 대체하지 않는다. 실험 버전과 데이터를 남겨 후속 비교에 사용한다. 실제 상대를 강화하지 않는다.

## 기록과 검사

개발용 ${dev.turnSamples.toLocaleString()}개, 검증용 ${v.turnSamples.toLocaleString()}개 행동 직전 기록을 저장했다. 두 정책 모두 같은 관측 기록기를 사용하므로 기존 정책의 입력 비교용 로그에도 관측 맥락이 있다. 기존 정책은 그것을 선택에 사용하지 않는다.

개발용 ${dev.adjustedDecisions.toLocaleString()}개, 새 코스 ${v.adjustedDecisions.toLocaleString()}개 결정에서 관측형 정책의 예상 피해 계산이 기본 추정보다 커졌다. 이는 보정이 사용된 결정 수이며 행동이 바뀌거나 승리를 구한 횟수와 다르다. diagnostics는 선택 후 계산 설명으로, 모델 입력에 넣지 않는다.

- 행동 직전 입력: observation/context. context.observedDamage에는 과거 자기 피해와 공개 기술/공격 분류/진입 번호만 들어 있다. 당시 자기 방어 상태의 서명도 포함한다.
- action/reason은 휴리스틱 선택 라벨, diagnostics는 선택 후 설명, outcome은 미래 결과다. 이들을 입력에 넣지 않는다. 재생 파일의 상대 전체 팀은 오프라인 재생 전용이다.
- 같은 courseId의 모든 팀/룰/층/정책은 같은 학습 또는 검증 그룹으로 둔다. 이전 개발용 v9를 다시 실행한 기록은 이전 데이터와 동일한 배틀이므로 새 독립 표본으로 세거나 중복 학습시키지 않는다. 이번 새 코스도 결과를 본 다음부터 후속 개발에 사용한 검증 자료가 된다.
- 새 테스트9개+관련 기존7개 및 TypeScript 검사 통과. 직접 피해/지속 피해/급소/기절/연속 공격/회복/벽 종료/고정 피해/상대 교체/상태/방어 변화/기록 만료/사적 입력 배제와 실제 배틀 재생을 검사했다.
- 전체 행동 순서·합법 선택·입력 범위·관측의 과거 시점·교체 제한·승패 합계·돈 수지·층 순서·실패 종료 감사 통과. 대표 ${dev.replays+v.replays}배틀에서 승패/턴/모든 행동이 재생과 일치했고 독립 배틀은 전체 공개 프로토콜도 일치했다(시각 제외). 관측으로 보정한 실제 사례도 재생 표본에 포함했다.

원본: artifacts/observed-damage-dev/validate-manifest.json, observed-damage-selection.json, observed-damage-dev/validate-audit.json 및 observed-damage-*-turns.jsonl / *-battles.jsonl. 등반은 observed-climb-*-battles.jsonl와 simulation-observed-climb-*-balanced.json에 저장했다.

실행: node scripts/run-observed-damage.mjs dev 또는 validate (--resume는 같은 해시의 완료 파일만 재사용). 이미 있는 검증 코스 파일을 재사용하며 결과 파일을 덮어쓸 수 있으니 새 실험은 새 경로에 원본을 보존한다. 감사: node node_modules/tsx/dist/cli.mjs scripts/audit-observed-damage.ts dev 또는 validate. 보고서: node scripts/write-observed-damage-report.mjs.
`;
writeFileSync('docs/OBSERVED_DAMAGE_AI.md',document);
const note=`최신 실제 피해 실험: v9에 자기 직접 피해 기억(최근3턴/동일 아군 방어 상태/벽 정규화) 추가, 상대 교체/공격 변화 시 초기화. 급소·기절·지속 피해 제외, 공개 정보만 사용. 개발3,564배틀→새9코스5,940배틀·324등반(${v.climbBattles.toLocaleString()}배틀) 재검증. 개별 새 배틀 기존${oldWins}승/관측형${newWins}승. 새 테스트9+기존7·타입검사·${dev.replays+v.replays}재생·전체 데이터 감사 통과. 기본 정책/게임 상대/난이도 유지, 모델 학습 없음. [측정과 입력 분리](OBSERVED_DAMAGE_AI.md).`;
for(const p of ['docs/STATUS.md','docs/SESSION_HANDOFF.md']){let s=readFileSync(p,'utf8');if(!s.includes(note)){const i=s.indexOf('\n');writeFileSync(p,s.slice(0,i+1)+'\n'+note+'\n'+s.slice(i+1));}}
writeFileSync('artifacts/observed-damage-dataset-catalog.json',JSON.stringify({schemaVersion:1,manifests:['observed-damage-dev-manifest.json','observed-damage-validate-manifest.json'],inputFields:['observation','context'],targetFields:['action','reason'],diagnosticFields:['diagnostics'],outcomeFields:['outcome'],groupField:'courseId',joinField:'battleKey',modelTrained:false,notes:'Dev baseline reproduces previous validation episodes; deduplicate if combining historical datasets. Validation courses generated after freezing candidate. Outcome and post-choice diagnostics are not model inputs.'},null,2));
console.log('Wrote observed damage report');
