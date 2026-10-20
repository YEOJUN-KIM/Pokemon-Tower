import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {raidBossDefinitions} from '../src/data/raids';
import {statKeys} from '../src/data/training';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {createRaidSnapshot} from '../src/server/raid-events';
import {encounterRandom} from '../src/server/opponent-team';
import {runRaidSimulationJobs} from './simulate-raids';
import {simulationSeed,effectiveRaidHP,summarize,type SimulationRow} from './lib/raid-simulation';
import {csv} from './lib/raid-simulation-report';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const table=(head:string[],rows:unknown[][])=>['| '+head.join(' | ')+' |','| '+head.map(()=> '---').join(' | ')+' |',...rows.map(r=>'| '+r.join(' | ')+' |')].join('\n');
const fmt=(n:number|null|undefined)=>n==null?'N/A':n.toFixed(2);
const baselinePath='artifacts/reports/raid-final-baseline.json',baseline=read(baselinePath);
const tune2=read('artifacts/reports/raid-stat-tuned-2-endgame.json');
const seedBase=tune2.metadata.seedBase,targets=['mewtwo','zacian'],out='artifacts/reports/raid-final-endgame';
const protectedFiles=Object.fromEntries(readdirSync('artifacts/reports').filter(p=>/^raid-(winrate-|threshold-|stat-|final-(baseline|iv19)\.)/.test(p)).map(p=>['artifacts/reports/'+p,hash('artifacts/reports/'+p)]));
const sourceFiles:Record<string,string>={};
function walk(root:string){for(const e of readdirSync(root,{withFileTypes:true})){const p=root+'/'+e.name;if(e.isDirectory())walk(p);else sourceFiles[p]=hash(p);}}walk('src');
for(const boss of raidBossDefinitions){
 const before=baseline.definitions.find((b:{id:string})=>b.id===boss.id),after=structuredClone(boss);
 if(boss.id==='mewtwo'){
  assert.deepEqual(after.routes.map(r=>r.phases.map(p=>p.hpRatio)),[[.5,.5],[.5,.5]]);
  assert.ok(after.routes.every(r=>r.phases.every(p=>!p.buffs&&p.transformation!=='aura')));
  for(let i=0;i<after.routes.length;i++){
   const restored=after.routes[i].phases.map(p=>({...p,hpRatio:1/3}));
   assert.deepEqual(restored,before.routes[i].phases.slice(0,2));
   after.routes[i].phases=before.routes[i].phases;
  }
 }else if(boss.id==='zacian'){
  assert.equal(after.ivRule.protectedIv,0);assert.equal(after.battleTraining,'raid-zacian-final');
  after.ivRule=before.ivRule;after.battleTraining=before.battleTraining;
 }
 assert.deepEqual(after,before);
}
// Shared runtime, player model and all other data must be byte-equivalent to
// the Tune2 commit; normalize checkout newlines for Windows.
const changed=execFileSync('git',['diff','--name-only',baseline.commit,'--','src'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
assert.deepEqual(changed.sort(),['src/data/raid-training.ts','src/data/raids.ts']);
const stablePaths=['scripts/lib/raid-simulation.ts','scripts/lib/raid-simulation-player.ts','scripts/lib/raid-simulation-pool.ts','scripts/simulate-raids.ts'];
for(const p of stablePaths)assert.equal(readFileSync(p,'utf8').replaceAll('\r\n','\n'),execFileSync('git',['show',baseline.commit+':'+p],{encoding:'utf8'}).replaceAll('\r\n','\n'));
// Audit 9,000 saved inputs without running the other 18 bosses' battles.
const store=new TowerStore(':memory:');store.ensurePlayer('final-audit');
const run=store.battle(store.start('final-audit',starters,'basic')).run_id;
let untouchedSnapshots=0;
try{for(const boss of raidBossDefinitions.filter(b=>!targets.includes(b.id)))for(let index=0;index<500;index++){
 const floor=index%2?95:85,s=createRaidSnapshot(store.db,run,floor,encounterRandom(simulationSeed(`${seedBase}:bracket:endgame:${boss.id}:${index}:snapshot`)),{bossId:boss.id});
 const reward=Showdown.Teams.unpack(s.recruitTeam)![0],hp=effectiveRaidHP(s);
 const signature=[s.routeId,s.individual.ivs,s.individual.evs,reward.ivs??Object.fromEntries(statKeys.map(k=>[k,31])),reward.evs,reward.nature,reward.species,hp.normal,hp.phases,hp.phaseMax,s.phases.slice(1).map(p=>p.species)];
 assert.equal(digest(signature),baseline.untouchedRows[boss.id+':'+index].snapshotHash,boss.id+':'+index);untouchedSnapshots++;
}}finally{store.close();}
const started=Date.now();
const rows=await runRaidSimulationJobs({bossIds:targets,runs:500,seedBase,workers:2,floorBrackets:true,brackets:['endgame'],onProgress:(id,s)=>console.log(`${id}: ${s.filter(r=>r.won).length}/${s.length}`)});
assert.equal(rows.length,1000);
for(const r of rows){
 const before:SimulationRow=baseline.targetRows.find((p:SimulationRow)=>p.bossId===r.bossId&&p.index===r.index);
 for(const key of ['seed','floor','teamId','route','rewardIVs','rewardTraining','rewardNature','rewardSpecies','normalHP'] as const)assert.deepEqual(r[key],before[key]);
 if(r.bossId==='mewtwo'){assert.deepEqual(r.bossIVs,before.bossIVs);assert.deepEqual(r.bossTraining,before.bossTraining);}
 else for(const key of ['hp','def','spd'] as const){assert.equal(r.bossIVs![key],before.bossIVs![key]);assert.equal(r.bossTraining![key],before.bossTraining![key]);}
 assert.ok(statKeys.every(k=>r.rewardIVs![k]===31));assert.equal(statKeys.reduce((n,k)=>n+r.rewardTraining![k],0),66);
 assert.equal(r.phaseHP.length,2);assert.equal(r.phaseHP.reduce((a,b)=>a+b,0),r.effectiveHP);
}
for(const [p,h] of Object.entries({...protectedFiles,...sourceFiles}))assert.equal(hash(p),h,p);
const groups=targets.map(id=>{
 const sample=rows.filter(r=>r.bossId===id),prior=tune2.groups.find((g:{bossId:string})=>g.bossId===id);
 for(const floor of [85,95])assert.equal(sample.filter(r=>r.floor===floor).length,250);
 return {bossId:id,boss:raidBossDefinitions.find(b=>b.id===id)!.species,tune1:prior.tune1,tune2:prior.tune2,final:summarize(sample)};
});
const branches=['x','y'].map(route=>({route,summary:summarize(rows.filter(r=>r.bossId==='mewtwo'&&r.route===route))}));
const phases=groups.flatMap(g=>[1,2].map(phase=>{const losses=rows.filter(r=>r.bossId===g.bossId&&r.lossPhase===phase).length;return {boss:g.boss,phase,losses,share:100*losses/g.final.bossWins};}));
const metadata={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seedBase,totalBattles:1000,runsPerBoss:500,floors:[85,95],adjustments:2,revision:'User explicitly requested Zacian Atk/Spe IV0 after observing IV19 result; training34% retained',untouchedSnapshots,otherBossBattlesRerun:0,elapsedSeconds:(Date.now()-started)/1000,protectedFiles,sourceFiles,baselinePath};
const md=['# Raid final — Mewtwo / Zacian','',
 '1,000전: 두 보스 각 500전, 85/95층 각 250전. 동일 seed/player team/policy/AI. IV19 결과 후 사용자 명시 지시로 Zacian Atk/Spe를 IV0으로 변경했다. 그 외 추가 조정은 없다.','',
 '## 승률','',table(['Boss','Tune1','Tune2','Final'],groups.map(g=>[g.boss,fmt(g.tune1)+'%',fmt(g.tune2)+'%',fmt(g.final.winRate)+'%'])),'',
 'Mewtwo는 Tune2 IV23/육성43%를 유지하고 3 Phase → 2 Phase(.5/.5)로 변경했다. P3 Aura/Rank/메시지만 제거했고 Mega 메시지는 유지한다. 공용 Aura 코드는 유지한다.','',
 'Zacian 실제 전투의 Intrepid Sword는 최초 등장 때 공격+1을 한 번 적용했다. Crowned 및 synthetic switch 후에도 누적+1이며 중복 강화는 없다. 특성/폼 전환 로직은 수정하지 않았다. 먼저 전투 Atk/Spe IV19, 포인트34%에서23.6%를 측정했다. 이후 사용자 명시 지시에 따라 Atk/Spe IV0으로 변경하고 포인트34%는 유지했다. HP/Def/SpD는 Tune2와 같다. IV19 중간 결과는 raid-final-iv19.*에 보존한다.','',
 '## Mewtwo branches','',table(['Route','Runs','WR','Avg Turns'],branches.map(b=>[b.route,b.summary.battles,fmt(b.summary.winRate)+'%',fmt(b.summary.avgTurns)])),'',
 '## Phase loss','',table(['Boss','Phase','Losses','Share of losses'],phases.map(p=>[p.boss,p.phase,p.losses,fmt(p.share)+'%'])),'',
 '## Reward','', '모든 1,000개 보상 IV/포인트/성격/종이 Tune2와 동일하다. Mewtwo X: 6V/Jolly/Atk32 Spe32 HP2, Y: 6V/Timid/SpA32 Spe32 HP2. Zacian: 6V/Adamant/Atk32 Spe32 HP2. 기존 지급 구현은 수정하지 않았다.','',
 '## 보존 검증','',
 '- 다른18종 정의 전부 동일. Tune2 commit에서 공용 HP/clamp/변신/AI/player policy/team pool/보상/NPC/Shop 등 source 변경이 없는지 검사했다.',
 '- 다른18종 전투는 요청대로 재실행하지 않았다. 동일 seed 9,000개 snapshot의 route/IV/포인트/reward/HP/분기 signature가 Tune2 row와 일치한다. 실제 SimulationRow 전체 hash의 재측정 비교는 하지 않았다.',
 '- 이전 보고서를 덮어쓰지 않고 실행 전후 해시를 검증한다. 원시 battles.csv는 로컬 보존한다. npm run raid:simulate:final로 재실행한다.','',
 '## 종료 후보 판단','',
 `- Mewtwo >=25%: ${groups[0].final.winRate>=25?'충족':'미충족'}. Zacian >=30%: ${groups[1].final.winRate>=30?'충족':'미충족'}.`,
 '- 기준 미달이어도 이번 작업에서 재조정하지 않는다. 추가 변경 여부는 사용자가 결정한다.',
 ];
writeFileSync(out+'.md',md.join('\n')+'\n');
writeFileSync(out+'.csv',csv([['boss','tune1','tune2','final'],...groups.map(g=>[g.boss,g.tune1,g.tune2,g.final.winRate])]));
const keys=Object.keys(rows[0]) as (keyof SimulationRow)[];
writeFileSync(out+'.battles.csv',csv([keys,...rows.map(r=>keys.map(k=>typeof r[k]==='object'?JSON.stringify(r[k]):r[k]))]));
writeFileSync(out+'.json',JSON.stringify({metadata,groups,branches,phases},null,2)+'\n');
console.log(`Wrote ${out}: 1000 battles, ${untouchedSnapshots} unchanged snapshots`);
