import {writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {namedTrainerSamples,type TrainerSample} from '../src/data/trainer-catalog';
import {villainLeaders} from '../src/data/villain-organizations';
import {generateOpponentTeam,type OpponentEntry} from '../src/server/opponent-team';
import {npcGimmick,npcExtraCandidates,npcSpecies,equipNpcGimmick} from '../src/data/npc-gimmicks';
import {npcReviewPresets,canonicalNpcId} from '../src/data/npc-review-presets';
import {defaultProfile} from '../src/server/training';
import {megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {packTeam} from '../src/data/teams';
import {towerDifficulty,CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {statKeys,statNames,natureLabel,type TrainingProfile} from '../src/data/training';
import {pokemonName} from '../src/web/catalog';
import {moveInfo} from '../src/data/move-info';
import {itemName} from '../src/data/held-items';
import abilityNames from '../src/data/ability-names.json' with {type:'json'};
import {FORMAT} from '../src/data/battle-rules';
import {primalOrbs} from '../src/data/primal-forms';
import {selectableForms} from '../src/data/selectable-forms';
import type {Seed} from '../src/battle/run';

// Highest-tier source for review and the staged normal-mode template builder.
const curated:Record<string,string[]>={
 'Dragonite|Dragoninite':['Dragon Pulse','Air Slash','Flamethrower','Roost'],
 'Garchomp|Garchompite':['Earthquake','Dragon Claw','Stone Edge','Swords Dance'],
 'Mimikyu|Mimikium Z':['Play Rough','Shadow Claw','Shadow Sneak','Swords Dance'],
 'Kommo-o|Kommonium Z':['Clanging Scales','Flamethrower','Drain Punch','Protect'],
 'Charizard|Dynamax Band':['Flamethrower','Air Slash','Dragon Pulse','Roost'],
 'Groudon|Red Orb':['Precipice Blades','Fire Punch','Stone Edge','Swords Dance'],
 'Kyogre|Blue Orb':['Origin Pulse','Ice Beam','Thunder','Calm Mind'],
};
function profile(entry:OpponentEntry,sample:TrainerSample):TrainingProfile{
 const moves=curated[entry.name+'|'+entry.item] ?? entry.moves;
 const p=defaultProfile(entry.name);p.moves=[...moves];p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as TrainingProfile['ivs'];
 p.ability=entry.ability ?? p.ability;
 const stats=Showdown.Dex.species.get(primalOrbs[entry.item ?? '']?.forme ?? megaStones[entry.item ?? '']?.forme ?? entry.name).baseStats;
 const damage=(category:string)=>moves.map(m=>Showdown.Dex.moves.get(m)).filter(m=>m.category===category).reduce((n,m)=>n+(m.basePower || 40)*(m.accuracy===true?1:m.accuracy/100)*(Showdown.Dex.species.get(entry.name).types.includes(m.type)?1.5:1),0);
 const physical=damage('Physical'),special=damage('Special'),attack=physical*stats.atk>=special*stats.spa?'atk':'spa';
 const mixed=physical>0 && special>0 && Math.min(physical*stats.atk,special*stats.spa)>Math.max(physical*stats.atk,special*stats.spa)*.45;
 const room=moves.includes('Trick Room'),support=physical+special===0;
 p.evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
 if(support){p.evs.hp=32;p.evs.def=stats.def<=stats.spd?32:2;p.evs.spd=32-p.evs.def+2;p.nature=stats.def<=stats.spd?'Bold':'Calm';}
 else if(mixed){p.evs.atk=26;p.evs.spa=26;p.evs.hp=14;p.nature=stats.spe>=80?'Naive':'Quiet';}
 else{p.evs[attack]=32;if(stats.spe>=80 && !room){p.evs.spe=24;p.evs.hp=10;p.nature=attack==='atk'?'Jolly':'Timid';}
  else{p.evs.hp=24;p.evs[stats.def<=stats.spd?'def':'spd']=10;p.nature=room?(attack==='atk'?'Brave':'Quiet'):(attack==='atk'?'Adamant':'Modest');}}
 p.teraType=(sample.specialty ?? Showdown.Dex.species.get(entry.name).types[0]) as TrainingProfile['teraType'];
 assertProfile(p);return p;
}
function assertProfile(p:TrainingProfile){if(Object.values(p.evs).reduce((n,v)=>n+v,0)!==towerDifficulty(100).points || Object.values(p.evs).some(v=>v>32))throw Error('Invalid ceiling training');}
function score(team:OpponentEntry[]){
 const dex=team.map(p=>Showdown.Dex.species.get(primalOrbs[p.item ?? '']?.forme ?? megaStones[p.item ?? '']?.forme ?? p.name));
 const weaknesses=Showdown.Dex.types.all().filter(t=>dex.every(s=>Showdown.Dex.getImmunity(t.name,s)&&Showdown.Dex.getEffectiveness(t.name,s)>0)).length;
 return dex.reduce((n,s)=>n+s.bst,0)+new Set(dex.flatMap(s=>s.types)).size*35-weaknesses*100;
}
const samples=[...namedTrainerSamples,...Object.entries(villainLeaders).flatMap(([org,ranks])=>Object.entries(ranks).map(([rank,s])=>({...s,id:org+'-'+rank+'-'+s.portrait,title:org+' '+rank})))];
const validator=new Showdown.TeamValidator(FORMAT);
const rows=samples.map(original=>{
 const review=npcReviewPresets[canonicalNpcId(original.id)];
 const sample=review?{...original,entries:review.entries,ace:review.ace}:original;
 let selected:OpponentEntry[]|undefined,best=-Infinity,seed:Seed=[1,2,3,4];
 for(let i=1;i<=32;i++){
  // Regeneration must use the source pools, not yesterday's live templates.
  const nextSeed:Seed=[i,2,3,4];let team=generateOpponentTeam(100,nextSeed,[],null,sample,CURRENT_PROGRESSION,{templates:false});
  if(review?.signature){team=equipNpcGimmick(team,review.signature);team=team.map(p=>!p.item?{...p,item:p.name==='Camerupt'?'Charcoal':p.name==='Sharpedo'?'Black Glasses':'Sitrus Berry'}:p);}
  const value=score(team);
  if(value>best){selected=team;best=value;seed=nextSeed;}
 }
 const team=selected!,profiles=Object.fromEntries(team.map(p=>[p.name,profile(p,sample)]));
 const signature=review?.signature ?? npcGimmick(sample.id,sample.generation,[...sample.entries!,...(npcExtraCandidates[sample.id] ?? [])].map(name=>npcSpecies(name,sample.id,sample.generation)),sample.ace?npcSpecies(sample.ace,sample.id,sample.generation):undefined);
 if(!signature)throw Error('Missing draft signature: '+sample.id);
 const packed=packTeam(team.map(p=>p.name),profiles,Object.fromEntries(team.map(p=>[p.name,p.item ?? ''])),team.filter(p=>p.gigantamax).map(p=>p.name));
 const sets=Showdown.Teams.unpack(packed)!;
 for(const set of sets){if(set.item===DYNAMAX_ITEM)set.item='';set.pokeball='';set.evs={hp:1,atk:0,def:0,spa:0,spd:0,spe:0};set.gender='';}
 const errors=validator.validateTeam(sets);if(errors)throw Error(sample.id+': '+errors.join('; '));
 return {id:sample.id,name:sample.name,generation:sample.generation,role:sample.role,title:sample.title,ace:sample.ace?npcSpecies(sample.ace,sample.id,sample.generation):undefined,signature,seed,packed,...(review?.legendaryMinFloor?{legendaryMinFloor:review.legendaryMinFloor}:{}),
  team:team.map(p=>{
   const formName=primalOrbs[p.item ?? '']?.forme ?? megaStones[p.item ?? '']?.forme ?? (p.gigantamax?p.name+'-Gmax':undefined);
   const form=formName?Showdown.Dex.species.get(formName):undefined;
   const region=selectableForms[p.name]?.region;
   return {species:p.name,name:pokemonName(p.name)+(region?' ('+region+')':''),item:p.item ?? '',itemName:itemName(p.item),gigantamax:!!p.gigantamax,profile:profiles[p.name],...(form?{battleForm:{species:form.name,name:pokemonName(form.name),ability:form.abilities[0],types:form.types}}:{})};
  })};
});
writeFileSync('docs/gameplay/npc-team-samples.json',JSON.stringify({status:'review-draft',floor:100,level:50,iv:31,statPoints:66,maxPointsPerStat:32,selection:'Best coverage/BST score among 32 deterministic existing-generator candidates; no battle balance optimization.',samples:rows},null,2)+'\n');
const gimmicks={mega:'메가진화',dynamax:'거다이맥스',z:'Z기술',tera:'테라스탈',primal:'원시회귀'};
const sections:string[]=['# NPC 최고 단계 팀 샘플 — 검토용','',
 '2026-10-13. 100층 최종 단계 기준: 레벨50, IV 전부31, 능력 포인트 총66·스탯당 최대32. 일반 관장도 같은 최고 단계로 표시한다. 초반부터 이 세팅을 쓰는 뜻은 아니다.',
 '', '대표 기믹과 출전 담당은 구현된 첫 배정이다. 아래 고정 3마리·성격·역할별 육성은 검토용 초안이며 게임은 아직 이 프리셋 파일을 읽지 않는다. 동료는 기존 후보에서 32개 재현 가능한 팀 중 종족값·타입 보완 점수가 높은 조합을 고른다. 최적 승률이나 기믹 간 균형을 검증한 결과가 아니다.',
 '', '관장 표에서 ★는 기믹 담당이다. 기존 에이스가 별도 동료라면 함께 포함된다. 물리/특수·혼합·트릭룸 여부에 맞춰 성격과 포인트를 배분했다. 전용 Z 담당에는 필요한 원본 기술을 포함한다. 능력 포인트 표기는 EV 252 시스템이 아니다.',
 '', '## 관장·캡틴 한눈에 보기','', '| 세대 | 관장 | 대표 기믹 | 출전 3마리 |','|---|---|---|---|'];
for(const row of rows.filter(r=>r.role==='gym').sort((a,b)=>(a.generation ?? 0)-(b.generation ?? 0)))sections.push(`| ${row.generation} | ${row.name} | ${gimmicks[row.signature.rule]} | ${row.team.map(p=>(p.species===row.signature.species?'★':'')+p.name).join(' · ')} |`);
for(const row of rows){
 sections.push('',`## ${row.generation ?? '빌런'}세대 ${row.title} ${row.name}`,`ID: \`${row.id}\` · 대표: ${gimmicks[row.signature.rule]} ${pokemonName(row.signature.species)}${row.signature.item?' · '+itemName(row.signature.item):''}`,'',
 '| 포켓몬 | 기술 4개 | 특성 | 도구 | 성격 | 능력 포인트 |','|---|---|---|---|---|---|');
 for(const p of row.team){const f=p.profile,forme=primalOrbs[p.item]?.forme ?? megaStones[p.item]?.forme,after=forme?Showdown.Dex.species.get(forme).abilities[0]:f.ability;
  const ability=(abilityNames[f.ability] ?? f.ability)+(after!==f.ability?' → '+(abilityNames[after] ?? after):'');
  sections.push(`| ${p.species===row.signature.species?'★ ':''}${p.name} | ${f.moves.map(m=>moveInfo[m]?.name ?? m).join(' / ')} | ${ability} | ${p.itemName}${p.gigantamax?' (거다이맥스)':''} | ${natureLabel(f.nature)} | ${statKeys.filter(k=>f.evs[k]).map(k=>statNames[k]+' '+f.evs[k]).join(' · ')} |`);}
 if(row.signature.rule==='tera')sections.push('',`테라 담당 타입: ${sampleType(row.team,row.signature.species)}.`);
}
function sampleType(team:typeof rows[number]['team'],name:string){return team.find(p=>p.species===name)?.profile.teraType ?? '';}
writeFileSync('docs/gameplay/NPC_TEAM_SAMPLES.md',sections.join('\n')+'\n');
console.log(`${rows.length} NPC drafts, ${rows.filter(r=>r.role==='gym').length} gym/captain drafts; all teams passed legality and 66-point checks.`);
