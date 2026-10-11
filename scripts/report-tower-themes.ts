import {writeFileSync} from 'node:fs';
import {towerThemes,type TowerTheme} from '../src/data/tower-themes';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {villainOrganizations,villainLeaders} from '../src/data/villain-organizations';
import {generateOpponentTeam} from '../src/server/opponent-team';
const trainer=(id:string)=>trainerCatalog.find(s=>s.id===id)!;
const rows=(Object.keys(towerThemes) as TowerTheme[]).map(id=>{
 const theme=towerThemes[id];
 return {id,...theme,gyms:theme.gyms.map(trainer),elites:theme.elites.map(trainer),champion:trainer(theme.champion),final:trainer(theme.final),organizations:theme.organizations.map(id=>({organization:villainOrganizations.find(g=>g.id===id)!,leaders:villainLeaders[id]})),exampleMilestones:[5,10,15,20,25,30,35,40,45,50].map(floor=>{const encounter=towerTrainerEncounter(floor,'regional-sample',id)!;return {floor,trainer:encounter.boss,team:generateOpponentTeam(floor,[floor,2,3,4],[],encounter)};})};
});
writeFileSync('artifacts/tower-themes.json',JSON.stringify({exampleRun:'regional-sample',themes:rows},null,2)+'\n');
writeFileSync('artifacts/tower-themes.md','# 1~9세대 테마 샘플\n\n새 도전은 9개 중 하나를 추첨해 끝까지 유지한다. 상세 규칙은 [세대 테마](../docs/REGIONAL_THEMES.md), 기술·도구가 포함된 예시는 [JSON](tower-themes.json)을 따른다.\n\n| 세대·지역 | 관장/캡틴 후보 | 사천왕/컵 후보 | 40층 | 50층 | 빌런 후보 |\n|---|---|---|---|---|---|\n'+rows.map(t=>`| ${t.generation} · ${t.name} | ${t.gyms.map(s=>s.name).join(' · ')} | ${t.elites.map(s=>s.name).join(' · ')} | ${t.champion.name} | ${t.final.name} | ${t.organizations.map(g=>g.organization.name).join(' / ')} |`).join('\n')+'\n');
console.log(`Wrote ${rows.length} themes with 90 actual milestone team examples.`);
