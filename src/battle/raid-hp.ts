import type {RaidSnapshot} from '../data/raids';

export function validateRaidHP(raid:Pick<RaidSnapshot,'raidHpMultiplier'|'phases'|'hpMode'>){
 if(raid.hpMode!==undefined){
  if(!['threshold-v1','replacement-v1'].includes(raid.hpMode)||raid.phases.length<2||raid.phases.length>4||raid.phases.some(p=>!Number.isFinite(p.hpRatio)||p.hpRatio!<=0)||Math.abs(raid.phases.reduce((n,p)=>n+p.hpRatio!,0)-1)>1e-9)throw Error('Invalid Raid threshold allocation');
  return;
 }
 if(raid.raidHpMultiplier===undefined){
  if(raid.phases.some(p=>p.hpRatio!==undefined))throw Error('Raid HP multiplier missing');
  return;
 }
 if(!Number.isFinite(raid.raidHpMultiplier)||raid.raidHpMultiplier<=0||raid.phases.some(p=>!Number.isFinite(p.hpRatio)||p.hpRatio!<=0||p.hpRatio!>1)||Math.abs(raid.phases.reduce((sum,p)=>sum+p.hpRatio!,0)-1)>1e-9)throw Error('Invalid raid HP allocation');
}

// hpRatio is the interval's share of one continuous HP bar, not a fresh pool.
export function raidPhaseEnd(raid:Pick<RaidSnapshot,'phases'>,index:number){
 return Math.max(0,raid.phases.slice(index+1).reduce((n,p)=>n+p.hpRatio!,0));
}
export function raidGateHP(maxhp:number,endAt:number){return Math.round(maxhp*endAt);}
export function clampRaidDamage(hp:number,maxhp:number,endAt:number,damage:number){return Math.min(Math.max(0,Math.trunc(damage)),Math.max(0,hp-raidGateHP(maxhp,endAt)));}
export function resizeRaidHP(hp:number,oldMax:number,newMax:number){return Math.max(1,Math.min(newMax,Math.round(hp/oldMax*newMax)));}

// Scale only the native current-form HP. Native Dynamax retains its own ratio;
// all five non-HP stats, ranks and damage formulas stay with the simulator.
export function raidPhaseHP(nativeBaseHP:number,nativeMaxHP:number,multiplier:number,ratio:number){
 const baseMaxhp=Math.max(1,Math.round(nativeBaseHP*multiplier*ratio));
 const maxhp=Math.max(1,Math.floor(baseMaxhp*nativeMaxHP/nativeBaseHP));
 if(!Number.isSafeInteger(baseMaxhp)||!Number.isSafeInteger(maxhp))throw Error('Invalid raid HP result');
 return {baseMaxhp,maxhp};
}
