import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {availableParallelism} from 'node:os';
import {raidBossDefinitions} from '../src/data/raids';
import {statKeys} from '../src/data/training';
import {raidBattleTrainingProfiles} from '../src/data/raid-training';
import {engineVersion,FORMAT} from '../src/battle/run';
import {runRaidSimulationJobs} from './simulate-raids';
import {summarize,mean} from './lib/raid-simulation';
import {simulationTeams} from './lib/raid-simulation-pool';
import {csv} from './lib/raid-simulation-report';

const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
// Historical manifests were generated from LF checkouts; Windows uses CRLF.
const sourceHash=(p:string)=>createHash('sha256').update(readFileSync(p,'utf8').replaceAll('\r\n','\n')).digest('hex');
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const n=(x:number|null|undefined)=>x===null||x===undefined?'N/A':x.toFixed(2);
const pct=(x:number|null|undefined)=>x===null||x===undefined?'N/A':n(x)+'%';
const table=(headers:string[],rows:unknown[][])=>['| '+headers.join(' | ')+' |','| '+headers.map(()=> '---').join(' | ')+' |',...rows.map(row=>'| '+row.join(' | ')+' |')].join('\n');
const args=process.argv.slice(2);let runs=500,workers=Math.min(4,availableParallelism());
for(let i=0;i<args.length;i++){if(!['--runs','--workers'].includes(args[i])||!args[i+1])throw Error('Expected --runs or --workers');const flag=args[i++],value=Number(args[i]);if(flag==='--runs')runs=value;else workers=value;}
if(!Number.isSafeInteger(runs)||runs<1||!Number.isSafeInteger(workers)||workers<1||workers>32)throw Error('Invalid runs/workers');
const out=runs===500?'artifacts/reports/raid-stat-tuned-endgame':`.data/raid-stat-tuned-smoke-${runs}`;
const beforePath='artifacts/reports/raid-winrate-by-floor.json',before=JSON.parse(readFileSync(beforePath,'utf8'));
const thresholdPath='artifacts/reports/raid-threshold-endgame.json',threshold=JSON.parse(readFileSync(thresholdPath,'utf8'));
// Preserve all old reports, including raw per-battle local datasets.
const protectedFiles=Object.fromEntries(readdirSync('artifacts/reports').filter(p=>p.startsWith('raid-winrate-simulation.')||p.startsWith('raid-winrate-by-floor.')||p.startsWith('raid-threshold-endgame.')).map(p=>['artifacts/reports/'+p,hash('artifacts/reports/'+p)]));
const sources:string[]=[];function walk(root:string){for(const e of readdirSync(root,{withFileTypes:true})){const p=resolve(root,e.name);if(e.isDirectory())walk(p);else sources.push(p);}}walk('src');
const sourceFiles=Object.fromEntries(sources.sort().map(p=>[relative(process.cwd(),p).replaceAll('\\','/'),hash(p)]));
if(before.metadata.poolHash!==digest(simulationTeams))throw Error('Player team pool changed');
const unchangedPolicy='scripts/lib/raid-simulation-player.ts',unchangedPool='scripts/lib/raid-simulation-pool.ts';
for(const p of [unchangedPolicy,unchangedPool])if(before.metadata.simulationFiles[p]!==sourceHash(p))throw Error(`Player model changed: ${p}`);
const started=Date.now();let completed=0;
const rows=await runRaidSimulationJobs({bossIds:raidBossDefinitions.map(b=>b.id),runs,seedBase:before.metadata.seedBase,workers,floorBrackets:true,brackets:['endgame'],onProgress:(id,sample)=>{console.log(`${++completed}/${raidBossDefinitions.length} ${id}: ${sample.filter(r=>r.won).length}/${sample.length}; ${((Date.now()-started)/1000).toFixed(1)}s`);}});
for(const [p,h]of Object.entries(protectedFiles))if(hash(p)!==h)throw Error('Before report changed');
for(const [p,h]of Object.entries(sourceFiles))if(hash(p)!==h)throw Error('Source changed during simulation');
const groups=raidBossDefinitions.map(boss=>{
 const sample=rows.filter(r=>r.bossId===boss.id),old=before.endgame.find((g:{bossId:string})=>g.bossId===boss.id);
 if(sample.length!==runs||sample.some(r=>r.floor!==85&&r.floor!==95))throw Error('Invalid Endgame sample');
 const summary=summarize(sample);
 if(runs===500&&[85,95].some(f=>sample.filter(r=>r.floor===f).length!==250))throw Error('Floors must have 250 battles each');
 if(sample.some(r=>!statKeys.every(k=>r.rewardIVs?.[k]===31)||statKeys.reduce((sum,k)=>sum+r.rewardTraining![k],0)!==66||statKeys.some(k=>r.rewardTraining![k]>32)))throw Error('Invalid premium reward');
 const stats=sample.map(r=>({index:r.index,seed:r.seed,floor:r.floor,route:r.route,ivs:r.bossIVs,points:r.bossTraining,rewardIVs:r.rewardIVs,rewardPoints:r.rewardTraining,rewardNature:r.rewardNature,rewardSpecies:r.rewardSpecies}));
 return {bossId:boss.id,boss:boss.species,hpMode:boss.hpMode,original:old.summary.winRate,before:threshold.groups.find((g:{bossId:string})=>g.bossId===boss.id).after,after:summary.winRate,delta:summary.winRate-threshold.groups.find((g:{bossId:string})=>g.bossId===boss.id).after,summary,stats,baseHP:mean(sample.map(r=>r.normalHP)),phaseMaxHP:sample[0].phaseMaxHP,phaseBudgets:sample[0].phaseHP};
}).sort((a,b)=>a.after-b.after||a.bossId.localeCompare(b.bossId));
const branches=groups.flatMap(g=>{
 const sample=rows.filter(r=>r.bossId===g.bossId),boss=raidBossDefinitions.find(b=>b.id===g.bossId)!;
 const types=boss.routes.some(r=>r.phases.some(p=>p.randomBranch)),names=types?[...new Set(sample.flatMap(r=>r.branchSpecies))]:boss.routes.length>1?[...new Set(sample.map(r=>r.route))]:[];
 return names.sort().map(branch=>{const subset=sample.filter(r=>types?r.branchSpecies.includes(branch):r.route===branch),old=before.branches.find((b:{bossId:string;bracket:string;branch:string})=>b.bossId===g.bossId&&b.bracket==='endgame'&&b.branch===branch);return {boss:g.boss,bossId:g.bossId,branch,kind:types?'typePresence':'route',before:old?.summary.winRate??null,summary:summarize(subset)};});
});
const phases=groups.flatMap(g=>Array.from({length:rows.find(r=>r.bossId===g.bossId)!.phaseHP.length},(_,i)=>{const losses=rows.filter(r=>r.bossId===g.bossId&&r.lossPhase===i+1).length;return {boss:g.boss,phase:i+1,losses,lossShare:g.summary.bossWins?100*losses/g.summary.bossWins:null};}));
const outliers={easy:groups.filter(g=>g.after>85).map(g=>g.boss),hard:groups.filter(g=>g.after<35).map(g=>g.boss),branchGaps:groups.flatMap(g=>{const b=branches.filter(b=>b.bossId===g.bossId&&b.kind==='route');const gap=b.length>1?Math.max(...b.map(v=>v.summary.winRate))-Math.min(...b.map(v=>v.summary.winRate)):0;return gap>15?[{boss:g.boss,gap}]:[];})};
const metadata={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),engineVersion,format:FORMAT,runsPerBoss:runs,totalBattles:rows.length,seedBase:before.metadata.seedBase,bracket:'endgame',floors:[85,95],workers,elapsedSeconds:(Date.now()-started)/1000,beforePath,beforeHash:hash(beforePath),thresholdPath,thresholdHash:hash(thresholdPath),adjustments:1,trainingProfiles:raidBattleTrainingProfiles,protectedFiles,sourceFiles,poolHash:digest(simulationTeams),policyHash:sourceHash(unchangedPolicy),sourceLineEndings:'LF for historical policy/pool verification; raw for execution manifest',raidDefinitionsHash:digest(raidBossDefinitions)};
mkdirSync(out.startsWith('.data/')?'.data':'artifacts/reports',{recursive:true});
const profiles=groups.flatMap(g=>{
 const boss=raidBossDefinitions.find(b=>b.id===g.bossId)!;
 return [...new Set(g.stats.map(s=>s.route+':'+s.floor))].map(key=>{
  const sample=g.stats.filter(s=>s.route+':'+s.floor===key),s=sample[0];
  const protectedStats=boss.id==='mewtwo'?[boss.routes.find(r=>r.id===s.route)!.attack,'spe']:boss.ivRule.protected;
  const ranges=Object.fromEntries(statKeys.map(k=>[k,[Math.min(...sample.map(s=>s.ivs![k])),Math.max(...sample.map(s=>s.ivs![k]))]]));
  return {boss:g.boss,route:s.route,floor:s.floor,training:boss.battleTraining,perfect:boss.ivRule.perfect,protectedStats,points:s.points,ivRanges:ranges,firstIVs:s.ivs,rewardIV:'6V',nature:s.rewardNature,rewardPoints:s.rewardPoints,rewardSpecies:s.rewardSpecies};
 });
});
const md=[
 '# Raid 전투 스탯 1차 완화 및 premium 보상 검증','',
 `${rows.length.toLocaleString()}전, 20 Boss × ${runs}전, Endgame 85/95층 균등. 기존 threshold simulator의 runRaidSimulationJobs·seed·Player policy·팀·Boss AI를 그대로 사용했다. 결과를 보고 재조정하지 않았다.`, '',
 '## 변경 범위','',
 '- Top: Mewtwo / Arceus / Rayquaza 3V, elite 총 포인트의 57% (반올림). Very Strong: Zacian / Kyogre / Groudon / Terapagos 3V, 63%. Strong: Shaymin 4V, 68%. 나머지 12종 전투 스탯 유지.',
 '- 기존 elite 포인트에서 공격/특공을 Speed보다 먼저 줄인다(감점 2:1). HP/Def/SpD 포인트는 유지한다. 비보호 IV는 기존 0–30 추첨, 조정 8종 HP IV 하한 16. 보호 IV 및 나머지 추첨으로 정확한 3V/4V를 만든다. Mewtwo는 route 주공격/Spe를 보호한다.',
 '- threshold-v1 / replacement-v1 / native HP resize / clamp / Mega / Primal / G-Max / Stellar / Ultra / Mewtwo 3 Phase·Aura / random branch / 기술·특성·전용도구를 유지한다. HP IV 차이에 따른 정상 Max HP 차이만 있다.',
 '- Pokémon rewardProfile=raid-premium을 전투 프로필 및 기존 elite 아이템·돈 보상표에서 분리했다. 플레이어 기본종/선택 폼 기본 build, 6V, 기존 좋은 route 성격(Serious는 공격 역할에 맞춰 교체), 66포인트(주공격32/Speed32/HP2; Snorlax HP32/Atk32/SpD2). Zygarde는 물리 성격/육성이다.',
 '- Volcarona와 Kyurem만 실제 P2 보상. 나머지는 기본종. 기존 shiny 추첨을 유지하며 추가 랜덤 draw 없이 recruitTeam에 보상 전체를 고정 저장한다. 구형 스냅샷은 기존 저장 보상을 유지한다.',
 '- 평균 생존 수 / 잔여 HP는 승리 표본 기준이다. 모의 AI 결과이며 사람의 실제 승률은 아니다.', '',
 '## 세 모델 비교','',
 table(['Boss','Old multiplier WR','Threshold WR','Stat-Tuned WR','Delta (pp)','Avg Turns','Avg Survivors (wins)','Avg HP Left (wins)'],groups.map(g=>[g.boss,pct(g.original),pct(g.before),pct(g.after),n(g.delta),n(g.summary.avgTurns),n(g.summary.avgSurvivors),pct(g.summary.avgHPLeft)])), '',
 '## 전투 / 보상 검증','',
 '스탯 벡터 순서: HP / Atk / Def / SpA / SpD / Spe. IV는 각 route/층 첫 실제 개체이며 전체 10,000개 실제 IV·포인트·seed는 battles.csv에 기록했다. JSON profiles[].ivRanges는 관측 최솟값/최댓값이다. 모든 보상 표본을 6V·총66·각 스탯32 이하로 검사했다.','',
 table(['Boss / Route / Floor','Battle Perfect IV','Battle Training','Protected IV','Actual IV (first)','Battle Points','Reward IV','Reward Nature','Reward Points','Reward Species/Form'],profiles.map(p=>[p.boss+' / '+p.route+' / '+p.floor,p.perfect,p.training,p.protectedStats.join('/'),statKeys.map(k=>p.firstIVs![k]).join('/'),statKeys.map(k=>p.points![k]).join('/'),p.rewardIV,p.nature,statKeys.map(k=>p.rewardPoints![k]).join('/'),p.rewardSpecies])), '',
 '## Random branches','',
 'Arceus typePresence는 P2/P3가 겹치며 표본 합이 전투 수의 2배다. 작은 branch 표본의 승률은 참고용이다. Branch의 Before는 original multiplier 비교다.','',
 table(['Boss','Branch','Runs','Old multiplier WR','Stat-Tuned WR','Avg Turns'],branches.map(b=>[b.boss,b.branch,b.summary.battles,pct(b.before),pct(b.summary.winRate),n(b.summary.avgTurns)])), '',
 '## Phase loss share','',table(['Boss','Phase','Losses','Loss Share'],phases.map(p=>[p.boss,p.phase,p.losses,pct(p.lossShare)])), '',
 '## 이상치 — 추가 자동 수정 없음','',
 `- <35%: ${outliers.hard.join(', ')||'없음'}`,
 `- >85%: ${outliers.easy.join(', ')||'없음'}`, '',
 '## 재현','',
 '`pnpm exec tsx scripts/simulate-raid-stat-tuning.ts --runs 500 --workers 4`. 기존 multiplier / threshold 보고서를 덮어쓰지 않으며 실행 전후 해시를 검증한다. source·pool·policy 해시와 실행 manifest는 JSON metadata에 포함한다. CSV 요약/branch/phase 및 실제 전투별 데이터는 같은 파일명 prefix를 사용한다.',
];
writeFileSync(out+'.md',md.join('\n')+'\n');
writeFileSync(out+'.csv',csv([['boss','oldWR','thresholdWR','afterWR','deltaPP','avgTurns','baseHP','effectiveHP','effectiveMultiplier'],...groups.map(g=>[g.boss,g.original,g.before,g.after,g.delta,g.summary.avgTurns,g.baseHP,g.summary.effectiveHP,g.summary.effectiveMultiplier])]));
writeFileSync(out+'.branches.csv',csv([['boss','branch','battles','beforeWR','afterWR','avgTurns'],...branches.map(b=>[b.boss,b.branch,b.summary.battles,b.before,b.summary.winRate,b.summary.avgTurns])]));
writeFileSync(out+'.phases.csv',csv([['boss','phase','losses','lossShare'],...phases.map(p=>[p.boss,p.phase,p.losses,p.lossShare])]));
const keys=['bossId','index','floor','teamId','seed','route','branchSpecies','winner','turns','survivors','teamHP','lossPhase','bossPhaseHP','normalHP','phaseHP','phaseMaxHP','effectiveHP','effectiveMultiplier','observedPhases','protocolHash','bossIVs','bossTraining','rewardIVs','rewardTraining','rewardNature','rewardSpecies'] as const;
writeFileSync(out+'.battles.csv',csv([[...keys],...rows.map(r=>keys.map(k=>Array.isArray(r[k])?(r[k] as (number|string)[]).join('/'):typeof r[k]==='object'?JSON.stringify(r[k]):r[k]))]));
writeFileSync(out+'.json',JSON.stringify({metadata:{...metadata,battleDataHash:hash(out+'.battles.csv')},groups:groups.map(({stats,...group})=>group),profiles,branches,phases,outliers},null,2)+'\n');console.log(`Wrote ${out} — ${rows.length} battles`);
