import type {RaidSnapshot} from '../data/raids';

export function validateRaidHP(raid:Pick<RaidSnapshot,'raidHpMultiplier'|'phases'>){
 if(raid.raidHpMultiplier===undefined){
  if(raid.phases.some(p=>p.hpRatio!==undefined))throw Error('Raid HP multiplier missing');
  return;
 }
 if(!Number.isFinite(raid.raidHpMultiplier)||raid.raidHpMultiplier<=0||raid.phases.some(p=>!Number.isFinite(p.hpRatio)||p.hpRatio!<=0||p.hpRatio!>1)||Math.abs(raid.phases.reduce((sum,p)=>sum+p.hpRatio!,0)-1)>1e-9)throw Error('Invalid raid HP allocation');
}

// Scale only the native current-form HP. Native Dynamax retains its own ratio;
// all five non-HP stats, ranks and damage formulas stay with the simulator.
export function raidPhaseHP(nativeBaseHP:number,nativeMaxHP:number,multiplier:number,ratio:number){
 const baseMaxhp=Math.max(1,Math.round(nativeBaseHP*multiplier*ratio));
 const maxhp=Math.max(1,Math.floor(baseMaxhp*nativeMaxHP/nativeBaseHP));
 if(!Number.isSafeInteger(baseMaxhp)||!Number.isSafeInteger(maxhp))throw Error('Invalid raid HP result');
 return {baseMaxhp,maxhp};
}
