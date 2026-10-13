import {readFileSync,writeFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('docs/gameplay/normal-npc-samples.json','utf8'));
const rows=source.samples.map(s=>({id:s.id,stage:s.stage,role:s.role,ace:s.ace,signature:s.signature,gimmickEnabled:s.gimmickEnabled,legendaryMinFloor:s.legendaryMinFloor,team:s.team.map(p=>({species:p.species,item:p.item,gigantamax:p.gigantamax,profile:p.profile}))}));
writeFileSync('src/data/normal-npc-templates.json',JSON.stringify(rows)+'\n');
console.log(`Exported ${rows.length} live NPC templates.`);
