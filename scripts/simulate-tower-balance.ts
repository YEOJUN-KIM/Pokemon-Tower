import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,trainedStat,type StatBlock,type TrainingProfile} from '../src/data/training';
import {opponentProfile} from '../src/server/opponent-training';
import {encounterRandom} from '../src/server/opponent-team';
import {runBattle,engineVersion,FORMAT,type Seed} from '../src/battle/run';
import {TowerPolicy} from '../src/battle/tower-policy';
import {isShopFloor,upgrades,type UpgradeKind} from '../src/data/shop';

type Encounter={floor:number;seed:Seed;enemy:string;role:string;trainer:string;reward:number};
type Course={id:string;encounters:Encounter[]};
const phase=process.argv[2] ?? 'before',count=Number(process.env.BALANCE_SAMPLES ?? 24);
const path='artifacts/experiments/balance/balance-courses.json';mkdirSync('artifacts',{recursive:true});
let courses:Course[];
if(existsSync(path))courses=JSON.parse(readFileSync(path,'utf8')).courses;
else{
  courses=[];const store=new TowerStore(':memory:');
  try{for(let i=0;i<count;i++){
    const owner=`balance-${i}`;store.ensurePlayer(owner);const first=store.start(owner,starters),id=store.battle(first).run_id,encounters:Encounter[]=[];
    for(let floor=1;floor<=30;floor++){
      let battle=first;if(floor>1){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);battle=store.enter(owner,id,floor,starters);}
      const row=store.battle(battle),trainer=JSON.parse(row.boss ?? row.trainer ?? '{}'),seed:Seed=JSON.parse(row.seed),random=encounterRandom(seed);
      // Future datasets still model the old 0..31 IV baseline, even after production is tuned.
      const team=Showdown.Teams.unpack(row.opponent_team)!,profiles=Object.fromEntries(team.map(set=>{
        const profile=defaultProfile(set.species);profile.moves=set.moves;profile.evs=(set.evs ?? profile.evs) as StatBlock;
        profile.ivs=Object.fromEntries(statKeys.map(stat=>[stat,Math.floor(random()*32)])) as StatBlock;return [set.species,profile];
      }));
      encounters.push({floor,seed,enemy:packTeam(team.map(set=>set.species),profiles),role:trainer.role ?? 'trainer',trainer:trainer.id ?? 'unknown',reward:row.reward});
    }
    courses.push({id,encounters});
  }}finally{store.close();}
  writeFileSync(path,JSON.stringify({engineVersion,format:FORMAT,baseline:'0..31 IVs, production species/moves/points',courses},null,2));
}
const stages=[{id:'fresh',iv:0,points:0},{id:'mid',iv:15,points:33},{id:'trained',iv:31,points:66}];
function playerProfile(name:string,iv:number,points:number){
  const profile=defaultProfile(name),base=Showdown.Dex.species.get(name).baseStats;
  profile.ivs=Object.fromEntries(statKeys.map(stat=>[stat,iv])) as TrainingProfile['ivs'];
  profile.evs[base.atk>=base.spa ? 'atk' : 'spa']=Math.min(32,Math.ceil(points*.48));profile.evs.spe=Math.min(32,Math.floor(points*.32));profile.evs.hp=points-Object.values(profile.evs).reduce((s,n)=>s+n,0);
  return profile;
}
function chooseTeam(profiles:Record<string,TrainingProfile>){
  const chosen:string[]=[];
  while(chosen.length<3){const used=new Set(chosen.flatMap(n=>Showdown.Dex.species.get(n).types));const next=Object.keys(profiles).filter(n=>!chosen.includes(n)).sort((a,b)=>score(b)-score(a))[0];chosen.push(next);
    function score(name:string){const s=Showdown.Dex.species.get(name),p=profiles[name],stats=Object.fromEntries(statKeys.map(k=>[k,trainedStat(s.baseStats[k],p.ivs[k],p.evs[k],k,p.nature)]));return stats.hp+stats.def+stats.spd+stats.spe+Math.max(stats.atk,stats.spa)*1.4+s.types.filter(t=>!used.has(t)).length*35;}}
  return chosen;
}
function capture(enemy:string,profiles:Record<string,TrainingProfile>){
  const candidates=Showdown.Teams.unpack(enemy)!;
  const selected=candidates.sort((a,b)=>Showdown.Dex.species.get(b.species).bst-Showdown.Dex.species.get(a.species).bst)[0];
  const profile=profiles[selected.species] ?? playerProfile(selected.species,0,0);
  for(const stat of statKeys)profile.ivs[stat]=Math.max(profile.ivs[stat],selected.ivs?.[stat] ?? 31);
  // Captured moves are publicly available after a win; select by own stats, never the next enemy.
  const species=Showdown.Dex.species.get(selected.species);
  profile.moves=[...new Set([...profile.moves,...selected.moves])].sort((a,b)=>rank(b)-rank(a)).slice(0,4);
  function rank(name:string){const m=Showdown.Dex.moves.get(name);return m.category==='Status' ? 15 : (m.basePower || 40)*(species.types.includes(m.type) ? 1.5 : 1)*(m.category==='Physical' ? species.baseStats.atk : species.baseStats.spa);}
  profiles[selected.species]=profile;
  if(Object.keys(profiles).length>6){const weakest=Object.keys(profiles).filter(n=>n!==selected.species).sort((a,b)=>Showdown.Dex.species.get(a).bst-Showdown.Dex.species.get(b).bst)[0];delete profiles[weakest];}
}
const report={phase,engineVersion,format:FORMAT,courses:courses.length,notes:'Paired recorded live encounters. No held items. TowerPolicy on both sides, public battle observations only. Probes use unchanged starter teams; climbs recruit after wins, choose own-stat/type diversity without future opponent knowledge, buy attack/speed at real checkpoint prices. No TM shopping, nature optimisation or voluntary tactical switching. AI results are not human win rates.',stages:[] as unknown[]};
if(phase==='after')courses=courses.map(course=>({...course,encounters:course.encounters.map(encounter=>{
  const team=Showdown.Teams.unpack(encounter.enemy)!;
  const profiles=Object.fromEntries(team.map(set=>[set.species,opponentProfile(set.species,set.moves,encounter.floor,set.ivs as StatBlock)]));
  return {...encounter,enemy:packTeam(team.map(set=>set.species),profiles)};
})}));
for(const stage of stages){
  const probe=[];
  for(let floor=1;floor<=30;floor++){
    let wins=0,turns=0;const byTrainer:Record<string,{wins:number;battles:number}>={};
    for(const course of courses){const encounter=course.encounters[floor-1];const profiles=Object.fromEntries(starters.map(n=>[n,playerProfile(n,stage.iv,stage.points)]));
      const log=await runBattle({teams:{p1:packTeam(starters,profiles),p2:encounter.enemy},seed:encounter.seed,player:new TowerPolicy(),opponent:new TowerPolicy()});
      wins+=Number(log.winner==='Player');turns+=log.turns;const stat=byTrainer[encounter.trainer]??={wins:0,battles:0};stat.wins+=Number(log.winner==='Player');stat.battles++;
    }
    probe.push({floor,wins,battles:courses.length,rate:wins/courses.length,averageTurns:turns/courses.length,byTrainer});
  }
  const climbs=[];
  for(const course of courses){const profiles=Object.fromEntries(starters.map(n=>[n,playerProfile(n,stage.iv,stage.points)]));let coins=0,cleared=0,spent=0,boosts:UpgradeKind[]=[];
    for(const encounter of course.encounters){
      if(isShopFloor(encounter.floor,30)){boosts=[];for(const kind of ['attack','speed'] as const)if(coins>=upgrades[kind].price){coins-=upgrades[kind].price;spent+=upgrades[kind].price;boosts.push(kind);}}
      const team=chooseTeam(profiles),log=await runBattle({teams:{p1:packTeam(team,profiles),p2:encounter.enemy},seed:encounter.seed,player:new TowerPolicy(),opponent:new TowerPolicy(),upgrades:boosts});
      if(log.winner!=='Player')break;cleared=encounter.floor;coins+=encounter.reward;capture(encounter.enemy,profiles);
    }
    climbs.push({id:course.id,cleared,coins,spent,roster:Object.keys(profiles)});
  }
  const result={stage:stage.id,probe,climbs,averageCleared:climbs.reduce((s,c)=>s+c.cleared,0)/climbs.length,finished:climbs.filter(c=>c.cleared===30).length};
  report.stages.push(result);console.log(`${stage.id}: average ${result.averageCleared.toFixed(1)} floors, clears ${result.finished}/${climbs.length}; probe 1/5/10/20/30: ${[1,5,10,20,30].map(f=>probe[f-1].wins+'/'+courses.length).join(', ')}`);
}
writeFileSync(`artifacts/experiments/balance/balance-${phase}.json`,JSON.stringify(report,null,2));
