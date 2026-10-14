import {writeFileSync} from 'node:fs';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {buildEggSpeciesPools,rareEggSpeciesCategory} from '../src/server/egg-pool';
import {eggGrades,eggGradeNames,eggGradeWeights} from '../src/data/egg-grades';

const entries=pokedexEntries().filter(entry=>entry.battleReady!==false);
const pools=buildEggSpeciesPools(entries.map(entry=>entry.species));
const bySpecies=new Map(entries.map(entry=>[entry.species,entry]));
const categories={normal:'일반',sublegendary:'준전설',paradox:'패러독스',ultrabeast:'울트라비스트',legendary:'초전설',mythical:'환상'};
const lines=['# 알 포켓몬 등급 목록','','일반 85% · 레어 12% · 슈퍼레어 3%입니다. 이로치는 등급과 별도로 0.24% 판정합니다.','','현재 뽑기 대상만 포함합니다. 도감에 있어도 배틀 미지원인 포켓몬은 제외하며, 별도 수집하는 리전폼은 각각 한 항목으로 셉니다. 메가진화·원시회귀·전투 중 폼은 별도 알로 추가하지 않습니다.','','| 등급 | 확률 | 항목 수 | 포함 분류 |','|---|---:|---:|---|'];
for(const grade of eggGrades)lines.push(`| ${eggGradeNames[grade]} | ${eggGradeWeights[grade]/100}% | ${pools[grade].length} | ${grade==='normal'?'일반·스타팅·600족':grade==='rare'?'준전설·패러독스·울트라비스트':'초전설·환상'} |`);
lines.push('','슈퍼레어 3%는 전체 뽑기 기준 초전설 2.5%·환상 0.5%로 나눕니다.','','코라이돈·미라이돈은 슈퍼레어, 굽이치는물결·무쇠잎새는 레어로 분류합니다. 우라오스·오거폰은 준전설이므로 레어입니다. 피오네·멜탄은 환상이므로 슈퍼레어입니다.');
for(const grade of eggGrades){
 lines.push('',`## ${eggGradeNames[grade]} (${pools[grade].length}개)`,'','| 도감 번호 | 포켓몬 | 개별 수집 항목 | 분류 |','|---:|---|---|---|');
 for(const name of pools[grade]){const entry=bySpecies.get(name)!;lines.push(`| ${entry.nationalId??entry.id} | ${entry.name} | ${name} | ${categories[rareEggSpeciesCategory(name)??'normal']} |`);}
}
lines.push('','재생성: `node --import tsx scripts/export-egg-pools.ts`','','[알 뽑기 규칙](../../../docs/gameplay/EGGS.md)','');
writeFileSync('artifacts/reports/changes/EGG_POOL_CLASSIFICATION.md',lines.join('\n'));
console.log(JSON.stringify({total:entries.length,...Object.fromEntries(eggGrades.map(grade=>[grade,pools[grade].length]))}));
