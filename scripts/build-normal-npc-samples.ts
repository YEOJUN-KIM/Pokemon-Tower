import {readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {normalModeStages,normalNpcCategory,type NormalModeStage} from '../src/data/normal-mode-stages';
import {towerDifficulty} from '../src/data/tower-progression';
import {megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {primalOrbs} from '../src/data/primal-forms';
import {zCrystals} from '../src/data/z-crystals';
import {gentleMoves} from '../src/server/opponent-team';
import {defaultProfile} from '../src/server/training';
import {packTeam} from '../src/data/teams';
import {statKeys,statNames,natureLabel,type TrainingProfile} from '../src/data/training';
import {pokemonName} from '../src/web/catalog';
import {moveInfo} from '../src/data/move-info';
import {itemName} from '../src/data/held-items';
import abilityNames from '../src/data/ability-names.json' with {type:'json'};
import {FORMAT} from '../src/data/battle-rules';
import type {NpcGimmick} from '../src/data/npc-gimmicks';
import {npcEarlyReplacements,canonicalNpcId} from '../src/data/npc-review-presets';

type Member={species:string;name:string;item:string;itemName:string;gigantamax:boolean;profile:TrainingProfile;battleForm?:{species:string;name:string;ability:string;types:string[]}};
type Source={id:string;name:string;generation:number|null;role:string;title:string;ace:string;signature:NpcGimmick;team:Member[];legendaryMinFloor?:number};
const full=JSON.parse(readFileSync('docs/gameplay/npc-team-samples.json','utf8')) as {samples:Source[]};
const validator=new Showdown.TeamValidator(FORMAT);
const special=(item:string)=>!!megaStones[item] || !!zCrystals[item] || !!primalOrbs[item] || item===DYNAMAX_ITEM;
function allocate(template:TrainingProfile['evs'],budget:number){
 const total=statKeys.reduce((n,k)=>n+template[k],0),points=Object.fromEntries(statKeys.map(k=>[k,total?Math.floor(template[k]*budget/total):0])) as TrainingProfile['evs'];
 const priority=[...statKeys].sort((a,b)=>template[b]-template[a]);
 for(let remaining=budget-statKeys.reduce((n,k)=>n+points[k],0);remaining>0;remaining--){const stat=priority.find(k=>points[k]<32)!;points[stat]++;}
 return points;
}
const samples=full.samples.flatMap(source=>{
 const category=normalNpcCategory(source.role,source.id,'named');
 const stages:NormalModeStage[]=category==='boss'?['first-gate','final-gate']:['leaders-early','leaders-late'];
 return stages.map(stage=>{
  const policy=normalModeStages[stage],floor=policy.referenceFloor,difficulty=towerDifficulty(floor);
  let team=structuredClone(source.team),ace=source.ace,signature={...source.signature};
  const early=npcEarlyReplacements[canonicalNpcId(source.id)];
  if(stage==='first-gate' && early){
   team=team.map(p=>p.species===early.species?{species:early.replacement,name:pokemonName(early.replacement),item:'Leftovers',itemName:itemName('Leftovers'),gigantamax:false,profile:{...defaultProfile(early.replacement),evs:{hp:24,atk:0,def:0,spa:32,spd:10,spe:0}}}:p);
   ace=early.ace;signature={...early.signature};
   const carrier=team.find(p=>p.species===signature.species)!;
   if(signature.item)carrier.item=signature.item;
  }
  const used=new Set(team.filter(p=>!special(p.item)).map(p=>p.item));
  team=team.map(p=>{
   if(!policy.gimmicks && special(p.item)){p.item=['Sitrus Berry','Leftovers','Expert Belt','Muscle Band','Wise Glasses'].find(item=>!used.has(item))!;used.add(p.item);}
   p.itemName=itemName(p.item);
   if(policy.sampleTier===1){
    const original=[...p.profile.moves],required=zCrystals[p.item]?.from;
    p.profile.moves=gentleMoves([{name:p.species,moves:original}])[0].moves;
    // A weaker replacement must not remove the activation move of a dedicated Z crystal.
    if(required && original.includes(required))p.profile.moves[original.indexOf(required)]=required;
   }
   p.profile.ivs=Object.fromEntries(statKeys.map(k=>[k,difficulty.ivCap])) as TrainingProfile['ivs'];
   p.profile.evs=allocate(p.profile.evs,difficulty.points);
   if(policy.sampleTier===1)p.profile.nature='Serious';
   p.gigantamax=policy.gimmicks && p.item===DYNAMAX_ITEM;
   const formName=policy.gimmicks?(primalOrbs[p.item]?.forme ?? megaStones[p.item]?.forme ?? (p.gigantamax?p.species+'-Gmax':undefined)):undefined;
   const form=formName?Showdown.Dex.species.get(formName):undefined;
   p.battleForm=form?{species:form.name,name:pokemonName(form.name),ability:form.abilities[0],types:form.types}:undefined;
   return p;
  });
  const packed=packTeam(team.map(p=>p.species),Object.fromEntries(team.map(p=>[p.species,p.profile])),Object.fromEntries(team.map(p=>[p.species,p.item])),team.filter(p=>p.gigantamax).map(p=>p.species));
  const sets=Showdown.Teams.unpack(packed)!;
  for(const set of sets){if(set.item===DYNAMAX_ITEM)set.item='';set.pokeball='';set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};set.evs={hp:1,atk:0,def:0,spa:0,spd:0,spe:0};set.gender='';}
  const errors=validator.validateTeam(sets);if(errors)throw Error(source.id+' '+stage+': '+errors.join('; '));
  if(team.some(p=>statKeys.reduce((n,k)=>n+p.profile.evs[k],0)!==difficulty.points))throw Error('Training budget mismatch');
  return {...source,ace,signature,team,packed,stage,stageName:policy.name,sampleTier:policy.sampleTier,gimmickEnabled:policy.gimmicks,referenceFloor:floor,iv:difficulty.ivCap,statPoints:difficulty.points,floorRange:category==='boss'?(policy.sampleTier===1?'50층 첫 관문·중간 보스':'100층 최종전'):(policy.sampleTier===1?'5~45층':'55~95층'),...(source.legendaryMinFloor && policy.sampleTier===1?{legendaryMinFloor:undefined}:{})};
 });
});
writeFileSync('docs/gameplay/normal-npc-samples.json',JSON.stringify({status:'normal-mode-template',training:'scaled-to-floor-curve',villainBossMinFloor:75,level:50,maxPointsPerStat:32,stages:normalModeStages,samples},null,2)+'\n');
const labels={mega:'메가진화',dynamax:'거다이맥스',tera:'테라스탈',z:'Z기술',primal:'원시회귀'};
const sections=['# 일반 모드 NPC 두 단계 샘플','',
 '2026-10-13. 사용자 검토용 문서. 164종의 NPC마다 두 단계, 총328개다. 고정 3마리·기술·도구·특성·성격·역할별 육성을 새 일반 모드 배틀에 적용했다. CSV는 코드 활용·검증용이며 이 문서에서 팀을 확인하면 된다.',
 '', '| 구간 | 상대 | 샘플 | 기믹 |','|---|---|---|---|','| 5~45층 | 관장·사천왕 | 전반 | 없음 |','| 50층 | 챔피언 | 첫 관문 | 대표 기믹 첫 사용 |','| 55~95층 | 관장·사천왕 | 후반 | 대표 기믹 |','| 100층 | 챔피언·최종 보스 | 최종 | 대표 기믹 |',
 '', '51~54층은 기존 완화 구간으로 유지한다. 일반 트레이너·조직원은 기믹이 없다. 간부는55층 이후부터 허용한다. 빌런 보스는75층 이상에서만 등장하고 후반·최종 샘플을 사용한다. 빌런 보스의 첫 관문 표는 비교용으로 남겨 두며 실제로 배정하지 않는다. 5층 단위 관문과 연속 빌런 제외·보스 격파 후 조직 종료는 유지한다.',
 '', '표의 육성은 대표 층 기준이다: 전반45층 IV10·포인트7, 첫 관문50층 IV12·포인트8, 후반95층 IV28·포인트58, 최종100층 IV31·포인트66. 실제 배틀은 해당 층의 기존 IV·포인트 곡선을 상한으로 사용하고 표의 역할별 비율로 포인트를 배분한다. 낮은 층에 대표 층의 육성을 그대로 주지 않는다. 난이도 측정·10층별 추가 보정은 후속 작업이다. 이미 저장된 배틀·legacy 도전은 유지한다.',
 '', '## NPC별 두 단계 비교','', '★는 기믹 담당 포켓몬이다. 관장·사천왕은 전반/후반, 챔피언·보스는 첫 관문/최종을 비교한다. 기술·도구·육성은 아래 상세 표에 있다.', '', '| NPC | 구분 | 전반·첫 관문 3마리 | 후반·최종 3마리 | 기믹 변화 |','|---|---|---|---|---|'];
const teamLabel=(s:typeof samples[number])=>s.team.map(p=>(s.gimmickEnabled&&p.species===s.signature.species?'★':'')+p.name).join(' · ');
const gimmickLabel=(s:typeof samples[number])=>s.gimmickEnabled?labels[s.signature.rule]:'없음';
for(let i=0;i<samples.length;i+=2){const early=samples[i],late=samples[i+1];sections.push(`| ${early.name} (${early.id}) | ${early.stage==='first-gate'?'챔피언·보스':'관장·사천왕·간부'} | ${teamLabel(early)} | ${teamLabel(late)} | ${gimmickLabel(early)} → ${gimmickLabel(late)} |`);}
for(const s of samples){sections.push('',`## ${s.name} · ${s.stageName}`,`ID: \`${s.id}\` · ${s.floorRange}`,'','| 포켓몬 | 기술 | 도구 | 성격 | 능력 포인트 |','|---|---|---|---|---|');
 for(const p of s.team)sections.push(`| ${p.name} | ${p.profile.moves.map(m=>moveInfo[m]?.name ?? m).join(' / ')} | ${p.itemName} | ${natureLabel(p.profile.nature)} | ${statKeys.filter(k=>p.profile.evs[k]).map(k=>statNames[k]+' '+p.profile.evs[k]).join(' · ')} |`);
}
writeFileSync('docs/gameplay/NORMAL_MODE_SAMPLES.md',sections.join('\n')+'\n');
console.log(`${samples.length} normal-mode two-tier samples; every team passed legality and training budget checks.`);
