import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {towerThemes,type TowerTheme} from '../src/data/tower-themes';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {villainLeaders} from '../src/data/villain-organizations';
import {generateOpponentTeam,selectTrainerSample} from '../src/server/opponent-team';
import {normalNpcTemplate,templateProfile} from '../src/server/npc-templates';
import {opponentProfile} from '../src/server/opponent-training';
import {normalNpcCategory,normalNpcGimmicksEnabled} from '../src/data/normal-mode-stages';
import {npcGimmick,packedNpcRule} from '../src/data/npc-gimmicks';
import {CURRENT_PROGRESSION,towerDifficulty,opponentTeraTickets} from '../src/data/tower-progression';
import {type TrainerSample} from '../src/data/trainer-catalog';
import {megaStones,DYNAMAX_ITEM,canEquipGimmick} from '../src/data/gimmicks';
import {zCrystals,matchingZCrystals} from '../src/data/z-crystals';
import {primalOrbs} from '../src/data/primal-forms';
import {battleRules,allowsGimmick,type BattleRule} from '../src/data/run-rules';
import {packTeam,pokemonSets} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,type TrainingProfile,type StatBlock} from '../src/data/training';
import {runBattle,engineVersion,FORMAT,type Seed} from '../src/battle/run';
import {ZMovePolicy} from '../src/battle/z-move-policy';
import {pokemonName} from '../src/web/catalog';

const leadCheck=process.argv.includes('--lead-check'),focused=process.argv.includes('--outliers')||leadCheck;
const retryCheck=process.argv.includes('--retry-check');
const prefix=process.env.NORMAL_BALANCE_OUTPUT??('artifacts/normal-mode-balance-20261013'+(leadCheck?'-leads':focused?'-outliers':''));mkdirSync(prefix,{recursive:true});
writeFileSync(prefix+'/simulation-source.ts',readFileSync('scripts/simulate-normal-npc-balance.ts'));
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const protocolHash=(lines:string[])=>hash(lines.filter(line=>!line.startsWith('|t:|')).join('\n'));
type Encounter={id:string;floor:number;theme:string;npcId:string;name:string;role:string;scope:'course'|'boss';enemy:string;enemyRule:BattleRule;teraSpecies?:string;enemyTera:number};
const encounters:Encounter[]=[];
function record(floor:number,theme:string,key:string,scope:'course'|'boss',trainer:ReturnType<typeof towerTrainerEncounter>,sample?:TrainerSample){
 const seed:Seed=[floor,17,29,43],entries=generateOpponentTeam(floor,seed,[],trainer,sample,CURRENT_PROGRESSION);
 const id=sample?.id??trainer?.boss.id??'',role=sample?.role??trainer?.boss.role??'normal';
 const template=normalNpcTemplate(id,floor,role),enabled=normalNpcGimmicksEnabled(floor,normalNpcCategory(role,id,sample?.kind??'named'));
 const planned=enabled&&(trainer||sample?.kind==='named')?(template?.signature??npcGimmick(id,sample?.generation??trainer?.boss.generation??null,entries.map(p=>p.name),sample?.ace??trainer?.ace)):null;
 const carrier=entries.find(p=>p.item&&(megaStones[p.item]||zCrystals[p.item]||primalOrbs[p.item]||p.item===DYNAMAX_ITEM));
 const tera=enabled?(planned?.rule==='tera'?1:!carrier&&sample?.kind==='elite'?opponentTeraTickets(floor,'elite'):0):0;
 const profiles=Object.fromEntries(entries.map(p=>[p.name,p.profile??{...opponentProfile(p.name,p.moves,floor,Object.fromEntries(statKeys.map(k=>[k,15])) as StatBlock,CURRENT_PROGRESSION),...(p.ability?{ability:p.ability}:{})}]));
 if(planned?.rule==='tera'&&!template)profiles[planned.species].teraType=(sample?.specialty??trainer?.boss.specialty??Showdown.Dex.species.get(planned.species).types[0]) as TrainingProfile['teraType'];
 const enemy=packTeam(entries.map(p=>p.name),profiles,Object.fromEntries(entries.map(p=>[p.name,p.item??''])),entries.filter(p=>p.gigantamax).map(p=>p.name));
 const enemyRule=packedNpcRule(entries.map(p=>({item:p.item??''})),tera);
 encounters.push({id:key,floor,theme,npcId:id,name:sample?.name??trainer?.boss.name??id,role,scope,enemy,enemyRule,enemyTera:tera,...(planned?.rule==='tera'?{teraSpecies:planned.species}:{})});
}
for(const theme of Object.keys(towerThemes) as TowerTheme[]){
 const route=`normal-balance-20261013:${theme}`;
 for(let floor=5;floor<=100;floor+=5)record(floor,theme,`${theme}:${floor}`,'course',towerTrainerEncounter(floor,route,theme,true));
 for(const floor of [1,9,29,49,54,59,79,99])record(floor,theme,`${theme}:${floor}:random`,'course',null,selectTrainerSample(floor,[floor,11,23,37],[],CURRENT_PROGRESSION));
}
for(const [organization,leaders] of Object.entries(villainLeaders))for(const floor of [76,96]){
 const sample={...leaders.boss,id:`${organization}-boss-${leaders.boss.portrait}`,role:'villain',minFloor:75};
 record(floor,organization,`${organization}:${floor}:boss`,'boss',null,sample);
}
const playerCases=[
 {id:'starters',name:'스타터',species:['Charizard','Blastoise','Venusaur']},
 {id:'offense',name:'공격형',species:['Garchomp','Metagross','Lapras']},
 {id:'bulk',name:'내구형',species:['Slowbro','Corviknight','Gastrodon']},
 {id:'signature-z',name:'전용 Z 후보',species:['Mimikyu','Kommo-o','Gyarados']},
];
if(focused){const ids=new Set(['magma-boss-maxie','rocket-boss-giovanni','skull-boss-guzma','named-leon']);encounters.splice(0,encounters.length,...encounters.filter(e=>ids.has(e.npcId)));}
if(process.argv.includes('--bosses-only'))encounters.splice(0,encounters.length,...encounters.filter(e=>e.scope==='boss'));
if(leadCheck){const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];encounters.splice(0,encounters.length,...encounters.flatMap(e=>{const team=Showdown.Teams.unpack(e.enemy)!;return orders.map((order,i)=>({...e,id:e.id+':lead:'+i,enemy:Showdown.Teams.pack(order.map(n=>team[n]))}));}));}
const highest=JSON.parse(readFileSync('docs/gameplay/npc-team-samples.json','utf8')).samples as {team:{species:string;profile:TrainingProfile}[]}[];
const roleProfiles=new Map<string,TrainingProfile>();for(const row of highest)for(const p of row.team)if(!roleProfiles.has(p.species))roleProfiles.set(p.species,p.profile);
function playerTeam(index:number,floor:number,rule:BattleRule){
 const c=playerCases[index],difficulty=towerDifficulty(floor);
 const profiles=Object.fromEntries(c.species.map(name=>{
  const p=defaultProfile(name);p.moves=[...pokemonSets[name].moves];
  if(name==='Kommo-o')p.moves=['Clanging Scales','Flamethrower','Drain Punch','Protect'];
  if(name==='Mimikyu')p.moves=['Play Rough','Shadow Claw','Shadow Sneak','Swords Dance'];
  const role=roleProfiles.get(name);p.evs=role?{...role.evs}:{hp:10,atk:0,def:0,spa:32,spd:0,spe:24};
  if(!role && Showdown.Dex.species.get(name).baseStats.atk>=Showdown.Dex.species.get(name).baseStats.spa){p.evs.atk=32;p.evs.spa=0;}
  p.nature=floor>=55?(role?.nature??(p.evs.atk>p.evs.spa?'Adamant':'Modest')):'Serious';
  p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;
  return [name,templateProfile(p,floor)];
 }));
 const items=Object.fromEntries(c.species.map((name,i)=>[name,floor>=10?['Expert Belt','Leftovers','Sitrus Berry'][i]:'']));
 if(floor>=10){
  const mega=c.species.flatMap(name=>Object.keys(megaStones).filter(item=>canEquipGimmick(name,item)).map(item=>({name,item})))[0];
  if(mega&&allowsGimmick(rule,'mega'))items[mega.name]=mega.item;
  if(allowsGimmick(rule,'zmove')){
   const eligible=c.species.filter(name=>!items[name]||!megaStones[items[name]]);
   const name=eligible.find(n=>n==='Mimikyu')??eligible.find(n=>n==='Kommo-o')??eligible[0];
   const crystal=matchingZCrystals(name,profiles[name].moves).sort((a,b)=>Number(!!zCrystals[b].from)-Number(!!zCrystals[a].from))[0];if(crystal)items[name]=crystal;
  }
  if(allowsGimmick(rule,'dynamax')){const name=c.species.find(n=>!megaStones[items[n]]&&!zCrystals[items[n]]&&Showdown.Dex.species.get(n).canGigantamax)??c.species.find(n=>!megaStones[items[n]]&&!zCrystals[items[n]]);if(name)items[name]=DYNAMAX_ITEM;}
 }
 return packTeam(c.species,profiles,items,c.species.filter(n=>items[n]===DYNAMAX_ITEM&&!!Showdown.Dex.species.get(n).canGigantamax));
}
const rules=Object.keys(battleRules) as BattleRule[],seedCount=Number(process.env.NORMAL_BALANCE_SEEDS??(leadCheck?3:focused?16:2));
assert.ok(Number.isSafeInteger(seedCount)&&seedCount>0);
const frozen={engineVersion,format:FORMAT,focused,seedCount,encounters,playerCases,sourceHashes:Object.fromEntries(['src/data/normal-npc-templates.json','src/server/npc-templates.ts','src/server/opponent-team.ts','src/data/villain-organizations.ts','src/battle/z-move-policy.ts','src/battle/run.ts','scripts/simulate-normal-npc-balance.ts'].map(p=>[p,hash(readFileSync(p,'utf8'))]))};
writeFileSync(prefix+'/manifest.json',JSON.stringify(frozen,null,2));writeFileSync(prefix+'/battles.jsonl','');
type Row={encounterId:string;npcId:string;name:string;floor:number;theme:string;role:string;scope:string;caseId:string;rule:BattleRule;seed:Seed;winner:string|null;turns:number;protocolHash:string;playerGimmicks:number;enemyGimmicks:number;retryOutcomes?:(string|null)[];error?:string};
const results:Row[]=[],replays:{row:Row;teams:{p1:string;p2:string};encounter:Encounter}[]=[];
const start=Date.now();let done=0;
for(const encounter of encounters){
 for(let index=0;index<playerCases.length;index++)for(const rule of rules)for(let n=1;n<=seedCount;n++){
  const seed:Seed=[n,encounter.floor,37,101];let own=playerTeam(index,encounter.floor,rule);
  if(leadCheck){const team=Showdown.Teams.unpack(own)!,offset=(n-1)%3;own=Showdown.Teams.pack([...team.slice(offset),...team.slice(0,offset)]);}
  const row:Row={encounterId:encounter.id,npcId:encounter.npcId,name:encounter.name,floor:encounter.floor,theme:encounter.theme,role:encounter.role,scope:encounter.scope,caseId:playerCases[index].id,rule,seed,winner:null,turns:0,protocolHash:'',playerGimmicks:0,enemyGimmicks:0};
  try{
   const log=await runBattle({teams:{p1:own,p2:encounter.enemy},seed,rule,opponentRule:encounter.enemyRule,opponentTeraSpecies:encounter.teraSpecies,teraTickets:{p1:allowsGimmick(rule,'terastallize')?1:0,p2:encounter.enemyTera},player:new ZMovePolicy('p1'),opponent:new ZMovePolicy('p2')});
   row.winner=log.winner;row.turns=log.turns;row.protocolHash=protocolHash(log.publicProtocol);
   const count=(side:string)=>log.publicProtocol.filter(l=>l.startsWith(`|-mega|${side}`)||l.startsWith(`|-zpower|${side}`)||l.startsWith(`|-terastallize|${side}`)||l.startsWith(`|-primal|${side}`)||l.startsWith(`|-start|${side}`)&&l.includes('|Dynamax')).length;
   row.playerGimmicks=count('p1');row.enemyGimmicks=count('p2');
   if(index===0&&n===1&&((encounter.floor===50&&encounter.theme==='johto')||(encounter.scope==='boss'&&encounter.theme==='magma'&&encounter.floor===76)))replays.push({row,teams:{p1:own,p2:encounter.enemy},encounter});
   if(retryCheck){
    row.retryOutcomes=[];
    const team=Showdown.Teams.unpack(own)!;
    if(log.winner!=='Player')for(const order of [[1,2,0],[2,0,1],[0,2,1]]){
     const retry=await runBattle({teams:{p1:Showdown.Teams.pack(order.map(i=>team[i])),p2:encounter.enemy},seed,rule,opponentRule:encounter.enemyRule,opponentTeraSpecies:encounter.teraSpecies,teraTickets:{p1:allowsGimmick(rule,'terastallize')?1:0,p2:encounter.enemyTera},player:new ZMovePolicy('p1'),opponent:new ZMovePolicy('p2')});
     row.retryOutcomes.push(retry.winner);if(retry.winner==='Player')break;
    }
   }
  }catch(error){row.error=String(error);}
  results.push(row);appendFileSync(prefix+'/battles.jsonl',JSON.stringify(row)+'\n');done++;
 }
 if(done%480===0||done===encounters.length*playerCases.length*rules.length*seedCount)console.log(`${done}/${encounters.length*playerCases.length*rules.length*seedCount} battles; ${Math.round((Date.now()-start)/1000)} sec; errors ${results.filter(r=>r.error).length}`);
}
let replayed=0;
for(const {row,teams,encounter} of replays){const log=await runBattle({teams,seed:row.seed,rule:row.rule,opponentRule:encounter.enemyRule,opponentTeraSpecies:encounter.teraSpecies,teraTickets:{p1:allowsGimmick(row.rule,'terastallize')?1:0,p2:encounter.enemyTera},player:new ZMovePolicy('p1'),opponent:new ZMovePolicy('p2')});assert.equal(protocolHash(log.publicProtocol),row.protocolHash);replayed++;}
function summary(rows:Row[]){const completed=rows.filter(r=>!r.error),wins=completed.filter(r=>r.winner==='Player').length,losses=completed.filter(r=>r.winner==='Tower AI').length;return {battles:rows.length,completed:completed.length,wins,losses,draws:completed.length-wins-losses,errors:rows.length-completed.length,winRate:completed.length?wins/completed.length:0,averageTurns:completed.length?completed.reduce((n,r)=>n+r.turns,0)/completed.length:0};}
const courses=results.filter(r=>r.scope==='course'),bosses=results.filter(r=>r.scope==='boss');
const report={...frozen,elapsedSeconds:(Date.now()-start)/1000,replayed,method:'Fresh independent full-HP 3v3 battles, matched player IV/point floor curve, role-based allocation, fixed player teams, both use live ZMovePolicy. Ordinary items and one allowed gimmick item from floor10; chaos may use multiple equipped categories subject to engine limits. One player Tera ticket in eligible rules every battle. No recruitment, shop RNG, money, consumables or climb survival. Nine equally weighted themed routes; eight random floors per theme. Boss tests intentionally oversampled and kept separate. Random enemies use raw IV draw15. No claim of human win rates or population-weighted rates.',overall:summary(courses),byRule:Object.fromEntries(rules.map(rule=>[rule,summary(courses.filter(r=>r.rule===rule))])),byStage:Object.fromEntries([['early',courses.filter(r=>r.floor<50)],['first-gate',courses.filter(r=>r.floor===50)],['late',courses.filter(r=>r.floor>50&&r.floor<100)],['final',courses.filter(r=>r.floor===100)]].map(([name,rows])=>[name,summary(rows as Row[])])),byTenFloors:Array.from({length:10},(_,i)=>({from:i*10+1,to:(i+1)*10,...summary(courses.filter(r=>r.floor>i*10&&r.floor<=(i+1)*10))})),byCase:Object.fromEntries(playerCases.map(c=>[c.id,summary(courses.filter(r=>r.caseId===c.id))])),stageRule:['early','first-gate','late','final'].flatMap(stage=>rules.map(rule=>({stage,rule,...summary(courses.filter(r=>r.rule===rule&&(stage==='early'?r.floor<50:stage==='first-gate'?r.floor===50:stage==='late'?r.floor>50&&r.floor<100:r.floor===100)))}))),bosses:Object.entries(villainLeaders).map(([organization])=>({organization,name:bosses.find(r=>r.theme===organization)?.name,...summary(bosses.filter(r=>r.theme===organization))})),hardest:Object.entries(Object.groupBy(courses,r=>r.npcId)).map(([id,rows])=>({id,name:rows![0].name,...summary(rows!)})).filter(r=>r.completed>=48).sort((a,b)=>a.winRate-b.winRate).slice(0,12),errors:results.filter(r=>r.error)};
writeFileSync(prefix+'/report.json',JSON.stringify(report,null,2));
if(retryCheck){
 const cumulative=(rows:Row[],limit:number)=>{const good=rows.filter(r=>!r.error);return {samples:good.length,wins:good.filter(r=>r.winner==='Player'||r.retryOutcomes?.slice(0,limit).includes('Player')).length};};
 const retryReport={method:'Same three player Pokemon, unchanged moves/items/training, identical opponent/seed and full HP per attempt. Only order rotates [1,2,0], [2,0,1], [0,2,1] after losses. No extra items or Tera expenditure. Does not simulate a full climb, adaptive human planning, or a global three-retry budget.',actualBattles:results.length+results.reduce((n,r)=>n+(r.retryOutcomes?.length??0),0),errors:results.filter(r=>r.error),byBoss:Object.entries(Object.groupBy(results,r=>r.npcId)).map(([id,rows])=>({id,name:rows![0].name,attempts:[0,1,2,3].map(n=>({retryLimit:n,...cumulative(rows!,n)}))}))};
 writeFileSync(prefix+'/retry-report.json',JSON.stringify(retryReport,null,2)+'\n');
}
const pct=(n:number)=>(100*n).toFixed(1)+'%';
const md=['# 일반 모드 NPC 샘플 밸런스 1차 검사','',`2026-10-13. 총 ${results.length}전, 오류 ${report.errors.length}건. 재실행 ${replayed}전에서 전체 배틀 로그 해시가 일치했다.`, '', '승률은 플레이어 AI의 단판 승률이다. 100층 완주율이나 사람 승률이 아니다. 9개 지역을 같은 비중으로 검사했으며 빌런 보스는 과다 표집하므로 별도로 표시한다.', '', '양쪽 모두 실제 NPC의 ZMovePolicy를 사용한다. 네 플레이어 팀은 아래와 같으며 상대마다 바꾸지 않는다. 개체치와 포인트는 같은 층의 기존 곡선에 맞춘다. 10층부터 일반 도구와 룰별 기믹 도구를 지급하고 테라/혼합에는 매 배틀 테라권1개를 지급한다. 쇼핑 비용·재고 운·포획·소모품·영양제 추가분은 반영하지 않는다. 따라서 실전 경제와 연속 생존을 검증하는 검사는 아니다.', '', ...playerCases.map(c=>`- ${c.name}: ${c.species.map(pokemonName).join(' / ')}`), '', '## 구간별 플레이어 승률','', '| 구간 | 전투 수 | 승률 | 평균 턴 |','|---|---|---|---|',...Object.entries(report.byStage).map(([stage,s])=>`| ${{early:'1~49층', 'first-gate':'50층',late:'51~99층',final:'100층'}[stage]} | ${s.completed} | ${pct(s.winRate)} | ${s.averageTurns.toFixed(1)} |`), '', '## 룰별 플레이어 승률','', '| 룰 | 전체 | 1~49층 | 50층 | 51~99층 | 100층 |','|---|---|---|---|---|',...rules.map(rule=>`| ${battleRules[rule].name} | ${pct(report.byRule[rule].winRate)} | ${['early','first-gate','late','final'].map(stage=>pct(report.stageRule.find(s=>s.rule===rule&&s.stage===stage)!.winRate)).join(' | ')} |`), '', '## 10층 구간별','', '| 층 | 전투 수 | 승률 |','|---|---|---|',...report.byTenFloors.map(s=>`| ${s.from}~${s.to} | ${s.completed} | ${pct(s.winRate)} |`), '', '## 플레이어 팀별','', '| 팀 | 승률 |','|---|---|',...playerCases.map(c=>`| ${c.name} | ${pct(report.byCase[c.id].winRate)} |`), '', '## 빌런 보스 별도 검사','', '| 보스 | 전투 수 | 플레이어 승률 |','|---|---|---|',...report.bosses.map(s=>`| ${s.name} | ${s.completed} | ${pct(s.winRate)} |`), '', '## 까다로운 상대 후보','', '표집된 층·상성·기믹 단계가 서로 달라 최종 강함 순위로 해석하지 않는다.', '', '| 상대 | 전투 수 | 플레이어 승률 |','|---|---|---|',...report.hardest.map(s=>`| ${s.name} (${s.id}) | ${s.completed} | ${pct(s.winRate)} |`), '', '원본 전투 결과·고정 상대·시드·소스 해시는 `artifacts/normal-mode-balance-20261013/`에 저장했다. 수치를 근거로 게임 밸런스를 자동 변경하지 않았다.'];
const focusedMd=['# 일반 모드 극단 승률 추가 검사','',`2026-10-13. ${results.length}전, 오류 ${report.errors.length}건. ${leadCheck?'상대 순서6가지와 플레이어 선봉3가지를 교차해 검사했다.':'같은 팀·출전 순서에서 매치업별16개 배틀 시드를 검사했다.'}`, '', '승률은 네 고정 플레이어 팀의 AI 단판 결과다. 전체 일반 모드 평균으로 해석하지 않는다. 육성·도구 조건은 1차 검사와 같다.', '', '| 상대 | 전투 수 | 플레이어 승률 |','|---|---|---|',...Object.entries(Object.groupBy(results,r=>r.npcId)).map(([id,rows])=>{const s=summary(rows!);return `| ${rows![0].name} (${id}) | ${s.completed} | ${pct(s.winRate)} |`;}), '', `시간 표시를 제외한 배틀 이벤트를 ${replayed}전 재실행해 일치함을 확인했다. 원본은 ${prefix}/에 있다.`];
writeFileSync(process.env.NORMAL_BALANCE_DOCUMENT??(leadCheck?'docs/gameplay/NORMAL_MODE_BALANCE_LEADS.md':focused?'docs/gameplay/NORMAL_MODE_BALANCE_OUTLIERS.md':'docs/gameplay/NORMAL_MODE_BALANCE_CHECK.md'),(focused?focusedMd:md).join('\n')+'\n');console.log(JSON.stringify({overall:report.overall,byStage:report.byStage,byRule:report.byRule,bosses:report.bosses,replayed,errors:report.errors.length}));
