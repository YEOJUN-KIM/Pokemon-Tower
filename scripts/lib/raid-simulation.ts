import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../../src/server/tower-store';
import {createRaidSnapshot} from '../../src/server/raid-events';
import {raidBossDefinitions,type RaidSnapshot} from '../../src/data/raids';
import {starters} from '../../src/data/teams';
import {trainedStat} from '../../src/data/training';
import {runBattle,type Seed,type BattleLog} from '../../src/battle/run';
import {ZMovePolicy} from '../../src/battle/z-move-policy';
import type {Policy,Observation} from '../../src/battle/policy';
import {encounterRandom} from '../../src/server/opponent-team';
import {raidPhaseHP,raidGateHP,raidPhaseEnd,resizeRaidHP} from '../../src/battle/raid-hp';
import {RaidSimulationPlayerPolicy} from './raid-simulation-player';
import {simulationTeams,simulationFloors,simulationPlayerTeam} from './raid-simulation-pool';
import {raidFloorBracket,type RaidFloorBracketId} from './raid-floor-brackets';

export function simulationSeed(key:string):Seed {const bytes=createHash('sha256').update(key).digest();return [0,2,4,6].map(i=>bytes.readUInt16BE(i)) as Seed;}
type Health={hp:number;max:number};
const health=(s:string):Health=>{const [hp,max]=s.split(' ')[0].split('/').map(Number);return {hp:Number.isFinite(hp)?hp:0,max:Number.isFinite(max)?max:0};};
const actor=(s:string)=>s.replace(/^(p[12])[a-z]:/,'$1:');
export class SimulationHealth {
 readonly own=new Map<string,Health>();
 phase=0;
 phaseMax:number[]=[];
 consume(line:string,side:'p1'|'p2'){
  const p=line.split('|'),kind=p[1];
  if(kind==='request'){
   const request=JSON.parse(p.slice(2).join('|'));
   for(const pokemon of request?.side?.pokemon??[])this.update(pokemon.ident,pokemon.condition);
  }
  if(!p[2]?.startsWith(side))return;
  if(['switch','drag','replace'].includes(kind)){
   this.update(p[2],p[4]);if(side==='p2'&&kind==='switch')this.phase++;
  }
  if(['-damage','-heal'].includes(kind))this.update(p[2],p[3]);
  if(kind==='-sethp')for(let i=2;i+1<p.length;i+=2)if(p[i].startsWith(side))this.update(p[i],p[i+1]);
  if(kind==='faint')this.update(p[2],'0 fnt');
 }
 private update(id:string,condition:string){
  const key=actor(id),value=health(condition);this.own.set(key,{hp:value.hp,max:value.max||this.own.get(key)?.max||0});
 }
}
export function effectiveRaidHP(raid:RaidSnapshot){
 const base=Showdown.Dex.species.get(raid.species);
 const normal=trainedStat(base.baseStats.hp,raid.individual.ivs.hp,raid.individual.evs.hp,'hp',raid.individual.nature);
 const phaseMax=raid.phases.map(phase=>{
  const native=trainedStat(Showdown.Dex.species.get(phase.species).baseStats.hp,raid.individual.ivs.hp,raid.individual.evs.hp,'hp',raid.individual.nature);
  if(raid.hpMode)return native*(['gigantamax','dynamax'].includes(phase.transformation)?2:1);
  return raidPhaseHP(native,native*(['gigantamax','dynamax'].includes(phase.transformation)?2:1),raid.raidHpMultiplier??1,phase.hpRatio??1).maxhp;
 });
 let previousHP=phaseMax[0],previousMax=phaseMax[0];
 const phases=phaseMax.map((max,index)=>{
  if(raid.hpMode!=='threshold-v1')return max;
  const start=index?resizeRaidHP(previousHP,previousMax,max):max,end=raidGateHP(max,raidPhaseEnd(raid,index));
  previousHP=end;previousMax=max;return start-end;
 });
 return {normal,phases,phaseMax,total:phases.reduce((a,b)=>a+b,0),multiplier:phases.reduce((a,b)=>a+b,0)/normal};
}
export type SimulationRow={bracket?:RaidFloorBracketId;bossId:string;boss:string;index:number;seed:Seed;floor:number;teamId:string;route:string;branchSpecies:string[];won:boolean;winner:string;turns:number;survivors:number;teamHP:number;lossPhase:number|null;bossPhaseHP:number|null;normalHP:number;phaseHP:number[];phaseMaxHP?:number[];effectiveHP:number;effectiveMultiplier:number;playerSwitches:number;observedPhases:number[];protocolHash:string};
export type SimulationOptions={bracket?:RaidFloorBracketId;bossId:string;runs:number;seedBase:string;onRow?:(row:SimulationRow)=>void;onLog?:(log:BattleLog)=>void};
export async function simulateRaid(options:SimulationOptions):Promise<SimulationRow[]>{
 const boss=raidBossDefinitions.find(b=>b.id===options.bossId);if(!boss)throw Error('Unknown boss');
 if(!Number.isSafeInteger(options.runs)||options.runs<1)throw Error('Runs must be a positive integer');
 const floors=(options.bracket?raidFloorBracket(options.bracket).floors:simulationFloors).filter(f=>f>=boss.minFloor);
 if(!floors.length)throw Error('No eligible simulation floor');
 // Preserve the original overall seed domain exactly. Bracket runs use an
 // independent, explicit domain and still pair floor/team across bosses.
 const seedBase=options.bracket?`${options.seedBase}:bracket:${options.bracket}`:options.seedBase;
 const store=new TowerStore(':memory:');store.ensurePlayer('sim');
 const run=store.battle(store.start('sim',starters,'basic')).run_id;
 const rows:SimulationRow[]=[],cache=new Map<string,ReturnType<typeof simulationPlayerTeam>>();
 try{for(let index=0;index<options.runs;index++){
  const floor=floors[index%floors.length];
  if(!floor)throw Error('No eligible simulation floor');
  // Pair the same floor/team across bosses; no boss matchup enters selection.
  const teamRandom=encounterRandom(simulationSeed(`${seedBase}:player:${index}`));
  const pool=simulationTeams.filter(t=>t.minFloor<=floor),team=pool[Math.floor(teamRandom()*pool.length)];
  const key=team.id+':'+floor;
  let player=cache.get(key);if(!player){player=simulationPlayerTeam(team,floor);cache.set(key,player);}
  const seed=simulationSeed(`${seedBase}:${boss.id}:${index}:battle`);
  const raid=createRaidSnapshot(store.db,run,floor,encounterRandom(simulationSeed(`${seedBase}:${boss.id}:${index}:snapshot`)),{bossId:boss.id});
  const hp=effectiveRaidHP(raid),p1=new SimulationHealth(),p2=new SimulationHealth(),delegate=new ZMovePolicy();
  // Metrics can inspect the boss's own private health, but the player policy
  // receives only runBattle's whitelisted public opponent observation.
  const opponent:Policy={switchingInformation:delegate.switchingInformation,observePublicLine:line=>{p2.consume(line,'p2');delegate.observePublicLine(line);},choose:(o:Observation)=>{
   const active=o.ownTeam.find(p=>p.active);
   if(active&&p2.phase){const measured=health(active.condition).max;const expected=hp.phaseMax[p2.phase-1];
    if(measured>0){
     if(measured!==expected)throw Error(`Live Phase HP mismatch ${boss.id} P${p2.phase}: ${measured} != ${expected}`);
     p2.phaseMax[p2.phase-1]=measured;
    }
   }
   return delegate.choose(o);
  }};
  const log=await runBattle({raid,teams:{p1:player.packed,p2:raid.opponentTeam},seed,rule:'basic',teraTickets:{p1:0,p2:0},player:new RaidSimulationPlayerPolicy(encounterRandom(simulationSeed(`${seedBase}:${boss.id}:${index}:policy`))),opponent,onPlayerLine:line=>p1.consume(line,'p1')});
  if(!['Player','Tower AI'].includes(log.winner??''))throw Error(`Non-binary result ${log.winner}: ${boss.id}/${index}`);
  const won=log.winner==='Player',members=[...p1.own.values()];
  if(members.length!==3||members.some(m=>m.max<=0))throw Error('Missing final player health');
  const activeBoss=[...p2.own.values()].at(-1),phase=p2.phase;
  if(!won&&(!activeBoss||activeBoss.max<=0))throw Error('Missing boss health');
  const row:SimulationRow={bossId:boss.id,boss:boss.species,index,seed,floor,teamId:team.id,route:raid.routeId,branchSpecies:raid.phases.slice(1).map(p=>p.species),won,winner:log.winner!,turns:log.turns,survivors:members.filter(m=>m.hp>0).length,teamHP:100*members.reduce((n,m)=>n+m.hp,0)/members.reduce((n,m)=>n+m.max,0),lossPhase:won?null:phase,bossPhaseHP:won?null:100*activeBoss!.hp/activeBoss!.max,normalHP:hp.normal,phaseHP:hp.phases,effectiveHP:hp.total,effectiveMultiplier:hp.multiplier,playerSwitches:log.decisions.filter(d=>d.side==='p1'&&d.action.startsWith('switch ')).length,observedPhases:p2.phaseMax,protocolHash:createHash('sha256').update(JSON.stringify(log.publicProtocol.filter(l=>!l.startsWith('|t:|')))).digest('hex')};
  if(options.bracket)row.bracket=options.bracket;
  if(raid.hpMode)row.phaseMaxHP=hp.phaseMax;
  rows.push(row);options.onRow?.(row);options.onLog?.(log);
 }}finally{store.close();}
 return rows;
}
export const mean=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
export const median=(values:number[])=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;};
export function summarize(rows:SimulationRow[]){
 const wins=rows.filter(r=>r.won),losses=rows.filter(r=>!r.won);
 return {battles:rows.length,playerWins:wins.length,bossWins:losses.length,winRate:100*wins.length/rows.length,avgTurns:mean(rows.map(r=>r.turns)),medianTurns:median(rows.map(r=>r.turns)),minTurns:Math.min(...rows.map(r=>r.turns)),maxTurns:Math.max(...rows.map(r=>r.turns)),avgSurvivors:mean(wins.map(r=>r.survivors)),avgHPLeft:mean(wins.map(r=>r.teamHP)),medianHPLeft:median(wins.map(r=>r.teamHP)),survivorShares:[1,2,3].map(n=>wins.length?100*wins.filter(r=>r.survivors===n).length/wins.length:null),avgBossPhaseHP:mean(losses.map(r=>r.bossPhaseHP!)),effectiveHP:mean(rows.map(r=>r.effectiveHP)),effectiveMultiplier:mean(rows.map(r=>r.effectiveMultiplier))};
}
