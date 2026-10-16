import Showdown from 'pokemon-showdown';
import {npcSamples,type NpcSample} from '../src/data/npc-samples';
import {sampleRankWeights,challengerRankWeights,type NpcRankWeights} from '../src/data/npc-ranks';
import {generateNpcEncounter,selectNpcMembers} from '../src/server/npc-encounters';
import {encounterPool,normalOpponentSpecies,encounterRandom} from '../src/server/opponent-team';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {statKeys} from '../src/data/training';
import {mkdirSync,writeFileSync} from 'node:fs';
const seed:[number,number,number,number]=[17,29,43,71];
const cases=[...['youngster-balanced','fisherman-bulk','blackbelt-physical','psychic-setup','hiker-bulk'].flatMap(id=>[{id,rank:'normal' as const},{id,rank:'elite' as const}]),{id:'ace-setup',rank:'elite' as const},{id:'ace-setup',rank:'master' as const},{id:'veteran-balanced',rank:'elite' as const},{id:'veteran-balanced',rank:'master' as const}];
const encounters=[5,20,40].flatMap(floor=>cases.map(({id,rank})=>generateNpcEncounter(floor,seed,npcSamples.find(s=>s.id===id)!,rank,'basic')));
const ratio=(w:NpcRankWeights)=>[w.normal,w.elite,w.master].map(v=>(v*100).toFixed(2)).join(' / ');
const concept=(s:NpcSample)=>s.teamConcept.mode==='specialty'?`${s.teamConcept.types.join('/')} ${s.teamConcept.requiredCount}마리`:s.teamConcept.mode;
const lines=['# NPC Rank · 컨셉 생성 검증','', '시드 [17,29,43,71], basic 룰. Rank는 비교용으로 명시했습니다. 평균 IV는 실제 팀 3마리의 18개 IV 평균, EV는 각 개체의 포인트입니다. 클래스 비율은 Normal/Elite/Master 순서입니다.','', '| 층 | Sample / Rank | 클래스 비율 | TeamConcept | 실제 타입 구성 | 평균 BST | 평균 IV | 개체별 EV | 도구 수 | fallback |','|---|---|---|---|---|---|---|---|---|---|'];
for(const e of encounters){
 const ivs=e.team.flatMap(p=>Object.values(p.profile!.ivs)),evs=e.team.map(p=>Object.values(p.profile!.evs).reduce((a,b)=>a+b,0));
 lines.push(`| ${e.floor} | ${e.sample.displayName} / ${e.rank} | ${ratio(e.sample.rankWeights)} | ${concept(e.sample)} | ${e.team.map(p=>Showdown.Dex.species.get(p.name).types.join('/')).join(' · ')} | ${(e.team.reduce((sum,p)=>sum+statKeys.reduce((n,k)=>n+Showdown.Dex.species.get(p.name).baseStats[k],0),0)/3).toFixed(2)} | ${(ivs.reduce((a,b)=>a+b,0)/ivs.length).toFixed(2)} | ${evs.join('/')} | ${e.team.filter(p=>p.item).length} | ${e.composition.fallback?'발생':'없음'} |`);
}
lines.push('','## 실제 팀 상세','');
for(const e of encounters){
 lines.push(`### ${e.floor}층 ${e.sample.displayName} / ${e.rank}`,'',`- Sample: ${e.sample.id}, concept: ${concept(e.sample)}, 테마 ${e.composition.themeUsed}/${e.composition.themeRequired}, 후보 ${e.composition.themeAvailable}종, fallback ${e.composition.fallback}, itemSlots ${e.composition.itemSlots}`);
 for(const p of e.team)lines.push(`- ${p.name} (${Showdown.Dex.species.get(p.name).types.join('/')}): IV ${statKeys.map(k=>p.profile!.ivs[k]).join('/')} · EV ${statKeys.map(k=>p.profile!.evs[k]).join('/')} · ${p.item??'없음'} · ${p.moves.join(', ')}`);
 lines.push('');
}
lines.push('## 공통 Sample 전체 목록','','| ID | 표시명 | sprite | tactic | TeamConcept | 클래스 N/E/M % | minFloor | weight | pool |','|---|---|---|---|---|---|---|---|---|');
for(const s of npcSamples)lines.push(`| ${s.id} | ${s.displayName} | ${s.portrait} | ${s.tactic} | ${concept(s)} | ${ratio(s.rankWeights)} | ${s.minFloor} | ${s.weight} | ${s.pools.join(', ')} |`);
lines.push('','## 클래스별 최종 Rank 확률','','정규화: 클래스 확률 × 일반층 prior 또는 도전자 prior. 0은 유지합니다. 도전자 prior는 50/42/8이며 실제 최종 비율은 클래스마다 달라집니다.','', '| Sample | 일반 5층 N/E/M % | 일반 20층 N/E/M % | 일반 40층 N/E/M % | 도전자 N/E/M % |','|---|---|---|---|---|');
for(const s of npcSamples)lines.push(`| ${s.id} | ${ratio(sampleRankWeights(s,5))} | ${ratio(sampleRankWeights(s,20))} | ${ratio(sampleRankWeights(s,40))} | ${ratio(sampleRankWeights(s,20,'challenger'))} |`);
const bug=npcSamples.find(s=>s.id==='youngster-balanced')!,ordinary=encounterPool(5,CURRENT_PROGRESSION).filter(normalOpponentSpecies);
const bugs=ordinary.filter(n=>Showdown.Dex.species.get(n).types.includes('Bug')),other=ordinary.filter(n=>!bugs.includes(n));
const fallbackPool=[...bugs.slice(0,2),...other.slice(0,4)],fallback=selectNpcMembers(fallbackPool,bug,'elite',encounterRandom(seed));
lines.push('','## 후보 부족 fallback 재현','','5층 실제 풀의 부분집합으로 Bug 후보를 2종만 남긴 QA fixture입니다.','',`- 입력: ${fallbackPool.join(', ')}`,`- 출력: ${fallback.members.join(', ')}`,`- 테마 ${fallback.composition.themeUsed}/${fallback.composition.themeRequired}, available ${fallback.composition.themeAvailable}, fallback ${fallback.composition.fallback}. 상위 층 종은 추가하지 않았습니다.`,'');
const markdown=lines.join('\n');
if(process.argv.includes('--write')){
 mkdirSync('artifacts/reports/npc',{recursive:true});
 writeFileSync('artifacts/reports/npc/NPC_RANK_SAMPLES.md',markdown);
 writeFileSync('artifacts/reports/npc/npc-rank-samples.json',JSON.stringify({version:2,seed,rule:'basic',challengerRankWeights,samples:npcSamples,finalRankWeights:npcSamples.map(s=>({id:s.id,floor5:sampleRankWeights(s,5),floor20:sampleRankWeights(s,20),floor40:sampleRankWeights(s,40),challenger:sampleRankWeights(s,20,'challenger')})),encounters,fallback:{pool:fallbackPool,...fallback}},null,2)+'\n');
 console.log('Wrote NPC_RANK_SAMPLES.md and npc-rank-samples.json');
}else console.log(markdown);
