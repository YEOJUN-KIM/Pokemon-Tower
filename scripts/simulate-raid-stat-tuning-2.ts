import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {raidBossDefinitions} from '../src/data/raids';
import {raidBattleTrainingProfiles} from '../src/data/raid-training';
import {statKeys,trainedStat} from '../src/data/training';
import {runRaidSimulationJobs} from './simulate-raids';
import {summarize,type SimulationRow} from './lib/raid-simulation';
import {simulationTeams} from './lib/raid-simulation-pool';
import {csv} from './lib/raid-simulation-report';

const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const normalizedHash=(p:string)=>createHash('sha256').update(readFileSync(p,'utf8').replaceAll('\r\n','\n')).digest('hex');
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const fmt=(n:number|null|undefined)=>n==null?'N/A':n.toFixed(2);
const table=(headers:string[],rows:unknown[][])=>['| '+headers.join(' | ')+' |','| '+headers.map(()=> '---').join(' | ')+' |',...rows.map(r=>'| '+r.join(' | ')+' |')].join('\n');
const vec=(v:Record<string,number>)=>statKeys.map(k=>v[k]).join('/');
const changed=['mewtwo','zacian','rayquaza','kyogre','groudon'];
const args=process.argv.slice(2);let runs=500;
if(args.length){if(args.length!==2||args[0]!=='--runs')throw Error('Expected --runs N');runs=Number(args[1]);}
if(!Number.isSafeInteger(runs)||runs<1||runs>500)throw Error('Invalid runs');
const out=runs===500?'artifacts/reports/raid-stat-tuned-2-endgame':`.data/raid-stat-tuned-2-smoke-${runs}`;
const old=read('artifacts/reports/raid-winrate-by-floor.json');
const threshold=read('artifacts/reports/raid-threshold-endgame.json');
const tune1=read('artifacts/reports/raid-stat-tuned-endgame.json');
const baselinePath='artifacts/reports/raid-stat-tuned-2-baseline.json',baseline=read(baselinePath);
const definitions=baseline.definitions;
for(const boss of raidBossDefinitions){
 if(!changed.includes(boss.id)&&digest(boss)!==digest(definitions.find((b:{id:string})=>b.id===boss.id)))throw Error(`Untargeted definition changed: ${boss.id}`);
 const actual=baseline.groups.find((g:{bossId:string})=>g.bossId===boss.id).summary.winRate;
 if(actual!==tune1.groups.find((g:{bossId:string})=>g.bossId===boss.id).after)throw Error(`Tune1 replay mismatch: ${boss.id}`);
}
const protectedFiles=Object.fromEntries(readdirSync('artifacts/reports').filter(p=>/^raid-(winrate-|threshold-endgame\.|stat-tuned-endgame\.)/.test(p)).map(p=>['artifacts/reports/'+p,hash('artifacts/reports/'+p)]));
protectedFiles[baselinePath]=hash(baselinePath);
const sourceFiles:Record<string,string>={};
function walk(root:string){for(const e of readdirSync(root,{withFileTypes:true})){const p=root+'/'+e.name;if(e.isDirectory())walk(p);else sourceFiles[p]=hash(p);}}walk('src');
for(const p of ['scripts/lib/raid-simulation-player.ts','scripts/lib/raid-simulation-pool.ts'])if(normalizedHash(p)!==old.metadata.simulationFiles[p])throw Error('Player model changed');
if(digest(simulationTeams)!==old.metadata.poolHash)throw Error('Pool changed');
const started=Date.now();let done=0;
const rows=await runRaidSimulationJobs({bossIds:raidBossDefinitions.map(b=>b.id),runs,seedBase:tune1.metadata.seedBase,workers:4,floorBrackets:true,brackets:['endgame'],onProgress:(id,s)=>console.log(`${++done}/20 ${id} ${s.filter(r=>r.won).length}/${s.length}`)});
writeFileSync('.data/raid-tune2-after-battles.json',JSON.stringify(rows));
let unchangedBattles=0;
for(const row of rows){
 const prev=baseline.rows[row.bossId+':'+row.index];
 const paired=['seed','floor','teamId','route','branchSpecies','rewardIVs','rewardTraining','rewardNature','rewardSpecies'].map(k=>row[k as keyof SimulationRow]);
 if(digest(paired)!==prev.pairedHash)throw Error('Paired input/reward changed: '+row.bossId+'/'+row.index);
 if(!changed.includes(row.bossId)){if(digest(row)!==prev.rowHash)throw Error('Untargeted battle changed: '+row.bossId+'/'+row.index);unchangedBattles++;}
 if(!statKeys.every(k=>row.rewardIVs![k]===31)||statKeys.reduce((n,k)=>n+row.rewardTraining![k],0)!==66)throw Error('Reward weakened');
 if(row.phaseHP.reduce((a,b)=>a+b,0)!==row.effectiveHP||row.observedPhases.some((hp,i)=>hp!=null&&hp!==row.phaseMaxHP![i]))throw Error('HP regression: '+row.bossId+'/'+row.index);
}
for(const [p,h]of Object.entries({...protectedFiles,...sourceFiles}))if(hash(p)!==h)throw Error('File changed during run: '+p);
const groups=raidBossDefinitions.map(b=>{
 const sample=rows.filter(r=>r.bossId===b.id),first=tune1.groups.find((g:{bossId:string})=>g.bossId===b.id),summary=summarize(sample);
 if(runs===500&&[85,95].some(f=>sample.filter(r=>r.floor===f).length!==250))throw Error('Floor count mismatch');
 return {bossId:b.id,boss:b.species,old:first.original,threshold:first.before,tune1:first.after,tune2:summary.winRate,delta:summary.winRate-first.after,summary};
}).sort((a,b)=>a.tune2-b.tune2);
const phases=groups.flatMap(g=>raidBossDefinitions.find(b=>b.id===g.bossId)!.routes[0].phases.map((_,i)=>{
 const losses=rows.filter(r=>r.bossId===g.bossId&&r.lossPhase===i+1).length,previous=tune1.phases.find((p:{boss:string;phase:number})=>p.boss===g.boss&&p.phase===i+1);
 return {boss:g.boss,phase:i+1,losses,share:g.summary.bossWins?100*losses/g.summary.bossWins:0,tune1Losses:previous.losses,tune1Share:previous.lossShare};
}));
const mewtwoBranches=['x','y'].map(route=>({route,tune1:baseline.mewtwoBranches.find((b:{route:string})=>b.route===route).summary,tune2:summarize(rows.filter(r=>r.bossId==='mewtwo'&&r.route===route))}));
const profiles=raidBossDefinitions.filter(b=>changed.includes(b.id)).flatMap(b=>b.routes.flatMap(route=>[85,95].flatMap(floor=>{
 const r=rows.find(r=>r.bossId===b.id&&r.route===route.id&&r.floor===floor);if(!r)return [];
 const prev=baseline.samples[r.bossId+':'+r.index];
 const phaseStats=route.phases.map(phase=>({species:phase.species,boosts:phase.buffs??{},stats:Object.fromEntries(statKeys.map(k=>[k,trainedStat(Showdown.Dex.species.get(phase.species).baseStats[k],r.bossIVs![k],r.bossTraining![k],k,route.recruit.nature)]))}));
 return [{boss:b.species,bossId:b.id,route:route.id,floor,index:r.index,seed:r.seed,ivs:r.bossIVs,points:r.bossTraining,beforeIVs:prev.bossIVs,beforePoints:prev.bossTraining,phaseStats,rewardIVs:r.rewardIVs,rewardNature:r.rewardNature,rewardPoints:r.rewardTraining}];
})));
const metadata={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),totalBattles:rows.length,runsPerBoss:runs,seedBase:tune1.metadata.seedBase,floors:[85,95],adjustments:1,elapsedSeconds:(Date.now()-started)/1000,protectedFiles,sourceFiles,unchangedBattles,poolHash:digest(simulationTeams),trainingProfiles:raidBattleTrainingProfiles,beforeBattlesHash:baseline.rawDataHash,baselinePath,baselineHash:hash(baselinePath)};
const summaryTable=table(['Boss','Old','Threshold','Tune1','Tune2','Delta pp'],groups.map(g=>[g.boss,...[g.old,g.threshold,g.tune1,g.tune2].map(n=>fmt(n)+'%'),fmt(g.delta)]));
const md=['# Raid stat tuning 2 — one adjustment','',`${rows.length} battles. 20 bosses × ${runs}; 85/95층 각 250전(500전 실행). baseline ${metadata.commit}. 같은 seed/player pool/policy/AI.`, '',
 '## 승률','',summaryTable,'',
 '## 조정값','',
 '보호 IV는 랜덤값이 아닌 지정 보장값이다. Mewtwo 23/23, Zacian 21/21, Rayquaza 24/24, Kyogre SpA24, Groudon Atk25. Kyogre/Groudon Speed는 기존 비보호 추첨(무작위 31 슬롯에 선택될 가능성 포함)을 유지하며 Perfect를 보장하지 않는다. HP 하한16, HP/Def/SpD 포인트 보존. 기존 IV 추첨 순서를 유지한 뒤 보호 핵심값만 덮어쓰므로 다른 IV와 이후 RNG는 동일하다. perfect는 기존 selection slot 수이며 지정 IV가 있으면 실제 31 개수와 다르다.','',
 table(['Boss','Core IV Before → After','Training elite ratio Before → After'],[['Mewtwo','Atk(X)/SpA(Y), Spe:31 →23','57% →43%'],['Zacian','Atk/Spe:31 →21','63% →43%'],['Rayquaza','Atk/Spe:31 →24','57% →48%'],['Kyogre','SpA:31 →24; Spe random unchanged','63% →50%'],['Groudon','Atk:31 →25; Spe random unchanged','63% →54%']]),'',
 '## 실제 battle/reward 표본','', '벡터 순서 HP/Atk/Def/SpA/SpD/Spe. 각 route/층의 첫 실제 seed 표본. 모든 10,000전 reward를 검사했다.','',
 table(['Boss/Route/Floor/Index','Battle IV','Battle Points before → after','Reward IV','Nature','Reward Points'],profiles.map(p=>[`${p.boss}/${p.route}/${p.floor}/${p.index}`,vec(p.ivs!),vec(p.beforePoints!)+' → '+vec(p.points!),vec(p.rewardIVs!),p.rewardNature,vec(p.rewardPoints!)])),'',
 '## Lv50 final native stats','', '성격·포인트 반영 후, Phase entry rank와 공격 중 Bulk Up/Calm Mind/특성 boost 이전 값. 실제 버프는 JSON boosts 필드와 기존 엔진을 사용한다.','',
 table(['Boss/Route/Floor','Phase / Form','HP/Atk/Def/SpA/SpD/Spe','Entry boosts'],profiles.flatMap(p=>p.phaseStats.map((phase,i)=>[`${p.boss}/${p.route}/${p.floor}`,`${i+1} ${phase.species}`,vec(phase.stats),JSON.stringify(phase.boosts)]))),'',
 '## Mewtwo X/Y','',table(['Route','Runs','Tune1','Tune2'],mewtwoBranches.map(b=>[b.route,b.tune2.battles,fmt(b.tune1.winRate)+'%',fmt(b.tune2.winRate)+'%'])),'',
 'P3 Aura는 공격계+1을 유지하고 Speed+1만 제거했다. Phase 구조·메시지는 같다.','',
 '## Phase loss','', 'Share는 해당 보스 전체 패배 중 각 Phase 비율이다. IV/육성/Aura를 함께 바꿨으므로 Speed 제거만의 독립 효과로 해석하지 않는다.','',
 table(['Boss','Phase','Tune1 losses/share','Tune2 losses/share'],phases.filter(p=>changed.includes(groups.find(g=>g.boss===p.boss)!.bossId)).map(p=>[p.boss,p.phase,`${p.tune1Losses} / ${fmt(p.tune1Share)}%`,`${p.losses} / ${fmt(p.share)}%`])),'',
 '## 검증과 다음 판단','',
 `- 변경하지 않은 15종의 정의와 ${unchangedBattles}개 전투 전체 row(IV/포인트/프로토콜/결과)가 baseline replay와 동일하다. baseline replay 승률도 기존 Tune1 20종과 일치한다.`,
 '- 모든 전투의 seed·층·팀·분기·reward IV/포인트/성격/종을 baseline replay와 비교했다. 이전 보고서 해시를 보존했다. 원시 battles.csv는 로컬 결과물이다.',
 `- Mewtwo <20%: ${groups.find(g=>g.bossId==='mewtwo')!.tune2<20?'해당. 다음 단계에서 P3 공격계+1 제거 검토 가능. 이번에는 유지.':'해당 없음.'}`,
 `- Zacian <25%: ${groups.find(g=>g.bossId==='zacian')!.tune2<25?'해당. 다음 단계에서 Intrepid Sword/Crowned 진입 방식 검토 가능. 이번에는 유지.':'해당 없음.'}`,
 '- 목표값을 위한 반복 조정은 하지 않았다. 재실행: npm run raid:simulate:stats2 -- --runs 500. 비교용 baseline은 raid-stat-tuned-2-baseline.json에 정의·표본·전투별 해시로 보존한다. 원시 데이터는 .data에 보존한다.',
 ];
writeFileSync(out+'.md',md.join('\n')+'\n');
writeFileSync(out+'.csv',csv([['boss','old','threshold','tune1','tune2','deltaPP'],...groups.map(g=>[g.boss,g.old,g.threshold,g.tune1,g.tune2,g.delta])]));
writeFileSync(out+'.phases.csv',csv([['boss','phase','tune1Losses','tune1Share','losses','share'],...phases.map(p=>[p.boss,p.phase,p.tune1Losses,p.tune1Share,p.losses,p.share])]));
writeFileSync(out+'.branches.csv',csv([['boss','route','runs','tune1','tune2'],...mewtwoBranches.map(b=>['Mewtwo',b.route,b.tune2.battles,b.tune1.winRate,b.tune2.winRate])]));
const keys=Object.keys(rows[0]) as (keyof SimulationRow)[];
writeFileSync(out+'.battles.csv',csv([keys, ...rows.map(r=>keys.map(k=>typeof r[k]==='object'?JSON.stringify(r[k]):r[k]))]));
writeFileSync(out+'.json',JSON.stringify({metadata:{...metadata,battleDataHash:hash(out+'.battles.csv')},groups,profiles,phases,mewtwoBranches},null,2)+'\n');
console.log(`Wrote ${out}: ${rows.length} battles, ${unchangedBattles} unchanged rows`);
