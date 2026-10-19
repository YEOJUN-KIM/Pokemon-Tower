import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {availableParallelism} from 'node:os';
import {raidBossDefinitions} from '../src/data/raids';
import {engineVersion,FORMAT} from '../src/battle/run';
import {runRaidSimulationJobs} from './simulate-raids';
import {summarize,mean} from './lib/raid-simulation';
import {simulationTeams} from './lib/raid-simulation-pool';
import {csv} from './lib/raid-simulation-report';

const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const n=(x:number|null|undefined)=>x===null||x===undefined?'N/A':x.toFixed(2);
const pct=(x:number|null|undefined)=>x===null||x===undefined?'N/A':n(x)+'%';
const table=(headers:string[],rows:unknown[][])=>['| '+headers.join(' | ')+' |','| '+headers.map(()=> '---').join(' | ')+' |',...rows.map(row=>'| '+row.join(' | ')+' |')].join('\n');
const args=process.argv.slice(2);let runs=500,workers=Math.min(4,availableParallelism());
for(let i=0;i<args.length;i++){if(!['--runs','--workers'].includes(args[i])||!args[i+1])throw Error('Expected --runs or --workers');const flag=args[i++],value=Number(args[i]);if(flag==='--runs')runs=value;else workers=value;}
if(!Number.isSafeInteger(runs)||runs<1||!Number.isSafeInteger(workers)||workers<1||workers>32)throw Error('Invalid runs/workers');
const out=runs===500?'artifacts/reports/raid-threshold-endgame':`.data/raid-threshold-smoke-${runs}`;
const beforePath='artifacts/reports/raid-winrate-by-floor.json',before=JSON.parse(readFileSync(beforePath,'utf8'));
// Preserve all old reports, including raw per-battle local datasets.
const protectedFiles=Object.fromEntries(readdirSync('artifacts/reports').filter(p=>p.startsWith('raid-winrate-simulation.')||p.startsWith('raid-winrate-by-floor.')).map(p=>['artifacts/reports/'+p,hash('artifacts/reports/'+p)]));
const sources:string[]=[];function walk(root:string){for(const e of readdirSync(root,{withFileTypes:true})){const p=resolve(root,e.name);if(e.isDirectory())walk(p);else sources.push(p);}}walk('src');
const sourceFiles=Object.fromEntries(sources.sort().map(p=>[relative(process.cwd(),p).replaceAll('\\','/'),hash(p)]));
if(before.metadata.poolHash!==digest(simulationTeams))throw Error('Player team pool changed');
const unchangedPolicy='scripts/lib/raid-simulation-player.ts',unchangedPool='scripts/lib/raid-simulation-pool.ts';
for(const p of [unchangedPolicy,unchangedPool])if(before.metadata.simulationFiles[p]!==hash(p))throw Error(`Player model changed: ${p}`);
const started=Date.now();let completed=0;
const rows=await runRaidSimulationJobs({bossIds:raidBossDefinitions.map(b=>b.id),runs,seedBase:before.metadata.seedBase,workers,floorBrackets:true,brackets:['endgame'],onProgress:(id,sample)=>{console.log(`${++completed}/${raidBossDefinitions.length} ${id}: ${sample.filter(r=>r.won).length}/${sample.length}; ${((Date.now()-started)/1000).toFixed(1)}s`);}});
for(const [p,h]of Object.entries(protectedFiles))if(hash(p)!==h)throw Error('Before report changed');
for(const [p,h]of Object.entries(sourceFiles))if(hash(p)!==h)throw Error('Source changed during simulation');
const groups=raidBossDefinitions.map(boss=>{
 const sample=rows.filter(r=>r.bossId===boss.id),old=before.endgame.find((g:{bossId:string})=>g.bossId===boss.id);
 if(sample.length!==runs||sample.some(r=>r.floor!==85&&r.floor!==95))throw Error('Invalid Endgame sample');
 const summary=summarize(sample);
 return {bossId:boss.id,boss:boss.species,hpMode:boss.hpMode,before:old.summary.winRate,after:summary.winRate,delta:summary.winRate-old.summary.winRate,summary,baseHP:mean(sample.map(r=>r.normalHP)),phaseMaxHP:sample[0].phaseMaxHP,phaseBudgets:sample[0].phaseHP};
}).sort((a,b)=>a.after-b.after||a.bossId.localeCompare(b.bossId));
const branches=groups.flatMap(g=>{
 const sample=rows.filter(r=>r.bossId===g.bossId),boss=raidBossDefinitions.find(b=>b.id===g.bossId)!;
 const types=boss.routes.some(r=>r.phases.some(p=>p.randomBranch)),names=types?[...new Set(sample.flatMap(r=>r.branchSpecies))]:boss.routes.length>1?[...new Set(sample.map(r=>r.route))]:[];
 return names.sort().map(branch=>{const subset=sample.filter(r=>types?r.branchSpecies.includes(branch):r.route===branch),old=before.branches.find((b:{bossId:string;bracket:string;branch:string})=>b.bossId===g.bossId&&b.bracket==='endgame'&&b.branch===branch);return {boss:g.boss,bossId:g.bossId,branch,kind:types?'typePresence':'route',before:old?.summary.winRate??null,summary:summarize(subset)};});
});
const phases=groups.flatMap(g=>Array.from({length:rows.find(r=>r.bossId===g.bossId)!.phaseHP.length},(_,i)=>{const losses=rows.filter(r=>r.bossId===g.bossId&&r.lossPhase===i+1).length;return {boss:g.boss,phase:i+1,losses,lossShare:g.summary.bossWins?100*losses/g.summary.bossWins:null};}));
const outliers={easy:groups.filter(g=>g.after>85).map(g=>g.boss),hard:groups.filter(g=>g.after<40).map(g=>g.boss),branchGaps:groups.flatMap(g=>{const b=branches.filter(b=>b.bossId===g.bossId&&b.kind==='route');const gap=b.length>1?Math.max(...b.map(v=>v.summary.winRate))-Math.min(...b.map(v=>v.summary.winRate)):0;return gap>15?[{boss:g.boss,gap}]:[];})};
const metadata={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),engineVersion,format:FORMAT,runsPerBoss:runs,totalBattles:rows.length,seedBase:before.metadata.seedBase,bracket:'endgame',floors:[85,95],workers,elapsedSeconds:(Date.now()-started)/1000,beforePath,beforeHash:hash(beforePath),protectedFiles,sourceFiles,poolHash:digest(simulationTeams),policyHash:hash(unchangedPolicy),raidDefinitionsHash:digest(raidBossDefinitions)};
mkdirSync(out.startsWith('.data/')?'.data':'artifacts/reports',{recursive:true});
const md=[
 '# Raid Threshold HP — Endgame first measurement','',
 `기준 커밋 \`${metadata.commit}\`에서 HP 구조만 이식한 첫 결과다. **${rows.length.toLocaleString()}전**, 보스별 ${runs}전, 85/95층 균등. Player policy·팀·육성·아이템·Boss AI·기술·특성·보상·등장 조건을 유지했다. 목표 승률에 맞춘 추가 조정이나 Rank Up은 하지 않았다.`, '',
 '## 구현','',
 '- 구형 스냅샷은 hpMode가 없으므로 기존 독립 Phase HP pool과 raidHpMultiplier로 실행한다. 새 스냅샷은 hpMode=threshold-v1이며 multiplier를 저장·적용하지 않는다. 등록 데이터의 옛 multiplier 필드는 legacy 참고값으로만 남긴다.',
 '- 같은 개체 하나가 기본 native Max HP 100%로 시작한다. hpRatio를 누적한 남은 바 비율을 경계로 사용한다. 2 Phase는 50%, 3 Phase는 기존 .34/.33/.33 또는 Mewtwo의 1/3, 4 Phase는 75/50/25%다.',
 '- 실제 Pokemon.damage 및 직접 faint 효과에서 경계까지 피해를 제한한다. 다단 공격과 반동을 포함한 하나의 action이 끝나면 한 번만 전환한다. 초과 피해는 버리고 다음 Phase에 전달하지 않는다. 잔여 스케줄의 이미 선택한 행동은 유지한다.',
 '- 동일 Pokemon의 상태·랭크·volatile을 유지한다. 새 Phase의 정상 기술/특성/장비/폼을 적용하고 native Max HP에 이전 HP 비율을 반올림해 이어간다. 새 입장이나 추가 생명을 만들지 않는다. Mewtwo Aura의 기존 공격 계열+1·Speed+1은 유지한다.',
 '- G-Max는 실제 native 2배만 적용하고 persistent를 유지한다. Complete/Mega Zygarde 및 Stellar Terapagos는 실제 폼 HP로 resize한다. Terapagos 최초 Tera Shift와 native Stellar 동작을 재사용한다.',
 '- Volcarona는 hpMode=replacement-v1이다. P1을 완전 KO한 뒤 저장된 Slither Wing/Iron Moth P2가 native HP 100%로 입장한다. 실제 P2 보상 정책도 유지한다. Hoopa는 별도 상향하지 않았다.',
 '- 실제 기본 룰 Lv50, 기존 Endgame IV25/포인트50·일반 팀 20개·일반 아이템 가정이다. seed base와 bracket/index 도메인은 이전 Endgame과 같아 같은 팀·층·초기 RNG 조건을 비교한다. 전투가 달라지면서 이후 damage RNG 소비는 달라질 수 있다. 사람의 실제 승률을 측정한 값은 아니다.', '',
 '## Endgame before / after','',table(['Boss','Before WR','After WR','Delta (pp)','Avg Turns','Effective HP x'],groups.map(g=>[g.boss,pct(g.before),pct(g.after),n(g.delta),n(g.summary.avgTurns),n(g.summary.effectiveMultiplier)])),'',
 '## Native HP budget','',
 'Base HP는 같은 IV/포인트의 기본종 정상 HP다. Effective Total은 회복과 경계에서 버린 과잉 피해를 제외한 HP interval 합이다. 폼 변경 시 최대 HP가 커지면 현재 비율을 유지해 증가한 실제 HP만 포함한다. Phase Max/interval은 대표 첫 스냅샷이며 Total/Multiplier는 전체 표본 평균이다. Volcarona는 두 별도 종 native HP 합이다.','',
 table(['Boss','Base HP','Native Phase Max HP','Phase HP intervals','Effective Total HP','Effective Multiplier'],groups.map(g=>[g.boss,n(g.baseHP),g.phaseMaxHP?.join(' / '),g.phaseBudgets.join(' / '),n(g.summary.effectiveHP),n(g.summary.effectiveMultiplier)])),'',
 '## Random branches','',
 'Arceus의 타입별 presence는 P2/P3가 겹쳐 합계가 보스 전투 수의 2배다. 작은 타입별 표본은 참고용이다.','',
 table(['Boss','Branch','Runs','Before WR','After WR','Avg Turns'],branches.map(b=>[b.boss,b.branch,b.summary.battles,pct(b.before),pct(b.summary.winRate),n(b.summary.avgTurns)])),'',
 '## Endgame Phase loss','',table(['Boss','Phase','Losses','Loss Share'],phases.map(p=>[p.boss,p.phase,p.losses,pct(p.lossShare)])),'',
 '## 이상치 — 이번 작업에서는 기록만','',
 `- After WR >85%: ${outliers.easy.join(', ')||'없음'}`,
 `- After WR <40%: ${outliers.hard.join(', ')||'없음'}`,
 `- Route WR gap >15pp: ${outliers.branchGaps.map(g=>g.boss+' '+n(g.gap)+'pp').join(', ')||'없음'}`, '',
 '## 파일','',
 '`scripts/simulate-raid-threshold.ts --runs 500`으로 같은 측정을 실행한다. 기존 simulateRaid/runBattle/worker를 사용하고 원래 결과 파일의 실행 전후 해시를 검사한다. `.csv`는 비교 요약, `.branches.csv`와 `.phases.csv`는 세부 표, `.battles.csv`는 seed·팀·층·Phase native HP·budget·프로토콜 해시 원본, `.json`은 전체 집계와 manifest다. 원시 대용량 CSV는 로컬 결과물이다.',
];
writeFileSync(out+'.md',md.join('\n')+'\n');
writeFileSync(out+'.csv',csv([['boss','beforeWR','afterWR','deltaPP','avgTurns','baseHP','effectiveHP','effectiveMultiplier'],...groups.map(g=>[g.boss,g.before,g.after,g.delta,g.summary.avgTurns,g.baseHP,g.summary.effectiveHP,g.summary.effectiveMultiplier])]));
writeFileSync(out+'.branches.csv',csv([['boss','branch','battles','beforeWR','afterWR','avgTurns'],...branches.map(b=>[b.boss,b.branch,b.summary.battles,b.before,b.summary.winRate,b.summary.avgTurns])]));
writeFileSync(out+'.phases.csv',csv([['boss','phase','losses','lossShare'],...phases.map(p=>[p.boss,p.phase,p.losses,p.lossShare])]));
const keys=['bossId','index','floor','teamId','seed','route','branchSpecies','winner','turns','survivors','teamHP','lossPhase','bossPhaseHP','normalHP','phaseHP','phaseMaxHP','effectiveHP','effectiveMultiplier','observedPhases','protocolHash'] as const;
writeFileSync(out+'.battles.csv',csv([[...keys],...rows.map(r=>keys.map(k=>Array.isArray(r[k])?(r[k] as (number|string)[]).join('/'):r[k]))]));
writeFileSync(out+'.json',JSON.stringify({metadata,groups,branches,phases,outliers},null,2)+'\n');console.log(`Wrote ${out} — ${rows.length} battles`);
