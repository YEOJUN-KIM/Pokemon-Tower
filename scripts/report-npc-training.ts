import {npcSamples} from '../src/data/npc-samples';
import {npcRankTraining,rankWeights,challengerRankWeights,type NpcRank} from '../src/data/npc-ranks';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import {statKeys} from '../src/data/training';
import {mkdirSync,writeFileSync} from 'node:fs';
const seed:[number,number,number,number]=[17,29,43,71];
const cases=[['youngster-balanced','normal'],['ace-setup','elite'],['veteran-balanced','master']] as const;
const encounters=[5,20,40].flatMap(floor=>cases.map(([id,rank])=>generateNpcEncounter(floor,seed,npcSamples.find(s=>s.id===id)!,rank,'basic')));
const lines=['# NPC Rank 생성 검증','', '시드 [17,29,43,71], basic 룰. 평균 IV는 실제 팀 3마리의 18개 IV 평균, EV는 각 포켓몬의 총 포인트입니다.','', '| 층 | Sample | Rank | IV 범위 | 팀 평균 IV | 개체별 EV 합계 | 도구 |','|---|---|---|---|---|---|---|'];
for(const e of encounters){
 const ivs=e.team.flatMap(p=>Object.values(p.profile!.ivs)),evs=e.team.map(p=>Object.values(p.profile!.evs).reduce((a,b)=>a+b,0));
 lines.push(`| ${e.floor} | ${e.sample.displayName} | ${e.rank} | ${e.training.ivRange.join('~')} | ${(ivs.reduce((a,b)=>a+b,0)/ivs.length).toFixed(2)} | ${evs.join('/')} | ${e.team.map(p=>p.item??'없음').join(', ')} |`);
}
lines.push('','## 실제 팀 상세','');
for(const e of encounters){
 lines.push(`### ${e.floor}층 ${e.sample.displayName} / ${e.rank}`,'');
 for(const p of e.team)lines.push(`- ${p.name}: IV ${statKeys.map(k=>p.profile!.ivs[k]).join('/')} · EV ${statKeys.map(k=>p.profile!.evs[k]).join('/')} · ${p.item??'없음'} · ${p.moves.join(', ')}`);
 lines.push('');
}
lines.push('## 공통 Sample 전체 목록','','| ID | 표시명 | sprite | tactic | specialty | defaultRank | minFloor | weight | pool |','|---|---|---|---|---|---|---|---|---|');
for(const s of npcSamples)lines.push(`| ${s.id} | ${s.displayName} | ${s.portrait} | ${s.tactic} | ${s.specialty??'혼합'} | ${s.defaultRank} | ${s.minFloor} | ${s.weight} | ${s.pools.join(', ')} |`);
lines.push('','## 일반층 Rank 분포','','| 층 | Normal | Elite | Master |','|---|---|---|---|');
for(const floor of [1,5,20,40,50,60,100]){const w=rankWeights(floor);lines.push(`| ${floor} | ${(w.normal*100).toFixed(2)}% | ${(w.elite*100).toFixed(2)}% | ${(w.master*100).toFixed(2)}% |`);}
lines.push('','도전자 Rank 분포: Normal 50%, Elite 42%, Master 8%. Sample 선택 뒤 각 후보에 독립 적용합니다.','');
const markdown=lines.join('\n');
if(process.argv.includes('--write')){
 mkdirSync('artifacts/reports/npc',{recursive:true});
 writeFileSync('artifacts/reports/npc/NPC_RANK_SAMPLES.md',markdown);
 writeFileSync('artifacts/reports/npc/npc-rank-samples.json',JSON.stringify({seed,rule:'basic',challengerRankWeights,encounters},null,2)+'\n');
 console.log('Wrote NPC_RANK_SAMPLES.md and npc-rank-samples.json');
}else console.log(markdown);
