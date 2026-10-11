import Showdown from 'pokemon-showdown';
import {trainedStat,type TrainingProfile} from '../../src/data/training';
import {directAnswer} from './sample-audit';

// Own collection only; static diagnostic flags never feed decisions.
export function compositionSnapshot(team:string[],profiles:Record<string,TrainingProfile>){
 const pool=structuredClone(profiles);
 const members=Object.entries(pool).map(([species,p])=>{
  const ids=p.moves.map(m=>Showdown.toID(m)),base=Showdown.Dex.species.get(species).baseStats;
  const speed=trainedStat(base.spe,p.ivs.spe,p.evs.spe+(p.runBonuses?.spe??0),'spe',p.nature);
  return {species,moves:p.moves,speed,screens:ids.some(m=>['reflect','lightscreen','auroraveil'].includes(m)),pairedScreens:ids.includes('auroraveil')||ids.includes('reflect')&&ids.includes('lightscreen'),room:ids.includes('trickroom'),shedinjaAnswers:directAnswer(species,p,'Shedinja','Wonder Guard').map(a=>a.move)};
 });
 const selected=members.filter(m=>team.includes(m.species));
 const roles={screens:selected.some(m=>m.screens),pairedScreens:selected.some(m=>m.pairedScreens),room:selected.some(m=>m.room),roomWithSlowAlly:selected.some(m=>m.room&&selected.some(a=>a.species!==m.species&&a.speed<=105))};
 const attackTypes=[...new Set(selected.flatMap(m=>m.moves.map(move=>Showdown.Dex.moves.get(move)).filter(m=>m.category!=='Status').map(m=>m.type)))].sort();
 const answers=selected.filter(m=>m.shedinjaAnswers.length).map(m=>m.species);
 const reserveAnswers=members.filter(m=>!team.includes(m.species)&&m.shedinjaAnswers.length).map(m=>m.species);
 return {team:[...team],profiles:pool,members,roles,attackTypes,shedinjaAnswerMembers:answers,reserveShedinjaAnswers:reserveAnswers};
}
export type CompositionSnapshot=ReturnType<typeof compositionSnapshot>;
export function compositionChanges(before:CompositionSnapshot,after:CompositionSnapshot){
 const lostRoles=(Object.keys(before.roles) as (keyof typeof before.roles)[]).filter(k=>before.roles[k]&&!after.roles[k]);
 return {lostRoles,gainedRoles:(Object.keys(after.roles) as (keyof typeof after.roles)[]).filter(k=>!before.roles[k]&&after.roles[k]),lostAttackTypes:before.attackTypes.filter(t=>!after.attackTypes.includes(t)),lostShedinjaAnswer:before.shedinjaAnswerMembers.length>0&&after.shedinjaAnswerMembers.length===0,answerLeftInReserve:after.shedinjaAnswerMembers.length===0&&after.reserveShedinjaAnswers.length>0,changedParty:before.team.join('|')!==after.team.join('|')};
}
