// beta.6 player-side probe at floors 49/50/90/100. Usage: tsx scripts/probe-beta6-floors.ts [courses=12]
// This is a small "1차 probe", not a balance verdict: opponents are real generated encounters, the player
// side is a trained 3-Pokemon team (IV 31, 66 points). `baseline` keeps the three starters; `beta6` swaps in
// the best Scout candidates a greedy buyer could afford up to that floor and adds the free 50F gimmick.
// Support cards are not modeled here, so beta6 slightly understates the shop.
import {mkdirSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,type StatBlock,type TrainingProfile} from '../src/data/training';
import {runBattle,type Seed} from '../src/battle/run';
import {GimmickPolicy} from '../src/battle/gimmick-policy';
import {canEquipGimmick,megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {isShopFloor} from '../src/data/shop';
import {rollScoutDraws} from '../src/data/scout';
import {FIRST_GIMMICK_FLOOR} from '../src/data/run-economy';
import {mulberry} from './simulate-scout-rarity';

const count=Number(process.argv[2]??12),floors=[49,50,90,100];
type Course={rewards:number[];enemies:Record<number,{seed:Seed;enemy:string}>};
function courses(){
  const result:Course[]=[];
  for(let c=0;c<count;c++){
    const store=new TowerStore(':memory:');
    try{
      const owner='probe'+c;store.ensurePlayer(owner);const first=store.start(owner,starters),id=store.battle(first).run_id,course:Course={rewards:[],enemies:{}};
      for(let floor=1;floor<=100;floor++){
        let battle=first;if(floor>1){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);battle=store.enter(owner,id,floor,starters);}
        const row=store.battle(battle);course.rewards.push(row.reward);
        if(floors.includes(floor))course.enemies[floor]={seed:JSON.parse(row.seed),enemy:row.opponent_team};
      }
      result.push(course);
    }finally{store.close();}
  }
  return result;
}
function trained(name:string){
  const p=defaultProfile(name),base=Showdown.Dex.species.get(name).baseStats;
  p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;
  p.evs=Object.fromEntries(statKeys.map(k=>[k,0])) as StatBlock;
  p.evs[base.atk>=base.spa?'atk':'spa']=32;p.evs.spe=21;p.evs.hp=13;p.nature=base.atk>=base.spa?'Adamant':'Modest';return p;
}
const bst=(name:string)=>Showdown.Dex.species.get(name).bst;
// Greedy buyer: at each shop spend up to 70% of the coins on the best-BST Scout candidate it can afford.
function scoutedRoster(course:Course,upTo:number,random:()=>number){
  const roster=[...starters];let coins=0;
  for(let floor=1;floor<upTo;floor++){
    coins+=course.rewards[floor-1];
    if(!isShopFloor(floor,100))continue;
    const best=rollScoutDraws(floor-1,random,new Set(roster)).filter(d=>d.price<=coins*0.7).sort((a,b)=>bst(b.species)-bst(a.species))[0];
    if(best){coins-=best.price;roster.push(best.species);}
  }
  return roster.sort((a,b)=>bst(b)-bst(a)).slice(0,3);
}
function gimmickItems(team:string[]){
  const items:Record<string,string>={};
  for(const name of team)for(const stone of Object.keys(megaStones))if(!Object.values(items).length&&canEquipGimmick(name,stone)){items[name]=stone;}
  const dynamaxUser=team.find(name=>canEquipGimmick(name,DYNAMAX_ITEM));
  if(!Object.keys(items).length&&dynamaxUser)items[dynamaxUser]=DYNAMAX_ITEM;
  return items;
}
const set=courses(),random=mulberry(4242),report:Record<string,unknown>={note:'1st probe, small samples, Support cards not modeled',courses:count,results:[] as unknown[]};
for(const floor of floors){
  const row:Record<string,unknown>={floor};
  for(const mode of ['baseline','beta6'] as const){
    let wins=0;const rosters:string[][]=[];
    for(const course of set){
      const team=mode==='baseline'?[...starters]:scoutedRoster(course,floor,random),profiles=Object.fromEntries(team.map(n=>[n,trained(n)])) as Record<string,TrainingProfile>;
      const items=mode==='beta6'&&floor>=FIRST_GIMMICK_FLOOR?gimmickItems(team):{};
      const e=course.enemies[floor];
      const log=await runBattle({teams:{p1:packTeam(team,profiles,items),p2:e.enemy},seed:e.seed,player:new GimmickPolicy(),opponent:new GimmickPolicy(),...(mode==='baseline'||floor<FIRST_GIMMICK_FLOOR?{rule:'basic' as const}:{})});
      wins+=Number(log.winner==='Player');rosters.push(team);
    }
    row[mode]={wins,battles:count,winRate:+(wins/count).toFixed(3)};if(mode==='beta6')row.sampleRoster=rosters[0];
  }
  (report.results as unknown[]).push(row);console.log(JSON.stringify(row));
}
mkdirSync('artifacts/economy',{recursive:true});writeFileSync('artifacts/economy/beta6-floor-probe.json',JSON.stringify(report,null,1));
