import {writeFileSync} from 'node:fs';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {pokemonName} from '../src/web/catalog';

const rows=trainerCatalog.map(sample=>{
  const floor=Math.max(10,sample.minFloor),team=generateOpponentTeam(floor,[1,2,3,4],[],null,sample);
  return {...sample,exampleFloor:floor,exampleTeam:team};
});
writeFileSync('artifacts/reports/npc/trainer-samples.json',JSON.stringify({seed:[1,2,3,4],samples:rows},null,2)+'\n');
const header=`# 트레이너 샘플 목록\n\n총 ${rows.length}종: 공용 일반·엘리트·혼합 39종, 네임드 ${rows.filter(s=>s.kind==='named').length}개 배치 샘플. 같은 인물의 지역/직급별 샘플은 별도 ID다. 새 도전은 1~9세대 중 하나를 추첨하고 관장·사천왕급·챔피언·빌런 조직을 같은 테마로 유지한다. 포켓몬 세대는 제한하지 않는다. 세부 배치는 [세대 테마](../docs/REGIONAL_THEMES.md)를 따른다.\n\n대표 1마리 고정 + 파트너 2마리 가중 추첨, 합법 기술·중복 없는 도구를 사용한다. 성도 14명의 HGSS 참조 이외 파티는 원작에서 영감을 받은 타워용 각색이며 원작 기술/도구의 완전 복제는 아니다. 아래 파티는 시드 [1,2,3,4] 예시다. 상세 기술·특성·도구는 trainer-samples.json에 기록한다.\n\n| 샘플 | 출신 세대 | 타입 | 컨셉 | 대표 포켓몬 | 후보 엔트리 | 예시 파티 |\n|---|---|---|---|---|---|---|\n`;
writeFileSync('artifacts/reports/npc/trainer-samples.md',header+rows.map(s=>`| ${s.title} ${s.name} | ${s.generation ?? '공용'} | ${s.specialty ?? '혼합'} | ${s.concept} | ${s.ace ? pokemonName(s.ace) : '—'} | ${s.entries?.map(pokemonName).join(' · ') ?? '층별 허용 풀'} | ${s.exampleTeam.map(p=>pokemonName(p.name)).join(' · ')} |`).join('\n')+'\n');
console.log(`Wrote ${rows.length} trainer samples with legal move examples.`);
