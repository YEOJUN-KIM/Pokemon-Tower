import type {StatKey,TrainingProfile} from './training';
import type {RewardOption} from './rewards';

// Temporary v1 tuning. Encounter chance/cooldown still belong to the shared event rules.
export const raidEventSettings={weight:20,minFloor:1,minRulesVersion:2} as const;
// Temporary manual playtest override. Set enabled=false to restore normal event selection.
// startFloor is the destination floor (3 means after clearing floor 2).
export const raidEventTestSettings={enabled:true,startFloor:3} as const;
export type RaidCategory='normal'|'paradox'|'ultra-beast'|'sub-legendary'|'legendary'|'mythical';
export const raidCategoryPresentation:Record<RaidCategory,{aura:string;entry:string}>={
 normal:{aura:'#91b2cd',entry:'강력한 포켓몬이 모습을 드러냈다!'},
 paradox:{aura:'#e5a754',entry:'낯선 기운과 함께 수수께끼의 포켓몬이 모습을 드러냈다!'},
 'ultra-beast':{aura:'#87e5d8',entry:'이질적인 기운과 함께 정체불명의 포켓몬이 모습을 드러냈다!'},
 'sub-legendary':{aura:'#9a8be3',entry:'압도적인 기운과 함께 희귀한 포켓몬이 모습을 드러냈다!'},
 legendary:{aura:'#f3c55c',entry:'주변을 짓누르는 위압감과 함께 전설의 포켓몬이 모습을 드러냈다!'},
 mythical:{aura:'#efa9df',entry:'신비로운 빛과 함께 환상의 포켓몬이 모습을 드러냈다!'},
};
export type RaidPhaseDefinition={species:string;ability:string;moves:readonly string[];transformation:'none'|'mega'|'aura';messages?:readonly [string,string];buffs?:Partial<Record<Exclude<StatKey,'hp'>,number>>};
export type RaidRouteDefinition={id:string;weight:number;attack:'atk'|'spa';recruit:{nature:string;ability:string;moves:readonly string[]};phases:readonly RaidPhaseDefinition[]};
export type RaidBossDefinition={id:string;species:string;category:RaidCategory;weight:number;minFloor:number;ivRule:{perfect:number;protected:readonly StatKey[]};shinyRule:'standard';battleTraining:'elite';rewardProfile:'elite';routes:readonly RaidRouteDefinition[]};
const garchompMoves=['Earthquake','Dragon Claw','Swords Dance','Iron Head'];
const xMoves=['Zen Headbutt','Drain Punch','Ice Punch','Bulk Up'];
const yMoves=['Psystrike','Aura Sphere','Ice Beam','Calm Mind'];
function mewtwoRoute(id:'x'|'y'):RaidRouteDefinition{
 const x=id==='x',form=x?'Mewtwo-Mega-X':'Mewtwo-Mega-Y',name=x?'메가뮤츠X':'메가뮤츠Y',moves=x?xMoves:yMoves,ability=x?'Steadfast':'Insomnia';
 return {id,weight:50,attack:x?'atk':'spa',recruit:{nature:x?'Jolly':'Timid',ability:'Pressure',moves},phases:[
  {species:'Mewtwo',ability:'Pressure',moves,transformation:'none'},
  {species:form,ability,moves,transformation:'mega',messages:['강한 기운이 뮤츠를 감싼다...',`뮤츠가 ${name}로 변했다!`]},
  {species:form,ability,moves,transformation:'aura',messages:[`${name}가 엄청난 힘을 방출한다...`,`${name}의 힘이 더욱 강해졌다!`],buffs:{[x?'atk':'spa']:1,spe:1}},
 ]};
}
export const raidBossDefinitions:readonly RaidBossDefinition[]=[
 {id:'garchomp',species:'Garchomp',category:'normal',weight:80,minFloor:1,ivRule:{perfect:4,protected:['atk','spe']},shinyRule:'standard',battleTraining:'elite',rewardProfile:'elite',routes:[{id:'mega',weight:1,attack:'atk',recruit:{nature:'Jolly',ability:'Rough Skin',moves:garchompMoves},phases:[
  {species:'Garchomp',ability:'Rough Skin',moves:garchompMoves,transformation:'none'},
  {species:'Garchomp-Mega',ability:'Sand Force',moves:garchompMoves,transformation:'mega',messages:['강한 기운이 한카리아스를 감싼다...','한카리아스가 메가한카리아스로 변했다!']},
 ]}]},
 {id:'mewtwo',species:'Mewtwo',category:'legendary',weight:20,minFloor:1,ivRule:{perfect:6,protected:[]},shinyRule:'standard',battleTraining:'elite',rewardProfile:'elite',routes:[mewtwoRoute('x'),mewtwoRoute('y')]},
];
export type RaidSnapshot={version:1;bossId:string;species:string;category:RaidCategory;routeId:string;individual:TrainingProfile;phases:RaidPhaseDefinition[];opponentTeam:string;recruitTeam:string;reward:RewardOption};
// The choice screen deliberately receives no build, route, shiny or reward details.
export type RaidEventView={spriteId:number;category:RaidCategory};
