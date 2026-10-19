import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {raidBossDefinitions} from '../../src/data/raids';
import {simulationTeams,simulationFloors} from './raid-simulation-pool';
import {mean,summarize,type SimulationRow} from './raid-simulation';

export const csv=(rows:unknown[][])=>rows.map(row=>row.map(value=>{const text=value===null||value===undefined?'':String(value);return /[",\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;}).join(',')).join('\n')+'\n';
const f=(n:number|null|undefined,d=2)=>n===null||n===undefined?'N/A':n.toFixed(d);
const pct=(n:number|null|undefined)=>n===null||n===undefined?'N/A':f(n)+'%';
const table=(headers:string[],rows:unknown[][])=>['| '+headers.join(' | ')+' |','| '+headers.map(()=> '---').join(' | ')+' |',...rows.map(row=>'| '+row.join(' | ')+' |')].join('\n');
export function simulationReport(rows:SimulationRow[],metadata:Record<string,unknown>,out:string){
 mkdirSync(dirname(out),{recursive:true});
 const groups=raidBossDefinitions.filter(b=>rows.some(r=>r.bossId===b.id)).map(boss=>({boss:boss.species,id:boss.id,configured:boss.raidHpMultiplier,summary:summarize(rows.filter(r=>r.bossId===boss.id))}));
 const sorted=[...groups].sort((a,b)=>a.summary.winRate-b.summary.winRate||a.id.localeCompare(b.id));
 const branches:{boss:string;branch:string;summary:ReturnType<typeof summarize>;smallSample:boolean}[]=[];
 const phases:{boss:string;phase:number;losses:number;share:number|null;allBattleShare:number}[]=[];
 for(const g of groups){
  const subset=rows.filter(r=>r.bossId===g.id),definition=raidBossDefinitions.find(b=>b.id===g.id)!;
  if(definition.routes.length>1)for(const branch of [...new Set(subset.map(r=>r.route))].sort()){
   const matches=subset.filter(r=>r.route===branch);branches.push({boss:g.boss,branch,summary:summarize(matches),smallSample:matches.length<100});
  }
  // Any random Phase branch is summarized by result species/type presence,
  // rather than an unreadable Cartesian product of P2/P3 combinations.
  if(definition.routes.some(r=>r.phases.some(p=>p.randomBranch)))for(const branch of [...new Set(subset.flatMap(r=>r.branchSpecies))].sort()){
   const matches=subset.filter(r=>r.branchSpecies.includes(branch));branches.push({boss:g.boss,branch:branch+' appeared',summary:summarize(matches),smallSample:matches.length<100});
  }
  for(let phase=1;phase<=Math.max(...subset.map(r=>r.phaseHP.length));phase++){
   const losses=subset.filter(r=>r.lossPhase===phase).length;phases.push({boss:g.boss,phase,losses,share:g.summary.bossWins?100*losses/g.summary.bossWins:null,allBattleShare:100*losses/subset.length});
  }
 }
 const teams=simulationTeams.map(team=>{const subset=rows.filter(r=>r.teamId===team.id);return {...team,summary:subset.length?summarize(subset):null};});
 const floors=simulationFloors.map(floor=>{const subset=rows.filter(r=>r.floor===floor);return {floor,summary:subset.length?summarize(subset):null};});
 const outliers:string[]=[];
 for(const g of groups){
  if(g.summary.winRate>=90||g.summary.winRate<=40)outliers.push(`${g.boss}: Player WR ${pct(g.summary.winRate)}.`);
  const bs=branches.filter(b=>b.boss===g.boss&&!b.branch.endsWith(' appeared'));
  if(bs.length>1){const gap=Math.max(...bs.map(b=>b.summary.winRate))-Math.min(...bs.map(b=>b.summary.winRate));if(gap>=15)outliers.push(`${g.boss}: route WR gap ${f(gap)} percentage points.`);}
  for(const phase of phases.filter(p=>p.boss===g.boss&&p.share!==null&&p.share>=70))outliers.push(`${g.boss}: P${phase.phase} accounts for ${pct(phase.share)} of player losses (${phase.losses}/${g.summary.bossWins}).`);
 }
 const main=(ordered:typeof groups)=>table(['Rank','Boss','Runs','Player Wins','Win Rate','Avg Turns','Avg Survivors','Avg HP Left','Effective HP'],ordered.map((g,i)=>[i+1,g.boss,g.summary.battles,g.summary.playerWins,pct(g.summary.winRate),f(g.summary.avgTurns),f(g.summary.avgSurvivors),pct(g.summary.avgHPLeft),f(g.summary.effectiveHP)]));
 const report=[
 '# Raid Winrate Simulation — current data, no tuning','',
 `실제 Battle/Raid 엔진으로 **${rows.length.toLocaleString()}전**을 완료했다. 기준 커밋: \`${metadata.commit}\`. 아래 값은 명시한 팀·육성·행동 가정의 자동 정책 승률이며, 실측 사람 승률이 아니다. 80%/70%/60% 목표로 보스를 재분류하거나 데이터를 조정하지 않았다.`, '',
 '## 재현 조건','',
 `- 기본 실행: \`npm run raid:simulate -- --runs 1000\`. 빠른 확인: \`--runs 10 --boss garchomp --workers 1 --out .data/raid-smoke\`.`,
 `- Seed base: \`${metadata.seedBase}\`. SHA-256(seed base + boss ID + zero-based run index + domain)의 앞 8바이트를 4개 UInt16 seed로 사용한다. snapshot/battle/policy RNG를 분리한다. 팀 RNG에는 boss ID를 넣지 않아 보스 간 같은 index의 floor/team을 짝지었다.`,
 '- 목록은 `raidBossDefinitions`에서 읽는다. 실제 `createRaidSnapshot()`의 가중 route/Phase 추첨, IV/성격/이로치, 실제 `runBattle()`과 Raid Adapter를 재사용한다. 보스는 현재 서버의 `tower-policy-v10`과 동일한 `ZMovePolicy`. 보스 Policy 입력에 대한 변경은 없다.',
 '- Player는 `CautiousSwitchingPolicy`를 얇게 감싼 `RaidSimulationPlayerPolicy`. 기존 공격/상성/회복/상태/강화/강제 교체 판단을 재사용한다. 불리한 공개 타입 또는 HP 30% 미만일 때 55%의 결정 확률로 기존 자발 교체 판단을 허용한다. 기존 정책의 교체 상한·쿨다운·교체 이득 조건도 유지한다. 완벽한 예측이나 상대의 비공개 기술·특성·IV·미래 Phase를 읽지 않는다.',
 '- 1차 기준은 실제 기본 룰 `basic`, 양측 Lv50, Tera ticket 0, player run bonus/소모품/트레이너 장비 없음. 보스의 강제 Mega/Primal/G-Max/Stellar/Ultra 등은 룰과 별개로 실제 Raid 엔진 그대로 발동한다. 플레이어 기믹이 없는 기본 룰의 결과이므로 다른 룰로 일반화하지 않는다. 정책은 합법 기믹 action을 기존 구현대로 처리할 수 있다.',
 '- 층은 5/15/25/35/45/55/65/75/85/95를 순환하는 동일 표본. 각 보스의 minFloor를 확인한다. 실제 유저의 층별 생존/도전 선택률로 가중한 분포가 아니다. 모든 전투는 3마리 완전 회복 상태로 시작한다.',
 '- 20개 일반 팀 중 eligible 팀을 seed로 균등 선택한다. 처음 10개는 실제 초기 해금 `initialPartners` 기반이며, 나머지 10개는 일반 수집 가능 종 조합이다. 수집 팀은 현행 `towerDifficulty().bstCeiling`이 팀 최대 BST를 허용하는 층 이후부터 사용한다. 보스별 카운터 구성이나 상대 기반 선발 최적화는 없다. 첫 멤버로 고정 선발한다.',
 '- 육성 가정: floor<=10 IV0/포인트0, 11..60 IV15/포인트33, 61..100 IV25/포인트50. 기존 balance simulation의 fresh/mid/trained 개념을 사용한 가정이며 유저 데이터로 보정된 평균은 아니다. 성격 Serious, 기존 defaultProfile의 합법 기본 기술·특성·주 타입 Tera, 공격48%/스피드32%/나머지HP 배분. 종별 공격 성향만 반영한다. 15층부터 첫 멤버 Sitrus Berry, 50층부터 두 번째 Muscle Band/Wise Glasses·세 번째 Leftovers를 보유했다고 가정한다. 상점/성장 경제를 시뮬레이션하거나 수정하지 않는다.',
 '- 보상 스냅샷 생성을 위해 worker당 메모리 DB/run 하나만 초기화한다. 매 전투 UI/서버/DB 전투 생성·승리·영입 처리는 실행하지 않는다. 난수 추첨과 보상 정책 코드는 원본을 사용한다.',
 `- Source SHA-256: \`${metadata.sourceHash}\`. 보호 대상 전체 src와 manifest의 파일 해시, 엔진 버전, 풀/정책 해시를 JSON에 기록했다. 실행 전후 src 해시가 같아야 보고서를 쓴다. worker 수가 seed나 출력 순서에 영향을 주지 않는다.`, '',
 '## 결과 — 승률 낮은 순','',main(sorted),'',
 '## 결과 — 승률 높은 순','',main([...sorted].reverse()),'',
 '## 전투 길이 및 승리/패배 상태','',
 'Survivors/HP Left는 Player 승리 표본만의 통계다. Team HP%는 기절한 멤버도 분모에 넣은 전체 3마리 현재 HP 합 / 최대 HP 합이다. Boss Phase HP%는 패배 시 현재 Phase의 잔여 HP이며 후속 미진입 Phase는 포함하지 않는다. 승리 표본이 없으면 N/A다. 운영 로그의 % 반올림 대신 각 side의 실제 private HP 이벤트를 분석하되 정책에는 상대 private 정보가 전달되지 않는다. 마지막 보스를 쓰러뜨리고 반동으로 마지막 아군도 기절하면 실제 엔진이 Player 승리로 판정할 수 있어 0 survivor 승리도 그대로 집계한다.','',
 table(['Boss','Boss Wins','Median Turns','Min','Max','Median HP Left','0 survivors','1 survivor','2 survivors','3 survivors','Boss Phase HP on loss'],groups.map(g=>[g.boss,g.summary.bossWins,f(g.summary.medianTurns),g.summary.minTurns,g.summary.maxTurns,pct(g.summary.medianHPLeft),pct(g.summary.playerWins?100*rows.filter(r=>r.bossId===g.id&&r.won&&r.survivors===0).length/g.summary.playerWins:null),...g.summary.survivorShares.map(pct),pct(g.summary.avgBossPhaseHP)])),'',
 '## Branch 결과','',
 'Route 표는 상호 배타적이며 합계가 보스 전투 수와 같다. Arceus의 `appeared` 표는 P2/P3 중 해당 타입이 나타난 전투 집합이며 한 전투가 두 타입 집계에 들어간다. type appearance 합계는 보스 전투 수의 두 배다. 표본 100 미만은 참고용으로 표시한다.','',
 table(['Boss','Branch','Runs','Player Win Rate','Avg Turns','Sample'],branches.map(b=>[b.boss,b.branch,b.summary.battles,pct(b.summary.winRate),f(b.summary.avgTurns),b.smallSample?'참고용 (<100)':'100+'])),'',
 '## Phase Death','',
 'Loss Share의 분모는 해당 보스에 대한 전체 Player 패배 수다. All Battles의 분모는 보스 전체 전투 수다. 최대 손실 비중은 그 Phase에 도달한 표본의 조건부 패배 확률과 다르다.','',
 table(['Boss','Phase','Player Losses','Loss Share','All Battles'],phases.map(p=>[p.boss,p.phase,p.losses,pct(p.share),pct(p.allBattleShare)])),'',
 '## Effective HP','',
 '모든 수치는 해당 보스의 실행 스냅샷 평균이며 괄호는 최소..최대다. Phase HP는 현행 trainedStat + raidPhaseHP 함수를 사용하며 G-Max의 native 2배를 반영한다. 실제 도달한 모든 Phase의 boss private request max HP와 매 전투 대조해 불일치 시 실행을 중단한다. 미도달 Phase도 저장된 폼의 정상 HP로 계산해 Total Effective HP에 포함한다. Effective multiplier는 각 전투 Total / 같은 IV·포인트의 기본종 Normal HP 비율의 평균이다. 회복기·방어 특성·상성·랭크의 간접 효과는 HP 합에 포함하지 않는다.','',
 table(['Boss','Configured','Actual Phase Max HP (mean [min..max])','Total Effective HP','Base Normal HP','Effective Multiplier'],groups.map(g=>{
  const subset=rows.filter(r=>r.bossId===g.id),phaseCount=Math.max(...subset.map(r=>r.phaseHP.length));
  return [g.boss,g.configured,Array.from({length:phaseCount},(_,i)=>{const values=subset.map(r=>r.phaseHP[i]);return `P${i+1}: ${f(mean(values))} [${Math.min(...values)}..${Math.max(...values)}]`;}).join('<br>'),f(g.summary.effectiveHP),f(mean(subset.map(r=>r.normalHP))),f(g.summary.effectiveMultiplier)+'x'];
 })),'',
 '## Player team 사용 통계','',table(['Team ID','Pokémon','Min Floor','Uses','Win Rate'],teams.map(t=>[t.id,t.species.join(' / '),t.minFloor,t.summary?.battles??0,pct(t.summary?.winRate)])),'',
 '## 층별 결과','',table(['Floor','Runs','Player Win Rate','Avg Turns'],floors.map(s=>[s.floor,s.summary?.battles??0,pct(s.summary?.winRate),f(s.summary?.avgTurns)])),'',
 '## 이상치 — 기록만, 밸런스 변경 없음','',...outliers.map(s=>'- '+s),'',
 '## 파일과 검증','',
 '- `.csv`: 보스별 전체 요약. `.battles.csv`: 전투별 seed·팀·층·route·Phase·잔여 전력·HP·프로토콜 해시. `.branches.csv`, `.phases.csv`, `.teams.csv`: 세부 집계. `.json`: 재현 manifest와 모든 집계.',
 '- 일반 단위 테스트는 1 boss × 6 runs를 두 번 실행해 결과 및 프로토콜 해시, Phase 합계와 branch 합계, 실제 전투/replay 일치를 검사한다. 20,000전은 CLI에서 별도로 실행한다.',
 ];
 writeFileSync(out+'.md',report.join('\n')+'\n');
 const headers=['boss','battles','playerWins','bossWins','winRate','avgTurns','medianTurns','minTurns','maxTurns','avgSurvivors','avgHPLeft','medianHPLeft','avgBossPhaseHP','effectiveHP','effectiveMultiplier'];
 const extra=['configuredHPMultiplier','avgBaseNormalHP','avgPhaseMaxHP','zeroSurvivorsPct','oneSurvivorPct','twoSurvivorsPct','threeSurvivorsPct'];
 writeFileSync(out+'.csv',csv([[...headers,...extra],...sorted.map(g=>{
  const subset=rows.filter(r=>r.bossId===g.id),wins=subset.filter(r=>r.won);
  return [g.boss,...headers.slice(1).map(k=>g.summary[k as keyof typeof g.summary]),g.configured,mean(subset.map(r=>r.normalHP)),Array.from({length:subset[0].phaseHP.length},(_,i)=>mean(subset.map(r=>r.phaseHP[i]))).join('/'),wins.length?100*wins.filter(r=>r.survivors===0).length/wins.length:null,...g.summary.survivorShares];
 })]));
 writeFileSync(out+'.battles.csv',csv([['bossId','index','seed','floor','teamId','route','branchSpecies','winner','turns','survivors','teamHP','lossPhase','bossPhaseHP','normalHP','phaseHP','effectiveHP','effectiveMultiplier','playerSwitches','observedPhases','protocolHash'],...rows.map(r=>[r.bossId,r.index,r.seed.join('/'),r.floor,r.teamId,r.route,r.branchSpecies.join('/'),r.winner,r.turns,r.survivors,r.teamHP,r.lossPhase,r.bossPhaseHP,r.normalHP,r.phaseHP.join('/'),r.effectiveHP,r.effectiveMultiplier,r.playerSwitches,r.observedPhases.join('/'),r.protocolHash])]));
 writeFileSync(out+'.branches.csv',csv([['boss','branch','runs','winRate','avgTurns','smallSample'],...branches.map(b=>[b.boss,b.branch,b.summary.battles,b.summary.winRate,b.summary.avgTurns,b.smallSample])]));
 writeFileSync(out+'.phases.csv',csv([['boss','phase','losses','lossShare','allBattleShare'],...phases.map(p=>[p.boss,p.phase,p.losses,p.share,p.allBattleShare])]));
 writeFileSync(out+'.teams.csv',csv([['teamId','species','minFloor','uses','winRate'],...teams.map(t=>[t.id,t.species.join('/'),t.minFloor,t.summary?.battles??0,t.summary?.winRate])]));
 writeFileSync(out+'.json',JSON.stringify({metadata,groups:sorted,branches,phases,teams,floors,outliers},null,2)+'\n');
 return {groups:sorted,branches,phases,outliers};
}
