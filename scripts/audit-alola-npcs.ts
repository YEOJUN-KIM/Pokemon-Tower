import {readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {alolaTrainers,alolaSample} from '../src/data/alola-trainers';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {DamagePolicy} from '../src/battle/policy';
import {runBattle} from '../src/battle/run';
import {packTeam,pokemonSets} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {packedNpcRule} from '../src/data/npc-gimmicks';

const cases=[['Charizard','Blastoise','Venusaur'],['Garchomp','Metagross','Lapras'],['Slowbro','Corviknight','Gastrodon'],['Mimikyu','Kommo-o','Gyarados']];
const results=[];
for(const t of alolaTrainers){
 const sample=alolaSample(t),row=normalNpcTemplate(t.id,95,sample.role)!;
 const builds=row.team.map(p=>{const dex=Showdown.Dex.species.get(p.profile.forme??p.species);return {...p,stats:dex.baseStats,physicalBulk:dex.baseStats.hp*dex.baseStats.def,specialBulk:dex.baseStats.hp*dex.baseStats.spd,types:dex.types,categories:p.profile.moves.map(m=>({move:m,category:Showdown.Dex.moves.get(m).category}))};});
 const battles=[];
 for(const floor of t.category==='boss'?[75,95]:[45,95])for(let c=0;c<cases.length;c++)for(let seed=1;seed<=2;seed++){
  const snapshot=snapshotTrainerEventBattle(`alola-audit:${c}:${seed}`,sample,floor,'basic',CURRENT_PROGRESSION);
  const profiles=Object.fromEntries(cases[c].map(species=>{const p=defaultProfile(species),stats=Showdown.Dex.species.get(species).baseStats,physical=stats.atk>=stats.spa;p.moves=[...pokemonSets[species].moves];p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.nature=physical?'Adamant':'Modest';p.evs={hp:16,atk:physical?32:0,def:0,spa:physical?0:32,spd:0,spe:18};return [species,p];}));
  const log=await runBattle({teams:{p1:packTeam(cases[c],profiles),p2:snapshot.opponentTeam},rule:'basic',opponentRule:packedNpcRule(snapshot.team.map(p=>({item:p.item??''})),0),seed:snapshot.seed,player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(floor,sample))});
  battles.push({floor,case:cases[c],seed,winner:log.winner,turns:log.turns,zUsed:log.publicProtocol.some(l=>l.startsWith('|-zpower|p2')),failedMoves:log.publicProtocol.filter(l=>l.startsWith('|-fail|p2')).length});
 }
 results.push({id:t.id,npcWins:battles.filter(b=>b.winner==='Tower AI').length,battles,builds});console.log(t.id,results.at(-1)!.npcWins+'/'+battles.length);
}
const result={date:'2026-10-18',method:'Independent battles; four fixed player triples, DamagePolicy, full collection IV/default player moves, 66 player training points, no campaign attrition or items. Not a human win-rate estimate.',errors:0,battles:results.reduce((n,r)=>n+r.battles.length,0),results,firstImpressionRegression:JSON.parse(readFileSync('artifacts/experiments/balance/alola-20261018/first-impression-reproduction.json','utf8'))};
writeFileSync('artifacts/reports/npc/alola-audit.json',JSON.stringify(result,null,2)+'\n');
const lines=['# 알로라 NPC 최종 팀 데이터','', '각 표는 95층 검토 원본이다. 실제 IV/훈련 포인트·기믹은 기존 층별 규칙으로 조정된다. 원본 source의 포인트는 카트리지 EV가 아니다.',''];
for(const r of results){const t=alolaTrainers.find(t=>t.id===r.id)!;lines.push(`## ${t.name} / ${t.category}`,'',`필수: ${t.category==='boss'?'Clefable, Lilligant, Necrozma (Dusk-Mane)':t.category==='grunt'?'없음':t.ace}. AI 상한: ${t.aiCeiling}. 훈련 포인트 상한: ${t.points}.`,'','|포켓몬|종족값 HP/공/방/특공/특방/속|성격|특성|도구|훈련 HP/공/방/특공/특방/속|기술|','|---|---|---|---|---|---|---|');for(const p of r.builds)lines.push(`|${p.profile.forme??p.species}|${Object.values(p.stats).join('/')}|${p.profile.nature}|${p.profile.ability}|${p.item||'없음'}|${Object.values(p.profile.evs).join('/')}|${p.profile.moves.join(' / ')}|`);if(r.id==='named-mallow')lines.push('','1–54층 라란티스는 Leaf Guard / Leaf Blade, Knock Off, Leech Life, Swords Dance. 55층부터 Contrary / Leaf Blade, Superpower, Knock Off, Leech Life.');lines.push('');}
writeFileSync('artifacts/reports/npc/alola-team-data.md',lines.join('\n')+'\n');
