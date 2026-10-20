import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import design from './data/npc/alola-design.json' with {type:'json'};
import {normalNpcTemplate} from '../src/server/npc-templates';

const root='artifacts/experiments/balance/hau-guzma-20261019';
type Row={id:string;floor:number;case:string;seed:number;winner:string;turns:number;telemetry:any};
const phases=['before','after','after-mega','restored-v12','regression-before','regression-after','rank-reference','trial-life-orb','trial-assault-vest'];
const records=Object.fromEntries(phases.map(p=>[p,readFileSync(`${root}/${p}.jsonl`,'utf8').trim().split('\n').map(s=>JSON.parse(s) as Row)]));
const round=(n:number)=>Math.round(n*10000)/10000;
function summarize(rows:Row[]){
 const n=rows.length,wins=rows.filter(r=>r.winner==='Tower AI').length,p=wins/n,z=1.96,mid=(p+z*z/(2*n))/(1+z*z/n),half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/(1+z*z/n);
 const pokemon:Record<string,any>={},entry:Record<string,number>={};
 let turns=0,kos=0,remaining=0,zEquipped=0,zLegal=0,zLegalTurns=0,zUsed=0,zKOs=0;
 const improvements=[],winningImprovements=[];
 for(const r of rows){
  const t=r.telemetry;turns+=r.turns;kos+=3-t.remainingPlayer;remaining+=t.remainingNpc;
  for(const [species,v]of Object.entries(t.pokemon) as [string,any][]){
   const a=pokemon[species]??={battlesSelected:0,battlesAppeared:0,entries:0,activeTurns:0,directKOs:0,residualKOs:0,moves:{}};a.battlesSelected++;if(v.entries)a.battlesAppeared++;for(const k of ['entries','activeTurns','directKOs','residualKOs'])a[k]+=v[k];for(const [m,c]of Object.entries(v.moves))a.moves[m]=(a.moves[m]??0)+c;
  }
  for(const [k,v]of Object.entries(t.entry) as [string,number][])entry[k]=(entry[k]??0)+v;
  zEquipped+=Number(t.z.equipped);zLegal+=Number(t.z.legal);zLegalTurns+=t.z.legalTurns.length;zUsed+=t.z.used;zKOs+=t.z.directKOs;
  for(const s of t.switches)if(!s.forced&&s.afterThreat<s.beforeThreat&&improvements.length<5)improvements.push({case:r.case,seed:r.seed,floor:r.floor,winner:r.winner,...s});
  for(const s of t.switches)if(!s.forced&&s.afterThreat<s.beforeThreat&&r.winner==='Tower AI'&&winningImprovements.length<5)winningImprovements.push({case:r.case,seed:r.seed,floor:r.floor,...s});
 }
 for(const v of Object.values(pokemon)){v.meanActiveTurnsPerSelectedBattle=round(v.activeTurns/v.battlesSelected);v.meanActiveTurnsPerAppearedBattle=v.battlesAppeared?round(v.activeTurns/v.battlesAppeared):0;v.meanDirectKOsPerSelectedBattle=round(v.directKOs/v.battlesSelected);}
 return {battles:n,npcWins:wins,npcWinRate:round(p),wilson95:[round(mid-half),round(mid+half)],meanTurns:round(turns/n),meanPlayerKOs:round(kos/n),meanNpcRemaining:round(remaining/n),pokemon,z:{equippedBattles:zEquipped,legalBattles:zLegal,legalDecisionTurns:zLegalTurns,uses:zUsed,directKOs:zKOs},entry,battlesWithCompleteEntryChain:rows.filter(r=>r.telemetry.entry.completeEntryChains>0).length,switchTypeRiskReductionExamples:improvements,winningTypeRiskReductionExamples:winningImprovements};
}
const byId=(rows:Row[])=>Object.fromEntries([...new Set(rows.map(r=>r.id))].map(id=>[id,summarize(rows.filter(r=>r.id===id))]));
const totals=Object.fromEntries(phases.map(phase=>[phase,byId(records[phase])]));
const breakdown=Object.fromEntries(['before','after','after-mega'].map(phase=>[phase,Object.fromEntries([...new Set(records[phase].map(r=>r.id))].map(id=>{const rows=records[phase].filter(r=>r.id===id);return [id,{floors:Object.fromEntries([...new Set(rows.map(r=>r.floor))].map(f=>[f,summarize(rows.filter(r=>r.floor===f))])),cases:Object.fromEntries([...new Set(rows.map(r=>r.case))].map(c=>[c,summarize(rows.filter(r=>r.case===c))]))}];}))]));
const pairedRegression=Object.fromEntries(Object.keys(totals['regression-before']).map(id=>{
 const before=records['regression-before'].filter(r=>r.id===id),after=records['regression-after'].filter(r=>r.id===id);
 return [id,{battles:before.length,changedOutcomes:before.filter((b,i)=>b.winner!==after[i].winner).length,changedTelemetry:before.filter((b,i)=>JSON.stringify(b.telemetry)!==JSON.stringify(after[i].telemetry)).length}];
}));
const report={
 baselineCommit:'7f2be76aecfdc4b92911a774cd8d9b29912e6ef8',date:'2026-10-19',scope:['Hau fixed three','Guzma Golisopod set and expert ceiling','small common v13 conditional/priority/pivot wrapper'],
 interpretation:'NPC win fractions in this paired deterministic benchmark, not any player\'s personal loss probability. IV/training curve is unchanged. Floor 45/50 and 95/100 are different difficulty strata; short rank references have only four seeds per case. Ordinary player has no items; no universal rank order can be inferred.',
 method:{mainBattlesPerNpcPerPhase:384,seedsPerCase:16,playerCases:12,hauFloors:[50,100],guzmaFloors:[45,95],rule:'basic',npcGimmicks:'existing floor gates independent of player rule; Hau Z from 50',player:'DamagePolicy; full-health independent battles, 31 IVs, 66 training points, curated defaults, Adamant/Modest, no held items',seedKey:'hau-guzma:${case}:${seed}',regressionBattlesPerProtectedNpcPerPhase:96,rankReferenceBattlesPerNpc:96,telemetry:{activeTurns:'unique public turns during each species field presence, summed across entries; not wall time and may overlap on a pivot turn',firstImpressionAvailable:'requests on first action of a new entry with base First Impression in legal actions',completeEntryChains:'actual First Impression → Emergency Exit → field return → actual First Impression; each return counted once',switchLoop:'voluntary A→B followed by B→A within two turns; forced replacements and U-turn receivers excluded',typeRisk:'largest type multiplier among public foe STAB types, not a claim about an unrevealed actual move',zLegal:'battle/decision-turn availability on the request; not every equipped carrier survives to act'}},
 finalSets:Object.fromEntries(['named-hau','named-guzma'].map(id=>[id,{trainer:design.trainers.find(t=>t.id===id),template:normalNpcTemplate(id,95,id==='named-hau'?'champion':'villain')}])),
 totals,breakdown,pairedRegression,matchedRankGuzma:summarize(records['after-mega'].filter(r=>r.id==='named-guzma'&&r.seed<=4)),
 evidence:{raw:root,files:Object.fromEntries(phases.map(p=>[p,{manifest:JSON.parse(readFileSync(`${root}/${p}-manifest.json`,'utf8')),jsonlSHA256:createHash('sha256').update(readFileSync(`${root}/${p}.jsonl`)).digest('hex')}])),examples:['after-hau-z-example.json','after-guzma-exit-return-example.json','after-mega-guzma-mega-example.json'].map(name=>({name,...JSON.parse(readFileSync(`${root}/${name}`,'utf8'))}))},
 decisions:{hau:'유지 가능',guzma:'목표 난이도 달성 (검증 표본의 캡틴 상위~사천왕권)',item:'Final Golisopite per user follow-up. Ordinary Sitrus control beats Life Orb/Assault Vest in total wins but remains below the intended band; the Mega trial improves total wins. Mega is gated by the existing floor rule and removes Emergency Exit after transformation.',rank:'Relative benchmark placement, not a strict ordering against every captain/Elite or player team; confidence intervals and floor breakdowns are included.',causality:'Before/ordinary combines roster/set/AI changes. Restored-v12 ablation holds the ordinary Guzma data and expert tier fixed. Final Mega adds the stone/ability/form and preserves the ordinary entry-loop evidence separately.',preservation:'224 other reviewed/runtime rows are checked directly against the requested commit, alongside all other Alola metadata, shared builds and the three existing trainer overrides. Historical preservation fixtures remain unchanged; their explicitly authorized Hau/Guzma rows are reconstructed for old checks, and their AI checksum checks the frozen v12 archive. New format opts in to Mega Golisopod without changing saved old formats.'},
 validation:{unitTests:1031,unitFailures:0,selectedBrowserTests:15,browserFailures:0,typecheck:'passed',productionBuild:'passed',runtimeProjectionRows:226,logs:root},
};
mkdirSync('artifacts/reports/npc',{recursive:true});writeFileSync('artifacts/reports/npc/hau-guzma-audit.json',JSON.stringify(report,null,2)+'\n');
const pct=(n:number)=>(n*100).toFixed(1)+'%',final=totals['after-mega'],ordinary=totals.after;
const setsTable=(id:string)=>normalNpcTemplate(id,95,id==='named-hau'?'champion':'villain')!.team.map(p=>`|${p.species}|${p.profile.ability}${p.item==='Golisopite'?' → Tough Claws (Mega)':''}|${p.item}|${p.profile.nature}|${Object.values(p.profile.evs).join('/')}|${p.profile.moves.join(' / ')}|`).join('\n');
const statsTable=(id:string)=>Object.entries(final[id].pokemon).map(([name,p])=>`|${name}|${p.battlesSelected}/${p.battlesAppeared}|${p.entries}|${p.directKOs}|${p.meanActiveTurnsPerSelectedBattle.toFixed(2)} / ${p.meanActiveTurnsPerAppearedBattle.toFixed(2)}|${Object.entries(p.moves).map(([m,n])=>`${m} ${n}`).join(' / ')}|`).join('\n');
const mainTable=['named-hau','named-guzma'].flatMap(id=>['before','after','after-mega'].map(phase=>{const v=totals[phase][id];return `|${id}|${phase}|${v.npcWins}/${v.battles} (${pct(v.npcWinRate)})|${v.meanTurns.toFixed(2)}|${v.meanPlayerKOs.toFixed(2)}|${v.meanNpcRemaining.toFixed(2)}|`;})).join('\n');
const floors=['named-hau','named-guzma'].flatMap(id=>Object.entries(breakdown['after-mega'][id].floors).map(([floor,v])=>`|${id}|${floor}|${v.npcWins}/${v.battles}|${pct(v.npcWinRate)}|`)).join('\n');
const names:Record<string,string>={'named-olivia':'라이치','named-kahili':'카일리','named-kiawe':'키아웨','named-ilima':'일리마','named-lana':'수련','named-mina':'말리화','named-nanu':'나누','named-hala':'할라','named-molayne':'몰레인'};
const ranks=Object.entries({...totals['rank-reference'],...totals['regression-after']}).map(([id,v])=>`|${names[id]}|${v.npcWins}/${v.battles}|${pct(v.npcWinRate)}|`).join('\n');
const e=final['named-guzma'].entry,c=ordinary['named-guzma'].entry;
const entryRows=[['등장 합계','golisopodEntries'],['최초 출전 전투','firstAppearances'],['재등장','reappearances'],['첫 행동 만나자마자 가능 요청','firstImpressionAvailable'],['만나자마자 선택/실사용','firstImpressionUsed'],['만나자마자 불법 선택','firstImpressionInvalid'],['만나자마자 실패','firstImpressionFailed'],['만나자마자 직접 KO','firstImpressionKOs'],['아쿠아제트 실사용','aquaJetUsed'],['비상탈출 발동','emergencyExit'],['비상탈출 후 재등장','exitReturns'],['모든 재등장 후 만나자마자','firstImpressionAfterReturn'],['비상탈출 재등장 후 만나자마자','firstImpressionAfterExitReturn'],['완전한 FI→EE→재등장→FI 연쇄','completeEntryChains'],['메가진화','golisopodMegaActivations'],['자발 교체','voluntarySwitches'],['강제 교체/피벗 수신 선택','forcedSwitches'],['2턴 내 자발 왕복 루프','switchLoops']].map(([label,key])=>`|${label}|${c[key]??0}|${e[key]??0}|`).join('\n');
const regression=Object.entries(pairedRegression).map(([id,v])=>`|${names[id]}|${totals['regression-before'][id].npcWins}/96 → ${totals['regression-after'][id].npcWins}/96|${v.changedOutcomes}|${v.changedTelemetry}|`).join('\n');
const examples=final['named-guzma'].winningTypeRiskReductionExamples.map(v=>`- ${v.floor}층 ${v.case}, seed ${v.seed}, ${v.turn}턴: ${v.from} → ${v.to}, 공개 타입 위험 ${v.beforeThreat}배 → ${v.afterThreat}배. 해당 전투 구즈마 승리.`).join('\n');
writeFileSync('artifacts/reports/npc/hau-guzma-npc-ai.md',`# 하우·구즈마 / 선공기 AI 검증

2026-10-19. 기준 커밋: \`7f2be76aecfdc4b92911a774cd8d9b29912e6ef8\`.
후속 지시인 “너무 낮으면 메가갑주무사”까지 반영한 최종 결과다. 하우 **유지 가능**, 구즈마 **목표 난이도 달성: 표본상 캡틴 상위~사천왕권**으로 판단한다. 모든 상대 조합에서 순서를 보장한다는 뜻은 아니다.

## 변경 범위와 저장 호환

하우의 기존 레거시 슬롯을 검토된 고정 3마리 슬롯으로 교체했다. 중복 하우를 추가하지 않았고 쿠쿠이는 그대로 존재한다. 알로라 루트는 쿠쿠이 챔피언 → 하우 최종 상대를 유지한다. 하우의 2개 단계 행이 allFloors 1행이 되어 전체 런타임은 227→226행, 알로라는 20명/21행이다. 빌런 연속 이벤트 연결은 보류 상태 그대로다.

라이치·카일리·키아웨를 포함한 **나머지 224개 현재 NPC 행**은 검토 원본과 런타임 각각 기준 커밋의 내용 해시와 일치한다. 다른 알로라 메타데이터, 공용 세트, 기존 3명 전용 override도 동일하다. 구즈마는 갑주무사 세트·대표 기믹·Expert 상한만 변경했다. 나머지 벌레 후보 4마리는 완전히 동일하다.

새 전투만 tower-policy-v13을 사용한다. v12는 npc-policy-v12.ts에 바이트 단위로 보존했다. 기존 보존 fixture는 갱신하지 않았다. 과거 테스트에서는 이번에 허용된 두 정체성만 실제 작업 전 행으로 복원해 기존 체크섬을 검사하고, 새 보존 테스트는 두 명을 제외한 현재 224행 전체를 직접 검사한다.

메가갑주무사는 기존 엔진에 형태·도구·종족값이 있지만 특성이 과거 임시값이다. [Showdown 고정 커밋 정의](https://github.com/smogon/pokemon-showdown/blob/490b7fb8c2e5e548df9b752f93a589a2a42ce398/data/pokedex.ts#L14530)에 맞춰 **새 포맷에서만 전투별 Dex를 복제해 Tough Claws로 보정**했다. 전역 Dex와 이전 포맷은 바꾸지 않는다. 이전 Dragonite 포맷도 supportedFormats에 남겨 실제 v12 저장 복구를 검증했다. 종족값을 임의로 높이지 않았다. 타워에서 후기 메가폼을 사용하는 각색이며 원작 7세대 구즈마의 공식 파티라는 뜻은 아니다.

## 최종 세트

훈련 열은 HP/공/방/특공/특방/속 순서의 프로젝트 포인트다. 원본 IV는 31, 하우 총 66점, 구즈마 총 54점이며 실제 전투는 기존 층별 IV/포인트 곡선을 적용한다.

### 하우

**Noivern → Primarina → Raichu-Alola**. allFloors=true, select=true, required 3명 전부, preferredLead=Noivern, preferredLast=Raichu-Alola. 전투 중 합리적인 교체와 유턴 수신 선택은 허용한다. Champion / Expert / speed.

|포켓몬|특성|도구|성격|훈련 포인트|4기술|
|---|---|---|---|---|---|
${setsTable('named-hau')}

누리레느는 4공격기로 돌격조끼와 충돌하지 않는다. 라이츄는 일렉트릭필드를 전제로 하지 않고 기본 속도로 운용한다. Z는 기존 챔피언 기믹 제한에 따라 **50층부터** 장착/활성화한다. 쿠쿠이가 물리·특수·내구를 섞은 후보형 균형 파티라면 하우는 빠른 특수 공격, 용성군 후 유턴, 마지막 전용 Z에 집중한다.

### 구즈마

Expert / physical. 후보 풀과 필수 Golisopod는 유지한다. named-guzma의 기존 기믹 게이트는 50층이다. 그 전에는 메가스톤이 제거되어 일반형으로 싸운다.

|포켓몬|특성|도구|성격|훈련 포인트|4기술|
|---|---|---|---|---|---|
${setsTable('named-guzma')}

메가갑주무사는 **벌레/강철, 단단한발톱**이다. 메가 후에는 비상탈출을 유지하지 않는다. 일반형의 FI→EE→재등장→FI는 별도 통제 실험에서 먼저 복구·검증했고, 최종 메가형은 초기 층 일반형에서 그 전술을 유지한다. 후기에는 메가 화력·내구·흡혈 회복으로 승부한다. 실제 전투에서 접촉 위력 100→130과 HP 절반 통과 후 비상탈출 미발동을 테스트했다.

## AI 변경

- 자신의 등장/행동 이력으로 First Impression과 Fake Out의 첫 행동 조건을 추적한다. 같은 체류의 후속 행동에서는 일반·메가·테라 명령 후보에서 제외하고, 교체/비상탈출 뒤 재등장하면 초기화한다. Z로 바뀐 별도 기술은 별도로 취급한다.
- 선공기의 예상 최소 피해로 KO가 가능하거나, 더 느리고 쓰러질 위험이 크면서 일반 기술 대비 피해 차이가 작을 때 가치를 높인다. Technician, Tough Claws, 공개 랭크·타입·면역·마비와 만피 Gale Wings를 반영한다. Sucker Punch는 공개된 직전 변화기를 고려한다. 실제 상대의 미공개 세트나 선택 명령은 읽지 않는다.
- 현재 유효타가 없거나 쓰러질 위험이 큰 경우, 진입 피해를 견디며 First Impression KO를 낼 벤치 재투입을 고려한다. 일반 전술 교체는 기존 scorer를 재사용한다. 첫 행동 기술 팀의 자발 교체는 최대 4회, 3턴 간격·재투입 간격을 적용하며 구속·진입 즉사·빈사 보존 반복을 방지한다.
- 특공/공격이 2랭크 이상 떨어졌고 즉시 KO가 없으며 더 유리한 건강한 수신자가 있을 때 합법적인 타격 피벗을 고려한다. 음번의 유턴은 첫 실험 0회에서 최종 119회로 살아났다.
- 메가·다이맥스·테라 사용 가능 턴은 기존 자원 판단을 유지한다. 기존 테스트에서 발견한 메가진화 건너뛰기를 수정했다. Basic은 자신의 행동 이력만 추적하고 공개 학습·자발 교체를 얻지 않는다.

강제 앵콜/구속/PP 소진으로 대체 명령 자체가 없는 요청에서는 존재하지 않는 명령을 만들거나 전투를 정지시키지 않는다. 아래 불법/실패 0회는 실제 검증 범위의 결과다.

## 실험 방법

하우와 구즈마 각각 phase당 **384전 = 12파티 × 16seed × 2층**. 전투별 HP와 정책 상태를 초기화했다. 플레이어는 DamagePolicy, 기본 합법 기술, 전원 31 IV·66점, 공격 성향별 Adamant/Modest, 도구 없음이다. 같은 case/seed의 전후를 짝지었다. 플레이어 basic 룰과 NPC의 허용 기믹은 기존대로 독립적이다.

|분류|플레이어 3마리|
|---|---|
${JSON.parse(readFileSync(root+'/after-mega-manifest.json','utf8')).cases.map((v:{id:string;team:string[]})=>`|${v.id}|${v.team.join(' / ')}|`).join('\n')}

before=기준 데이터/v12, after=첫 행동 AI+일반 자뭉열매 통제군, after-mega=최종 메가스톤/v13. 추가로 같은 신세트+Expert/v12 대조 384전, 도구별 384전씩, 보호 3명 전후 각 96전씩, 등급 참조 6명 각 96전을 수행했다. 보고서에 포함한 실행은 총 4,608전이며 전후·후보 비교는 같은 조건을 다시 실행한 것이다.

## 승률과 전체 기여

NPC 승률은 이 검증 파티들에 대한 값이며 사용자의 개인 패배 확률이 아니다. JSON에 Wilson 95% 참고 구간, 파티별·층별 세부 결과를 포함했다. 타입 편향, 같은 seed를 공유하는 짝비교, 도구 없는 플레이어와 층별 훈련 차이 때문에 전체 플레이어 집단의 추정치로 해석하지 않는다.

|NPC|phase|NPC 승수/전투 (승률)|평균 턴|평균 상대 KO|평균 생존 멤버|
|---|---|---|---|---|---|
${mainTable}

|최종 NPC|층|승수/전투|승률|
|---|---|---|---|
${floors}

하우는 100층에서 특히 강하지만 전체 검증에서는 64.3%이고 모든 대전 유형에 일방적이지는 않다. 챔피언급 고화력 포지션으로 유지 가능하다. 구즈마는 메가형에서 총 ${final['named-guzma'].npcWins}승으로 상승했다. 기믹이 없는 초반과 후기 메가형은 난이도가 분명히 다르다.

### 하우 포켓몬별 실적 / 기술 전량

생존 턴은 각 포켓몬이 필드에 있었던 공개 턴 수다. 표에는 편성 전투당/실제 출전 전투당 평균을 함께 썼다. 유턴 교체 턴은 두 포켓몬에 겹칠 수 있어 합계가 전투 턴과 같지 않다.

|포켓몬|편성/출전 전투|등장 수|직접 KO|평균 활동 턴 (편성/출전)|기술 사용 횟수|
|---|---|---|---|---|---|
${statsTable('named-hau')}

누리레느는 직접 KO ${final['named-hau'].pokemon.Primarina.directKOs}회로 중간 브레이커 역할을 수행했다. 유턴은 **${final['named-hau'].pokemon.Noivern.moves['U-turn']}회**. 하우 자발 교체 ${final['named-hau'].entry.voluntarySwitches}회, 강제/유턴 수신 선택 ${final['named-hau'].entry.forcedSwitches}회다.

알로라이Z는 ${final['named-hau'].z.equippedBattles}전 장착, ${final['named-hau'].z.legalBattles}전/${final['named-hau'].z.legalDecisionTurns}요청 턴에서 합법, **Stoked Sparksurfer ${final['named-hau'].z.uses}회, 직접 KO ${final['named-hau'].z.directKOs}회**였다. 일반 공격으로 끝낼 수 있으면 자원을 아끼며, 장착했어도 라이츄가 행동하기 전에 전투가 끝나는 경우가 있다. 장착만 하고 거의 사용하지 않는 상태는 아니다.

### 구즈마 포켓몬별 실적 / 기술 전량

일반형과 메가형 갑주무사는 같은 편성 슬롯에 합산했다.

|포켓몬|편성/출전 전투|등장 수|직접 KO|평균 활동 턴 (편성/출전)|기술 사용 횟수|
|---|---|---|---|---|---|
${statsTable('named-guzma')}

|갑주무사·교체 지표|일반 자뭉 통제 384전|최종 메가스톤 384전|
|---|---|---|
${entryRows}

일반형의 완전 연쇄 **${c.completeEntryChains}회/${ordinary['named-guzma'].battlesWithCompleteEntryChain}전**을 확인했다. 최종형에서는 **${e.completeEntryChains}회**이며 전부 메가진화를 못 하는 초기 층이다. 후기 비상탈출 5회는 메가 전 상태에서 발생했다. 메가 후에 비상탈출 연쇄를 강제로 유지하는 규칙 변경은 하지 않았다.

같은 일반 신세트·Expert를 v12로만 돌리면 77/384승(20.1%), 만나자마자 잘못된 선택/실패 **430회**, 아쿠아제트 **0회**였다. v13 일반형은 118승, 잘못된 선택/실패 0회, 아쿠아제트 56회였다. 따라서 단순 스톤·데이터 버프와 별개로 조건부 기술 수정 효과도 확인된다.

일반 도구 실험은 자뭉열매 118승, 생명의구슬 109승, 돌격조끼 114승/각 384전이었다. 생명의구슬은 FI KO와 돌격조끼는 재등장을 늘렸지만 전체 승수는 개선하지 못했다. 후속 지시에 따라 메가스톤으로 확정했다.

교체 후 타입 위험이 감소하고 실제 승리한 예는 다음과 같다. 위험은 공개된 상대 STAB 타입의 최대 상성 배율이며 숨겨진 실제 기술을 안다는 뜻은 아니다.

${examples}

## 기존 NPC 및 기믹 회귀

|보호 대상|승수 전후|승패가 바뀐 전투|세부 telemetry가 바뀐 전투|
|---|---|---|---|
${regression}

라이치·카일리는 telemetry까지 동일했다. 키아웨는 6전에서 파이어로의 만피 질풍날개 선공 판단이 달라져 브레이브버드가 99→105회, 직접 KO가 58→64회, 날개쉬기가 9→12회였다. 전체 34/96승은 동일했고 데이터 수정은 없다. 평균 턴은 4.91→4.97이다. Accelerock/Extreme Speed는 실제 세트에 되넣지 않고 공용 단위 테스트에서 검증했다.

등급 참조(각 96전, seed 1–4, 45/95층)는 다음과 같다. 순위의 정밀한 추정이 아니라 상대적 위치 확인이다. 구즈마의 같은 seed 부분집합은 ${report.matchedRankGuzma.npcWins}/96승이다.

|참조 NPC|승수/전투|NPC 승률|
|---|---|---|
${ranks}

1~6세대·쿠쿠이·루자미네 등은 데이터 해시를 보존했고, 기존 지역별 실제 전투/기믹/리플레이 테스트도 통과했다. 공용 v13 판단이 바뀔 수 있으므로 모든 NPC의 모든 매치업 승률이 동일하다는 주장은 하지 않는다. 전 세대 대규모 승률 재조사는 이번 범위에 포함하지 않았다.

## 검증

- 전체 unit/integration **1,031개 통과**, 실패·스킵 0.
- 선택 브라우저/E2E **15개 통과**: 하우·구즈마 390/1280px 팀·선봉·입력·새로고침, 메가갑주무사 실제 메가진화/10316 스프라이트, 보호 3명, v11/v12/v13 Z.
- TypeScript noEmit, production build, 검토 원본→런타임 226행 대조, git diff whitespace 검사.
- FI 첫 행동/후속 행동/재등장/턴 중 교대, flinch, 7종 선공기 KO·비KO, 공개 면역/변화기, 위험한 진입/구속·교체 간격/예산, 음번 피벗, 실제 FI→EE→복귀→FI, 메가·다이맥스·테라·Z 실제 발동과 리플레이, v12 이전 포맷 저장 재접속을 검증했다.

Windows 빌드의 연결 폴더 생성은 샌드박스에서 권한 오류가 발생해 승인된 빌드 명령으로 재실행해 통과했다.

## 재현과 근거

전체 수치·원본 JSONL 해시·매니페스트·프로토콜 예시는 [JSON 보고서](../../artifacts/reports/npc/hau-guzma-audit.json)에 있다. 대용량 JSONL과 실행 로그는 \`${root}\`에 로컬 보관한다.

PowerShell에서 실행한다. baseline 생성기는 현재 수정본이 아닌 기준 git 커밋을 읽는다.

\`\`\`powershell
node scripts/build-hau-guzma-preservation.mjs
$env:HG_PHASE='before'
$env:NPC_BALANCE_BASELINE='${root}/baseline-runtime.json'
node --import ./scripts/lib/npc-balance-baseline.mjs --import tsx scripts/simulate-hau-guzma.ts
Remove-Item Env:NPC_BALANCE_BASELINE
$env:HG_PHASE='after'
node --import tsx scripts/simulate-hau-guzma.ts
$env:HG_PHASE='after-mega'
node --import tsx scripts/simulate-hau-guzma.ts
# 각 phase를 지정해 반복: restored-v12, regression-before,
# regression-after, rank-reference, trial-life-orb, trial-assault-vest
node --import tsx scripts/report-hau-guzma.ts
\`\`\`

하우 **유지 가능**. 구즈마 일반형은 **First Impression은 정상이나 팀 자체가 약함**이었고, 사용자 후속 지시에 따른 최종 메가형은 **목표 난이도 달성(표본 기준)**으로 판단한다.
`);
console.log(JSON.stringify({totals:Object.fromEntries(phases.map(p=>[p,Object.fromEntries(Object.entries(totals[p]).map(([id,v])=>[id,{n:v.battles,wins:v.npcWins,rate:v.npcWinRate,turns:v.meanTurns,entry:v.entry,z:v.z}]))])),pairedRegression},null,2));
