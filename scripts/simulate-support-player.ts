import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {runBattle,engineVersion,FORMAT,type Seed} from '../src/battle/run';
import {CautiousSwitchingPolicy} from '../src/battle/switch-policy';
import {CompositionPolicy} from '../src/battle/composition-policy';
import {SupportPlayerPolicy} from '../src/battle/support-player-policy';
import {packTeam} from '../src/data/teams';
import {allowsRuleItem,allowsGimmick,isBattleRule} from '../src/data/run-rules';
import {towerThemes} from '../src/data/tower-themes';
import type {TrainingProfile} from '../src/data/training';
import type {Observation,Policy} from '../src/battle/policy';

const mode=process.env.SUPPORT_PLAYER??'v9';if(!['v7','v8','v9'].includes(mode))throw Error('Unknown support player');
const rule=process.env.SUPPORT_RULE??'basic';if(!isBattleRule(rule))throw Error('Unknown rule');
const cohort=process.env.SUPPORT_COHORT??'matched';if(!['matched','new'].includes(cohort))throw Error('Unknown cohort');
const phase=`support-player-${cohort}-${rule}-${mode}`;
const source=cohort==='new'?'artifacts/support-ai-new-courses.json':'artifacts/hundred-floor-six-z-courses.json';
type Encounter={floor:number;enemy:string;seed:Seed;trainer:string;enemyTeraTickets?:number};
type Course={id:string;theme:string;encounters:Encounter[]};
const all:Course[]=JSON.parse(readFileSync(source,'utf8')).courses;
const courses=Object.keys(towerThemes).map(theme=>{const course=all.find(c=>c.theme===theme);if(!course)throw Error('Missing theme');return course;});
type Case={id:string;team:string[];profiles:Record<string,TrainingProfile>;items:Record<string,string>};
const cases:Case[]=JSON.parse(readFileSync('artifacts/support-player-cases.json','utf8'));
const floors=[1,5,10,20,30,40,50,60,75,90,100];
const battleFile=`artifacts/${phase}-battles.jsonl`,turnFile=`artifacts/${phase}-turns.jsonl`;
writeFileSync(battleFile,'');writeFileSync(turnFile,'');
const summary={schemaVersion:1,phase,mode,rule,cohort,source,sourceHash:createHash('sha256').update(readFileSync(source)).digest('hex'),engineVersion,format:FORMAT,floors,courses:courses.map(c=>({id:c.id,theme:c.theme})),cases:[] as unknown[]};
for(const c of cases){
 let wins=0,total=0,turns=0,handoffs=0,protectedSetups=0,screenAttempts=0,screenActivations=0,roomActivations=0;
 const byFloor:Record<number,{battles:number;wins:number}>={},byTheme:Record<string,{battles:number;wins:number}>={};
 for(const course of courses)for(const floor of floors){
  const e=course.encounters.find(e=>e.floor===floor)!;
  const enemy=Showdown.Teams.unpack(e.enemy)!;for(const s of enemy)if(!allowsRuleItem(rule,s.item))s.item='';
  const items=Object.fromEntries(Object.entries(c.items).filter(([,item])=>allowsRuleItem(rule,item)));
  const teams={p1:packTeam(c.team,c.profiles,items),p2:Showdown.Teams.pack(enemy)};
  const tickets={p1:allowsGimmick(rule,'terastallize')?1:0,p2:allowsGimmick(rule,'terastallize')?e.enemyTeraTickets??1:0};
  const policy=mode==='v9'?new SupportPlayerPolicy():mode==='v8'?new CompositionPolicy():new CautiousSwitchingPolicy();
  // Independent observer snapshots BEFORE choice: no target action or post-action state leaks into input.
  const observer=new SupportPlayerPolicy();
  const samples:{observation:Observation;context:ReturnType<SupportPlayerPolicy['context']>;action:string;reason:string}[]=[];
  const player:Policy={switchingInformation:true,uncertainSwitchingInformation:true,choose:(o)=>{
   observer.observeOwnPokemon(o.ownTeam.find(p=>p.active));const context=structuredClone(observer.context());
   const action=policy.choose(o);const reason=policy instanceof SupportPlayerPolicy?policy.decisionReason:'baseline-'+mode;
   samples.push({observation:structuredClone(o),context,action,reason});observer.recordDecision(action,o);return action;
  }};
  const log=await runBattle({rule,teams,seed:e.seed,teraTickets:tickets,player,opponent:new CautiousSwitchingPolicy(),onPlayerLine:line=>{
   observer.consumePublicLine(line);if(policy instanceof SupportPlayerPolicy||policy instanceof CompositionPolicy)policy.consumePublicLine(line);
  }});
  for(const line of log.publicProtocol){const kind=line.startsWith('|-mega|')?'mega':line.startsWith('|-terastallize|')?'terastallize':line.startsWith('|-start|')&&line.includes('|Dynamax')?'dynamax':null;if(kind&&!allowsGimmick(rule,kind))throw Error('Forbidden gimmick');}
  const key=`${cohort}/${rule}/${mode}/${c.id}/${course.id}/${floor}`,won=log.winner==='Player';wins+=Number(won);total++;turns+=log.turns;
  handoffs+=samples.filter(s=>s.reason==='screen-handoff').length;protectedSetups+=samples.filter(s=>s.reason==='screen-setup').length;
  screenAttempts+=log.publicProtocol.filter(l=>l.startsWith('|move|p1a:')&&['Reflect','Light Screen','Aurora Veil'].includes(l.split('|')[3])).length;
  screenActivations+=log.publicProtocol.filter(l=>l.startsWith('|-sidestart|p1:')&&['Reflect','Light Screen','Aurora Veil'].includes(l.split('|')[3].replace(/^move: /,''))).length;
  roomActivations+=log.publicProtocol.filter(l=>l.startsWith('|-fieldstart|move: Trick Room')&&l.includes('p1a:')).length;
  for(const map of [byFloor,byTheme] as Record<string,{battles:number;wins:number}>[]){const name=map===byFloor?String(floor):course.theme;(map[name]??={battles:0,wins:0}).battles++;map[name].wins+=Number(won);}
  appendFileSync(battleFile,JSON.stringify({schemaVersion:1,key,phase,cohort,rule,mode,caseId:c.id,courseId:course.id,theme:course.theme,floor,trainer:e.trainer,seed:e.seed,engineVersion,format:FORMAT,teams,teraTickets:tickets,winner:log.winner,turns:log.turns,decisions:log.decisions.map(d=>({side:d.side,action:d.action})),publicProtocol:log.publicProtocol})+'\n');
  appendFileSync(turnFile,samples.map((sample,index)=>JSON.stringify({schemaVersion:1,battleKey:key,decisionIndex:index,cohort,rule,mode,caseId:c.id,courseId:course.id,theme:course.theme,floor,...sample,outcome:log.winner})).join('\n')+'\n');
 }
 summary.cases.push({id:c.id,battles:total,wins,winRate:wins/total,averageTurns:turns/total,handoffs,protectedSetups,screenAttempts,screenActivations,roomActivations,byFloor,byTheme});
 writeFileSync(`artifacts/${phase}-summary.json`,JSON.stringify(summary,null,2));console.log(`${c.id}: ${wins}/${total}, handoffs ${handoffs}, protected setups ${protectedSetups}`);
}
