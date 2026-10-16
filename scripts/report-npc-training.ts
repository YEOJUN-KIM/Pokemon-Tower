import Showdown from 'pokemon-showdown';
import {npcSamples,type NpcSample} from '../src/data/npc-samples';
import {sampleRankWeights,challengerRankWeights,type NpcRankWeights} from '../src/data/npc-ranks';
import {generateNpcEncounter,selectNpcMembers} from '../src/server/npc-encounters';
import {encounterPool,normalOpponentSpecies,encounterRandom} from '../src/server/opponent-team';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {statKeys} from '../src/data/training';
import {improveNpcMoves,npcAttackStyle,npcBuildIssues} from '../src/server/npc-builds';
import {mkdirSync,writeFileSync} from 'node:fs';
const seed:[number,number,number,number]=[17,29,43,71];
const cases=[...['youngster-balanced','fisherman-bulk','blackbelt-physical','psychic-setup','hiker-bulk'].flatMap(id=>[{id,rank:'normal' as const},{id,rank:'elite' as const}]),{id:'ace-setup',rank:'elite' as const},{id:'ace-setup',rank:'master' as const},{id:'veteran-balanced',rank:'elite' as const},{id:'veteran-balanced',rank:'master' as const}];
const encounters=[5,20,40].flatMap(floor=>cases.map(({id,rank})=>generateNpcEncounter(floor,seed,npcSamples.find(s=>s.id===id)!,rank,'basic')));
const buildExamples=[
 {name:'Ludicolo',before:['Surf','Leaf Storm','Swords Dance','Giga Drain']},
 {name:'Charizard',before:['Flamethrower','Air Slash','Dragon Dance','Focus Punch']},
 {name:'Ursaluna-Bloodmoon',before:['Blood Moon','Earth Power','Swords Dance','Moonblast']},
 {name:'Walrein',before:['Ice Beam','Surf','Swords Dance','Double-Edge']},
].map(p=>({...p,style:npcAttackStyle(p.name),elite:improveNpcMoves(p.name,p.before,'elite','setup'),master:improveNpcMoves(p.name,p.before,'master','setup')}));
const buildChecks=encounters.filter(e=>e.rank!=='normal').flatMap(e=>e.team.map(p=>({floor:e.floor,sample:e.sample.id,rank:e.rank,name:p.name,style:npcAttackStyle(p.name),issues:npcBuildIssues(p.name,p.moves)})));
const ratio=(w:NpcRankWeights)=>[w.normal,w.elite,w.master].map(v=>(v*100).toFixed(2)).join(' / ');
const concept=(s:NpcSample)=>s.teamConcept.mode==='specialty'?`${s.teamConcept.types.join('/')} ${s.teamConcept.requiredCount}마리`:s.teamConcept.mode;
const lines=['# NPC Rank · 컨셉 생성 검증','', '시드 [17,29,43,71], basic 룰. Rank는 비교용으로 명시했습니다. 평균 IV는 실제 팀 3마리의 18개 IV 평균, EV는 각 개체의 포인트입니다. 클래스 비율은 Normal/Elite/Master 순서입니다.','', '| 층 | Sample / Rank | 클래스 비율 | TeamConcept | 실제 타입 구성 | 평균 BST | 평균 IV | 개체별 EV | 도구 수 | fallback |','|---|---|---|---|---|---|---|---|---|---|'];
for(const e of encounters){
 const ivs=e.team.flatMap(p=>Object.values(p.profile!.ivs)),evs=e.team.map(p=>Object.values(p.profile!.evs).reduce((a,b)=>a+b,0));
 lines.push(`| ${e.floor} | ${e.sample.displayName} / ${e.rank} | ${ratio(e.sample.rankWeights)} | ${concept(e.sample)} | ${e.team.map(p=>Showdown.Dex.species.get(p.name).types.join('/')).join(' · ')} | ${(e.team.reduce((sum,p)=>sum+statKeys.reduce((n,k)=>n+Showdown.Dex.species.get(p.name).baseStats[k],0),0)/3).toFixed(2)} | ${(ivs.reduce((a,b)=>a+b,0)/ivs.length).toFixed(2)} | ${evs.join('/')} | ${e.team.filter(p=>p.item).length} | ${e.composition.fallback?'발생':'없음'} |`);
}
lines.push('','## Elite / Master 기술배치 평가','',
 '새 공통 Elite/Master 생성 시 기존 opponentMoves 결과에 보정 단계를 적용합니다. Normal과 기존 생성 경로는 그대로이며, 저장된 v1/v2 snapshot과 packed team을 다시 생성하지 않습니다. 종 구성·확률·보상·IV/EV 예산은 변경하지 않았습니다.',
 '',
 '- Physical/Special: 기본 Atk/SpA에 기본 특성 Huge Power/Pure Power의 공격 배율을 반영합니다. 비율이 1.2 이상이면 높은 쪽을 우선합니다. 근접한 경우 실제 실용 기술의 위력·명중·자속·능력치 점수로 선택하며, 해당 분류에 실용 공격기가 없으면 반대쪽을 사용합니다.',
 '- Mixed: 능력치 비율 1.1 이하이고, 서로 다른 두 자속 타입의 최상위 기술이 각각 물리/특수에 20% 넘는 이점이 있을 때만 허용합니다.',
 '- 강화기는 성향과 일치하고 강화받는 공격기가 최소 2개여야 합니다. Foul Play의 상대 공격 사용과 Body Press의 방어 사용을 구분합니다. 중복 강화·회복·상태 역할을 제한하고, 실용 공격 수단과 가능한 자속 공격기를 유지합니다. Ditto/Unown/Wobbuffet/Pyukumuku의 기존 특수 전술은 유지합니다.',
 '- Elite는 기존 기술 선호 점수 10을 유지하고 역할 중복을 감점합니다. Master는 기존 선호 점수를 2로 낮추고, 중복 공격 감점을 강화하며 세트 전체의 효과적인 타입 커버리지·복수 자속·강화 후 공격 수를 추가 평가합니다. 강화기를 강제하지 않으며 4공격도 선택합니다.',
 '- 위력뿐 아니라 명중·반동·공격 능력치 하락·지연/연속 고정·조건부 공격을 감안합니다. Focus Punch 등 지원 조건을 마련하지 않은 기술은 제외합니다. 지원기는 현재 TowerPolicy가 사용하는 기술로 한정합니다. 최종 4기술 조합은 Showdown으로 합법성을 확인합니다.',
 '',`검사 결과: 새 Elite/Master ${buildChecks.length}개체 중 일관성 문제 ${buildChecks.filter(p=>p.issues.length).length}개체. 반바지 소년의 기존 teamConcept은 이번 작업에서 변경하지 않았습니다.`,
 '', '### 사용자 제시 문제 사례 비교', '', '아래 이전 기술은 사용자 제시 사례이며, 이후는 동일 입력을 setup 전술로 보정한 결과입니다. 실제 층별 팀은 다음 상세 목록에 별도로 기록합니다.', '',
 '| 종 / 성향 | 이전 | Elite 이후 | Master 이후 |','|---|---|---|---|');
for(const p of buildExamples)lines.push(`| ${p.name} / ${p.style} | ${p.before.join(', ')} | ${p.elite.join(', ')} | ${p.master.join(', ')} |`);
lines.push('','### 지정 검토 대상: 5 / 20 / 40층','', '| 층 | Sample / Rank | 종 / 성향 / 결과 |','|---|---|---|');
for(const e of encounters.filter(e=>['ace-setup','veteran-balanced'].includes(e.sample.id)||['blackbelt-physical','psychic-setup'].includes(e.sample.id)&&e.rank==='elite'))lines.push(`| ${e.floor} | ${e.sample.displayName} / ${e.rank} | ${e.team.map(p=>`${p.name} (${npcAttackStyle(p.name)}; ${npcBuildIssues(p.name,p.moves).join(', ')||'정상'})`).join(' · ')} |`);
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
 writeFileSync('artifacts/reports/npc/npc-rank-samples.json',JSON.stringify({version:2,seed,rule:'basic',challengerRankWeights,samples:npcSamples,finalRankWeights:npcSamples.map(s=>({id:s.id,floor5:sampleRankWeights(s,5),floor20:sampleRankWeights(s,20),floor40:sampleRankWeights(s,40),challenger:sampleRankWeights(s,20,'challenger')})),encounters,buildExamples,buildChecks,fallback:{pool:fallbackPool,...fallback}},null,2)+'\n');
 console.log('Wrote NPC_RANK_SAMPLES.md and npc-rank-samples.json');
}else console.log(markdown);
