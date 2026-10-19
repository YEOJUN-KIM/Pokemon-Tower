import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {raidBossDefinitions} from '../../src/data/raids';
import {statKeys} from '../../src/data/training';
import {mean,summarize,type SimulationRow} from './raid-simulation';
import {simulationTeams,simulationPlayerTeam} from './raid-simulation-pool';
import {raidFloorBrackets,raidFloorBracket,endgameDifficulty,type RaidFloorBracketId} from './raid-floor-brackets';
import {csv} from './raid-simulation-report';

export type OverallBaseline={metadata:{commit?:string;raidDefinitionsHash:string;poolHash:string;sourceHash:string};groups:{id:string;boss:string;summary:{winRate:number}}[]};
const n=(value:number|null|undefined)=>value===null||value===undefined?'N/A':value.toFixed(2);
const pct=(value:number|null|undefined)=>value===null||value===undefined?'N/A':n(value)+'%';
const table=(headers:string[],rows:unknown[][])=>['| '+headers.join(' | ')+' |','| '+headers.map(()=> '---').join(' | ')+' |',...rows.map(row=>'| '+row.join(' | ')+' |')].join('\n');
export function floorSimulationReport(rows:SimulationRow[],metadata:Record<string,unknown>,out:string,baseline:OverallBaseline){
 if(!rows.length)throw Error('Empty floor simulation');
 const keys=new Set<string>();
 for(const row of rows){
  if(!row.bracket)throw Error('Missing floor bracket');
  const bracket=raidFloorBracket(row.bracket),boss=raidBossDefinitions.find(b=>b.id===row.bossId),team=simulationTeams.find(t=>t.id===row.teamId);
  if(!boss||!team||!(bracket.floors as readonly number[]).includes(row.floor)||row.floor<boss.minFloor||row.floor<team.minFloor)throw Error('Invalid bracket floor/team eligibility');
  const key=`${row.bossId}/${row.bracket}/${row.index}`;if(keys.has(key))throw Error('Duplicate bracket sample');keys.add(key);
 }
 const bosses=raidBossDefinitions.filter(b=>rows.some(r=>r.bossId===b.id));
 const groups=bosses.flatMap(boss=>raidFloorBrackets.map(bracket=>{
  const selected=rows.filter(r=>r.bossId===boss.id&&r.bracket===bracket.id);
  if(!selected.length)throw Error('Missing boss bracket');
  if(typeof metadata.runsPerBossBracket==='number'&&selected.length!==metadata.runsPerBossBracket)throw Error('Incomplete boss bracket');
  return {bossId:boss.id,boss:boss.species,bracket:bracket.id,summary:summarize(selected)};
 }));
 const curves=bosses.map(boss=>{
  const original=baseline.groups.find(g=>g.id===boss.id);if(!original)throw Error(`Missing original overall ${boss.id}`);
  const rates=Object.fromEntries(raidFloorBrackets.map(b=>[b.id,groups.find(g=>g.bossId===boss.id&&g.bracket===b.id)!.summary.winRate])) as Record<RaidFloorBracketId,number>;
  return {bossId:boss.id,boss:boss.species,overall:original.summary.winRate,...rates,endgameMinusEarly:rates.endgame-rates.early,endgameMinusOverall:rates.endgame-original.summary.winRate,label:endgameDifficulty(rates.endgame)};
 }).sort((a,b)=>a.endgame-b.endgame||a.bossId.localeCompare(b.bossId));
 const phases=groups.flatMap(g=>{
  const selected=rows.filter(r=>r.bossId===g.bossId&&r.bracket===g.bracket);
  return Array.from({length:Math.max(...selected.map(r=>r.phaseHP.length))},(_,i)=>{
   const phase=i+1,losses=selected.filter(r=>r.lossPhase===phase).length;
   return {boss:g.boss,bossId:g.bossId,bracket:g.bracket,phase,losses,lossShare:g.summary.bossWins?100*losses/g.summary.bossWins:null,allBattleShare:100*losses/selected.length};
  });
 });
 const branches=groups.flatMap(g=>{
  const selected=rows.filter(r=>r.bossId===g.bossId&&r.bracket===g.bracket),definition=bosses.find(b=>b.id===g.bossId)!;
  const types=definition.routes.some(r=>r.phases.some(p=>p.randomBranch));
  const names=types?[...new Set(selected.flatMap(r=>r.branchSpecies))]:definition.routes.length>1?[...new Set(selected.map(r=>r.route))]:[];
  return names.sort().map(branch=>{
   const matches=selected.filter(r=>types?r.branchSpecies.includes(branch):r.route===branch);
   return {boss:g.boss,bossId:g.bossId,bracket:g.bracket,branch,kind:types?'typePresence':'route',summary:summarize(matches),smallSample:matches.length<100};
  });
 });
 const teams=raidFloorBrackets.flatMap(bracket=>simulationTeams.map(team=>{
  const selected=rows.filter(r=>r.bracket===bracket.id&&r.teamId===team.id);
  return {bracket:bracket.id,teamId:team.id,species:team.species,minFloor:team.minFloor,uses:selected.length,winRate:selected.length?summarize(selected).winRate:null};
 }));
 const cache=new Map<string,ReturnType<typeof simulationPlayerTeam>>();
 const player=(row:SimulationRow)=>{const key=row.teamId+':'+row.floor;let value=cache.get(key);if(!value){value=simulationPlayerTeam(simulationTeams.find(t=>t.id===row.teamId)!,row.floor);cache.set(key,value);}return value;};
 const strength=raidFloorBrackets.map(bracket=>{
  const selected=rows.filter(r=>r.bracket===bracket.id),items:Record<string,number>={};
  for(const row of selected)for(const item of Object.values(player(row).items))items[item]=(items[item]??0)+1;
  const ivs=selected.flatMap(row=>Object.values(player(row).profiles).flatMap(p=>statKeys.map(k=>p.ivs[k])));
  const points=selected.flatMap(row=>Object.values(player(row).profiles).map(p=>statKeys.reduce((sum,k)=>sum+p.evs[k],0)));
  const eligible=bracket.floors.map(floor=>({floor,count:simulationTeams.filter(t=>t.minFloor<=floor).length}));
  const starterUses=selected.filter(r=>r.teamId.startsWith('starter-')).length;
  return {bracket:bracket.id,battles:selected.length,avgIV:mean(ivs),avgTrainingPoints:mean(points),minIV:ivs.reduce((a,b)=>Math.min(a,b),Infinity),maxIV:ivs.reduce((a,b)=>Math.max(a,b),-Infinity),minPoints:points.reduce((a,b)=>Math.min(a,b),Infinity),maxPoints:points.reduce((a,b)=>Math.max(a,b),-Infinity),heldItems:items,avgHeldItems:mean(selected.map(r=>Object.keys(player(r).items).length)),eligibleTeams:eligible,usedTeams:new Set(selected.map(r=>r.teamId)).size,starterUses,collectedUses:selected.length-starterUses,starterShare:100*starterUses/selected.length};
 });
 const floors=raidFloorBrackets.flatMap(bracket=>bracket.floors.map(floor=>{
  const selected=rows.filter(r=>r.bracket===bracket.id&&r.floor===floor);
  return {bracket:bracket.id,floor,battles:selected.length,summary:selected.length?summarize(selected):null};
 }));
 const endgame=curves.map(curve=>({...groups.find(g=>g.bossId===curve.bossId&&g.bracket==='endgame')!,configuredHP:bosses.find(b=>b.id===curve.bossId)!.raidHpMultiplier,label:curve.label}));
 const outliers={
  endgameBelow40:curves.filter(c=>c.endgame<40).map(c=>({boss:c.boss,winRate:c.endgame})),
  endgameAbove80:curves.filter(c=>c.endgame>80).map(c=>({boss:c.boss,winRate:c.endgame})),
  branchGaps:bosses.flatMap(boss=>{
   const subset=branches.filter(b=>b.bossId===boss.id&&b.bracket==='endgame'&&b.kind==='route');
   if(subset.length<2)return [];const gap=Math.max(...subset.map(b=>b.summary.winRate))-Math.min(...subset.map(b=>b.summary.winRate));
   return gap>15?[{boss:boss.species,gap}]:[];
  }),
  concentratedPhaseLoss:phases.filter(p=>p.bracket==='endgame'&&p.lossShare!==null&&p.lossShare>70),
 };
 const md=[
 '# Raid Winrate by Floor — unchanged model and data','',
 `기준 커밋 \`${metadata.commit}\`, **${rows.length.toLocaleString()}전**. 보스별 구간당 ${metadata.runsPerBossBracket??groups[0].summary.battles}전이며 Endgame 승률 낮은 순으로 정렬했다. 기존 [전체 승률](raid-winrate-simulation.md) 파일을 보존하고 읽기 전용 비교 기준으로 사용한다.`, '',
 '## 실행과 보존','',
 '- `npm run raid:simulate -- --floor-brackets` (기본 구간당 500전). 명시 실행: `npm run raid:simulate -- --runs 500 --floor-brackets`. 빠른 실행은 `--runs 3 --boss volcarona --workers 1 --out .data/raid-floor-smoke`를 추가한다.',
 '- 실제 runBattle / Raid snapshot / 변신 Adapter / 보스 ZMovePolicy / Player policy / 팀 풀 / 층별 육성·아이템 가정을 재사용한다. src의 전투·Raid·성장·상점·보상 데이터와 기존 정책·팀 풀 파일은 수정하지 않았다.',
 `- Seed base \`${metadata.seedBase}\`에 \`:bracket:early|mid|late|endgame\` 도메인을 붙인 뒤 기존 SHA-256 seed 생성기를 사용한다. 구간별 index는 0부터 시작한다. 같은 index의 팀/층은 보스 간 짝지으며, worker 수가 결과에 영향을 주지 않는다. 기존 전체 모드의 seed는 그대로 유지한다.`,
 '- Early 1..30: 5/15/25, Mid 31..60: 35/45/55, Late 61..80: 65/75, Endgame 81..100: 85/95. 구간 내 순환 배분으로 보스당 3개 층은 167/167/166전, 2개 층은 250/250전(500전 기준)이다. 팀과 보스의 minFloor를 모두 확인한다.',
 '- 기존 Overall은 30% Early + 30% Mid + 20% Late + 20% Endgame의 1,000전 결과다. 이번 값은 각 구간 독립 seed의 500전 결과다. Difference는 정책 표본의 차이이며 동일 전투의 짝 비교나 인간 승률의 인과 추정이 아니다. 보스 육성도 실제 floor에 따라 함께 변한다.',
 '- 기존 모델에서 Early의 5층은 IV0/0포인트, 15/25층은 IV15/33포인트다. Mid는 IV15/33포인트, Late와 Endgame은 모두 IV25/50포인트다. Endgame을 완벽 IV31/66포인트로 바꾸지 않았다. 따라서 Late→Endgame은 플레이어 육성 수치 자체가 증가하지 않으며, 보스 성장과 표본 차이가 반영된다.',
 '- 기본 룰 Lv50, 3마리 완전 회복, 성격 Serious, 기본 합법 기술·특성, 기존 일반 아이템 가정. 포인트는 현재 게임의 stat points로 보고하며 카트리지 EV로 오인하지 않는다. 상대 비공개 정보를 Player에게 전달하지 않는다.', '',
 '## 핵심표 — Endgame 낮은 순','',
 table(['Boss','Overall WR','Early','Mid','Late','Endgame','End−Early (pp)'],curves.map(c=>[c.boss,pct(c.overall),pct(c.early),pct(c.mid),pct(c.late),pct(c.endgame),n(c.endgameMinusEarly)])),'',
 '## Endgame 상태와 Effective HP','',
 '생존·잔여 HP는 승리 표본만의 평균이다. 잔여 HP는 기절 멤버를 포함한 팀 전체 현재 HP 합/최대 HP 합이다. 반동 동시 기절 후 엔진 Player 승리는 생존 0으로 기록한다. 승리 표본이 없으면 N/A다. HP는 기존 Effective HP 계산과 실제 request 대조를 그대로 사용한다. 표의 HP는 Endgame 평균이다.','',
 table(['Boss','Endgame WR','Avg Turns','Avg Survivors','Avg HP Left','Effective HP','Configured HP x','Effective HP x','분석용 상태'],endgame.map(g=>[g.boss,pct(g.summary.winRate),n(g.summary.avgTurns),n(g.summary.avgSurvivors),pct(g.summary.avgHPLeft),n(g.summary.effectiveHP),g.configuredHP,n(g.summary.effectiveMultiplier),g.label])),'',
 '## 기존 전체 결과와 비교','',
 table(['Boss','Overall WR','Endgame WR','Difference (pp)'],curves.map(c=>[c.boss,pct(c.overall),pct(c.endgame),n(c.endgameMinusOverall)])),'',
 '## 구간별 상세 결과','',
 table(['Boss','Bracket','Runs','Wins','Win Rate','Avg Turns','Avg Survivors','Avg HP Left'],groups.map(g=>[g.boss,g.bracket,g.summary.battles,g.summary.playerWins,pct(g.summary.winRate),n(g.summary.avgTurns),n(g.summary.avgSurvivors),pct(g.summary.avgHPLeft)])),'',
 '## 실제 플레이어 강도와 아이템','',
 'IV는 사용 개체의 6개 능력 평균, 포인트는 개체당 총 배분량 평균이다. 아이템 표본 수는 전체 전투에서 보유한 개수이며 소모 후 남은 개수가 아니다. 동일 팀 선택 seed를 보스 간 공유하므로 사용 횟수를 독립적인 사람/팀 표본 수로 해석하지 않는다.','',
 table(['Bracket','Avg IV [range]','Avg Points [range]','Avg held/team','Items (held count)','Eligible teams by floor','Used teams','Starter / Collected'],strength.map(s=>[s.bracket,`${n(s.avgIV)} [${s.minIV}..${s.maxIV}]`,`${n(s.avgTrainingPoints)} [${s.minPoints}..${s.maxPoints}]`,n(s.avgHeldItems),Object.entries(s.heldItems).map(([k,v])=>`${k}: ${v}`).join('<br>')||'없음',s.eligibleTeams.map(f=>`${f.floor}: ${f.count}`).join(' / '),s.usedTeams,`${s.starterUses} / ${s.collectedUses} (starter ${pct(s.starterShare)})`])),'',
 '## 실제 사용 팀','',
 table(['Bracket','Team','Pokémon','Uses','Win Rate'],teams.map(t=>[t.bracket,t.teamId,t.species.join(' / '),t.uses,pct(t.winRate)])),'',
 '## 층별 분포','',
 table(['Bracket','Floor','Battles','Win Rate'],floors.map(f=>[f.bracket,f.floor,f.battles,pct(f.summary?.winRate)])),'',
 '## Endgame Phase Loss','',
 'Loss Share 분모는 해당 보스·구간의 Player 패배 수다. All Battles는 구간 전체 전투 대비 비중이다. 이는 그 Phase에 진입한 전투의 조건부 패배 확률과 다르다.','',
 table(['Boss','Phase','Player Losses','Loss Share','All Battles'],phases.filter(p=>p.bracket==='endgame').map(p=>[p.boss,p.phase,p.losses,pct(p.lossShare),pct(p.allBattleShare)])),'',
 '## 전체 구간 Phase Loss','',
 table(['Boss','Bracket','Phase','Losses','Loss Share'],phases.map(p=>[p.boss,p.bracket,p.phase,p.losses,pct(p.lossShare)])),'',
 '## Endgame Random Branch','',
 '상호 배타적인 route 합계는 보스 구간 전투 수와 같다. Arceus는 P2/P3 타입 등장 전투를 집계하므로 타입 표본 합계는 구간 전투 수의 2배다. 타입별 상호작용을 분리한 인과 효과는 아니다. 100 미만은 참고용이다.','',
 table(['Boss','Branch','Runs','Win Rate','Avg Turns','Sample'],branches.filter(b=>b.bracket==='endgame').map(b=>[b.boss,b.branch+(b.kind==='typePresence'?' appeared':''),b.summary.battles,pct(b.summary.winRate),n(b.summary.avgTurns),b.smallSample?'참고용 (<100)':'100+'])),'',
 '## 이상치 — 분석용 라벨만','',
 '경계: WR<40 너무 강함, 40≤WR≤65 적당히 어려움, 65<WR≤80 비교적 쉬움, WR>80 너무 쉬움. Raid 등급이나 HP를 자동으로 바꾸지 않는다.','',
 `- Endgame <40%: ${outliers.endgameBelow40.map(x=>`${x.boss} ${pct(x.winRate)}`).join(', ')||'없음'}`,
 `- Endgame >80%: ${outliers.endgameAbove80.map(x=>`${x.boss} ${pct(x.winRate)}`).join(', ')||'없음'}`,
 `- Endgame route 간 차이 >15pp: ${outliers.branchGaps.map(x=>`${x.boss} ${n(x.gap)}pp`).join(', ')||'없음'}`,
 `- Endgame Phase Loss Share >70%: ${outliers.concentratedPhaseLoss.map(x=>`${x.boss} P${x.phase} ${pct(x.lossShare)}`).join(', ')||'없음'}`, '',
 '## 출력과 재현','',
 '`.csv`는 보스×구간 상세 80행, `.comparison.csv`는 기존 Overall과 네 구간·성장 차이, `.branches.csv`와 `.phases.csv`는 네 구간 전체 세부 통계, `.teams.csv`와 `.strength.csv`는 팀/육성, `.floors.csv`는 실제 표본 분포다. `.battles.csv`는 개별 seed·층·팀·전투 결과·프로토콜 해시 원본이며 대용량 로컬 결과물이다. `.json`에는 모든 집계와 코드·기존 결과 파일 해시를 보관한다.',
 '기존 전체 모드는 기본 1,000전을 유지한다. `--floor-brackets`가 있을 때만 기본 500전과 별도 출력 경로를 사용한다. 기존 결과 파일의 실행 전후 해시와 전체 src 해시를 검사한다.',
 ];
 mkdirSync(dirname(out),{recursive:true});writeFileSync(out+'.md',md.join('\n')+'\n');
 const summaryKeys=['battles','playerWins','bossWins','winRate','avgTurns','medianTurns','minTurns','maxTurns','avgSurvivors','avgHPLeft','medianHPLeft','avgBossPhaseHP','effectiveHP','effectiveMultiplier'] as const;
 writeFileSync(out+'.csv',csv([['boss','bracket',...summaryKeys],...groups.map(g=>[g.boss,g.bracket,...summaryKeys.map(k=>g.summary[k])])]));
 writeFileSync(out+'.comparison.csv',csv([['boss','overall','early','mid','late','endgame','endgameMinusEarlyPP','endgameMinusOverallPP','label'],...curves.map(c=>[c.boss,c.overall,c.early,c.mid,c.late,c.endgame,c.endgameMinusEarly,c.endgameMinusOverall,c.label])]));
 writeFileSync(out+'.phases.csv',csv([['boss','bracket','phase','losses','lossShare','allBattleShare'],...phases.map(p=>[p.boss,p.bracket,p.phase,p.losses,p.lossShare,p.allBattleShare])]));
 writeFileSync(out+'.branches.csv',csv([['boss','bracket','branch','kind','battles','winRate','avgTurns','smallSample'],...branches.map(b=>[b.boss,b.bracket,b.branch,b.kind,b.summary.battles,b.summary.winRate,b.summary.avgTurns,b.smallSample])]));
 writeFileSync(out+'.teams.csv',csv([['bracket','teamId','species','uses','winRate'],...teams.map(t=>[t.bracket,t.teamId,t.species.join('/'),t.uses,t.winRate])]));
 writeFileSync(out+'.strength.csv',csv([['bracket','battles','avgIV','minIV','maxIV','avgTrainingPoints','minPoints','maxPoints','avgHeldItems','usedTeams','starterUses','collectedUses','starterShare','heldItems','eligibleTeams'],...strength.map(s=>[s.bracket,s.battles,s.avgIV,s.minIV,s.maxIV,s.avgTrainingPoints,s.minPoints,s.maxPoints,s.avgHeldItems,s.usedTeams,s.starterUses,s.collectedUses,s.starterShare,JSON.stringify(s.heldItems),JSON.stringify(s.eligibleTeams)])]));
 writeFileSync(out+'.floors.csv',csv([['bracket','floor','battles','winRate'],...floors.map(f=>[f.bracket,f.floor,f.battles,f.summary?.winRate])]));
 const rowKeys=['bracket','bossId','index','seed','floor','teamId','route','branchSpecies','winner','turns','survivors','teamHP','lossPhase','bossPhaseHP','normalHP','phaseHP','effectiveHP','effectiveMultiplier','playerSwitches','observedPhases','protocolHash'] as const;
 writeFileSync(out+'.battles.csv',csv([[...rowKeys],...rows.map(row=>rowKeys.map(k=>Array.isArray(row[k])?(row[k] as (number|string)[]).join('/'):row[k]))]));
 writeFileSync(out+'.json',JSON.stringify({metadata,curves,groups,endgame,phases,branches,teams,strength,floors,outliers},null,2)+'\n');
 return {curves,groups,endgame,phases,branches,teams,strength,floors,outliers};
}
