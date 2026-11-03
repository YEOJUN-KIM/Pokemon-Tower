// Late-game balance probe (beta.6 second pass).
// Usage: tsx scripts/probe-late-game-balance.ts [courses=100] [floors=40,49,50,60,70,80,90,95,100]
// Real generated opponents (one encounter per floor per course, different seeds per course), paired across conditions.
// Player side comes from the shared shopping model in scripts/lib/run-model.ts. This is a model player, not a human.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,type StatBlock,type TrainingProfile} from '../src/data/training';
import {runBattle,type Seed} from '../src/battle/run';
import {GimmickPolicy} from '../src/battle/gimmick-policy';
import type {Observation} from '../src/battle/policy';
import {FIRST_GIMMICK_FLOOR,isAbilitySupport,supportCatalog} from '../src/data/run-economy';
import {planSupport,SupportingPolicy} from './lib/support-plan';
import {pickGimmick} from './lib/run-model';
import {canEquipGimmick as _unused,megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {rewardCurve,shopRun,startRoster,topThree,mulberry,defaultOptions,bst,type ModelOptions,type PolicyName,type RunState} from './lib/run-model';

const courseCount=Number(process.argv[2]??100),floors=(process.argv[3]??'40,49,50,60,70,80,90,95,100').split(',').map(Number);
type Enemy={seed:Seed;enemy:string;trainer:string;role:string};
type Course={id:string;enemies:Record<number,Enemy>};
const courseFile=`artifacts/economy/late-game-courses-${courseCount}.json`;
function buildCourses():Course[]{
  if(existsSync(courseFile))return JSON.parse(readFileSync(courseFile,'utf8')).courses;
  const result:Course[]=[];
  for(let c=0;c<courseCount;c++){
    const store=new TowerStore(':memory:');
    try{
      const owner='late'+c;store.ensurePlayer(owner);const first=store.start(owner,starters),id=store.battle(first).run_id,enemies:Record<number,Enemy>={};
      for(const floor of floors){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);const row=store.battle(store.enter(owner,id,floor,starters)),boss=JSON.parse(row.boss??row.trainer??'{}');enemies[floor]={seed:JSON.parse(row.seed),enemy:row.opponent_team,trainer:boss.id??'unknown',role:boss.role??boss.kind??'normal'};}
      result.push({id,enemies});
    }finally{store.close();}
  }
  mkdirSync('artifacts/economy',{recursive:true});writeFileSync(courseFile,JSON.stringify({courses:result}));return result;
}
function trained(name:string):TrainingProfile{
  const p=defaultProfile(name),base=Showdown.Dex.species.get(name).baseStats;
  p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;p.evs=Object.fromEntries(statKeys.map(k=>[k,0])) as StatBlock;
  p.evs[base.atk>=base.spa?'atk':'spa']=32;p.evs.spe=21;p.evs.hp=13;p.nature=base.atk>=base.spa?'Adamant':'Modest';return p;
}
type Cond={id:string;label:string;extraGimmick?:boolean;shop:boolean;opts:ModelOptions;useSupport:boolean;policy:PolicyName};
const bal=(o:Partial<ModelOptions>={})=>({...defaultOptions('balanced'),...o});
const conditions:Cond[]=[
  {id:'baseline',label:'baseline: starters only',shop:false,opts:bal(),useSupport:false,policy:'balanced'},
  {id:'beta6-nosupport',label:'beta6 balanced, Support unused',shop:true,opts:bal(),useSupport:false,policy:'balanced'},
  {id:'beta6-support',label:'beta6 balanced + Support',shop:true,opts:bal(),useSupport:true,policy:'balanced'},
  {id:'noscout-support',label:'no Scout, Support used',shop:true,opts:bal({scout:false}),useSupport:true,policy:'balanced'},
  {id:'second-gimmick',label:'beta6 + Support + forced second gimmick',extraGimmick:true,shop:true,opts:bal(),useSupport:true,policy:'balanced'},
  {id:'beta6-nogimmick',label:'beta6 balanced + Support, no gimmick',shop:true,opts:bal({gimmick:false}),useSupport:true,policy:'balanced'},
  {id:'conservative-support',label:'conservative + Support',shop:true,opts:{...defaultOptions('conservative')},useSupport:true,policy:'conservative'},
  {id:'aggressive-support',label:'aggressive + Support',shop:true,opts:{...defaultOptions('aggressive')},useSupport:true,policy:'aggressive'},
];
const only=process.env.CONDITIONS?.split(',');
const courses=buildCourses(),curve=rewardCurve();
type Cell={wins:number;n:number;enemyBst:number;teamBst:number;supports:number;withRestricted:{w:number;n:number};byTrainer:Record<string,{w:number;n:number}>};
const result:Record<string,Record<number,Cell>>={};
for(const cond of conditions.filter(c=>!only||only.includes(c.id))){
  result[cond.id]={};
  for(const floor of floors){
    const cell:Cell={wins:0,n:0,enemyBst:0,teamBst:0,supports:0,withRestricted:{w:0,n:0},byTrainer:{}};
    for(let c=0;c<courses.length;c++){
      const course=courses[c],enemy=course.enemies[floor],random=mulberry(1000+c*7919+floor);
      const roster=startRoster(mulberry(5000+c));
      const state=cond.shop?shopRun(curve,mulberry(31000+c*131+floor),cond.opts,roster,floor):{coins:0,roster,items:{},support:{},freeClaimed:false,ledger:null as never};
      let team=topThree(state);
      // A player equips gimmick gear on members who actually fight: re-home gear held by benched members.
      const isGimmick=(item?:string)=>!!item&&(item===DYNAMAX_ITEM||!!megaStones[item]);
      const lost=Object.entries(state.items).filter(([n,item])=>isGimmick(item)&&!team.includes(n));
      for(const [n] of lost)delete state.items[n];
      for(let i=0;i<lost.length;i++){const free=team.filter(n=>!isGimmick(state.items[n]));const pick=pickGimmick(free,state.items,()=>true);if(pick)state.items[pick.holder]=pick.item;}
      if(cond.extraGimmick&&floor>FIRST_GIMMICK_FLOOR){const free=team.filter(n=>!(state.items[n]&&(state.items[n]===DYNAMAX_ITEM||megaStones[state.items[n]])));const pick=pickGimmick(free,state.items,()=>true);if(pick)state.items[pick.holder]=pick.item;}
      const profiles=Object.fromEntries(team.map(n=>[n,trained(n)])) as Record<string,TrainingProfile>;
      const items=Object.fromEntries(Object.entries(state.items).filter(([n])=>team.includes(n)));
      const plan=cond.useSupport?planSupport(state,cond.policy,floor,enemy.role,enemy.enemy):[];
      const stock=Object.fromEntries(plan.map(k=>[k,plan.filter(x=>x===k).length]));
      let win=false;
      try{
        const log=await runBattle({teams:{p1:packTeam(team,profiles,items),p2:enemy.enemy},seed:enemy.seed,player:new SupportingPolicy([...plan]),opponent:new GimmickPolicy(),battleItems:stock,...(floor<FIRST_GIMMICK_FLOOR?{rule:'basic' as const}:{})});
        win=log.winner==='Player';
      }catch(error){console.error('battle failed',cond.id,floor,c,(error as Error).message);continue;}
      void random;
      cell.n++;cell.wins+=Number(win);cell.supports+=plan.length;cell.teamBst+=team.reduce((s,n)=>s+bst(n),0);
      cell.enemyBst+=(Showdown.Teams.unpack(enemy.enemy)??[]).reduce((s,x)=>s+bst(x.species),0);
      const hasTop=team.some(n=>['restricted','mythical'].includes(scoutTier(n)));if(hasTop){cell.withRestricted.n++;cell.withRestricted.w+=Number(win);}
      const t=cell.byTrainer[enemy.trainer]??={w:0,n:0};t.n++;t.w+=Number(win);
    }
    result[cond.id][floor]=cell;
    console.log(cond.id,floor,`${cell.wins}/${cell.n}`,(cell.wins/Math.max(1,cell.n)*100).toFixed(0)+'%');
  }
}
import {scoutGroup} from '../src/data/scout';
function scoutTier(name:string){return scoutGroup(name);}
const out=Object.fromEntries(Object.entries(result).map(([id,byFloor])=>[id,Object.fromEntries(Object.entries(byFloor).map(([f,c])=>[f,{wins:c.wins,battles:c.n,winRate:+(c.wins/Math.max(1,c.n)).toFixed(3),meanTeamBst:Math.round(c.teamBst/Math.max(1,c.n)),meanEnemyBst:Math.round(c.enemyBst/Math.max(1,c.n)),supportsPerBattle:+(c.supports/Math.max(1,c.n)).toFixed(2),withTopScout:c.withRestricted,worstTrainers:Object.entries(c.byTrainer).filter(([,v])=>v.n>=3).sort((a,b)=>a[1].w/a[1].n-b[1].w/b[1].n).slice(0,12).map(([k,v])=>`${k} ${v.w}/${v.n}`)}]))]));
const file=process.env.LATE_GAME_OUT??'artifacts/economy/late-game-balance.json';
writeFileSync(file,JSON.stringify({note:'model player; paired courses; see docs/STATUS',courses:courses.length,floors,conditions:conditions.map(c=>({id:c.id,label:c.label})),results:out},null,1));
