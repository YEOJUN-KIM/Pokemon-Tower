// Marginal battle value of each Support tier (beta.6 final polish).
// Usage: tsx scripts/probe-support-value.ts [courses=300]. Uses the saved late-game courses; stock is granted so the
// result measures effect only (price/purchasing behaviour is in simulate-economy-second-pass.ts).
import {readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,type StatBlock,type TrainingProfile} from '../src/data/training';
import {runBattle} from '../src/battle/run';
import {GimmickPolicy} from '../src/battle/gimmick-policy';
import {FIRST_GIMMICK_FLOOR,supportCatalog,supportPrice} from '../src/data/run-economy';
import {rewardCurve,shopRun,startRoster,topThree,mulberry,defaultOptions} from './lib/run-model';
import {planSupport,SupportingPolicy} from './lib/support-plan';

const n=Number(process.argv[2]??300),floors=[50,90,100],courses=JSON.parse(readFileSync(`artifacts/economy/late-game-courses-300.json`,'utf8')).courses.slice(0,n);
const curve=rewardCurve();
const trained=(name:string):TrainingProfile=>{const p=defaultProfile(name),b=Showdown.Dex.species.get(name).baseStats;p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;p.evs=Object.fromEntries(statKeys.map(k=>[k,0])) as StatBlock;p.evs[b.atk>=b.spa?'atk':'spa']=32;p.evs.spe=21;p.evs.hp=13;p.nature=b.atk>=b.spa?'Adamant':'Modest';return p;};
const variants:{id:string;tiers:string[]}[]=[{id:'none',tiers:[]},{id:'basic',tiers:['basic']},{id:'advanced',tiers:['advanced']},{id:'special',tiers:['special']},{id:'basic+advanced',tiers:['basic','advanced']},{id:'all',tiers:['basic','advanced','special']}];
const stock=Object.fromEntries(Object.keys(supportCatalog).map(k=>[k,2]));
const out:Record<string,Record<number,{wins:number;n:number;items:number}>>={};
for(const v of variants){out[v.id]={};for(const floor of floors){const cell={wins:0,n:0,items:0};
  for(let c=0;c<courses.length;c++){
    const e=courses[c].enemies[floor],state=shopRun(curve,mulberry(31000+c*131+floor),defaultOptions('balanced'),startRoster(mulberry(5000+c)),floor);
    state.support={...stock};const team=topThree(state),profiles=Object.fromEntries(team.map(x=>[x,trained(x)])) as Record<string,TrainingProfile>;
    const items=Object.fromEntries(Object.entries(state.items).filter(([x])=>team.includes(x)));
    const plan=planSupport(state,'aggressive',floor,e.role,e.enemy,v.tiers),bag=Object.fromEntries(plan.map(k=>[k,plan.filter(x=>x===k).length]));
    const log=await runBattle({teams:{p1:packTeam(team,profiles,items),p2:e.enemy},seed:e.seed,player:new SupportingPolicy([...plan]),opponent:new GimmickPolicy(),battleItems:bag,...(floor<FIRST_GIMMICK_FLOOR?{rule:'basic' as const}:{})});
    cell.n++;cell.wins+=Number(log.winner==='Player');cell.items+=plan.length;
  }
  out[v.id][floor]=cell;console.log(v.id,floor,`${cell.wins}/${cell.n}`,(cell.wins/cell.n*100).toFixed(1)+'%','items/battle',(cell.items/cell.n).toFixed(2));}}
writeFileSync('artifacts/economy/support-value.json',JSON.stringify({courses:courses.length,floors,tierPrices:Object.fromEntries(['basic','advanced','special'].map(t=>[t,supportPrice(Object.keys(supportCatalog).find(k=>supportCatalog[k].tier===t)!)])),out},null,1));
