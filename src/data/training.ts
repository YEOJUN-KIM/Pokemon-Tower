export const statKeys=['hp','atk','def','spa','spd','spe'] as const;
export type StatKey=typeof statKeys[number];
export type StatBlock=Record<StatKey,number>;
export const statNames:Record<StatKey,string>={hp:'HP',atk:'공격',def:'방어',spa:'특수공격',spd:'특수방어',spe:'스피드'};
export const natures = [
  {id:'Hardy',name:'노력'}, {id:'Lonely',name:'외로움',plus:'atk',minus:'def'},
  {id:'Brave',name:'용감',plus:'atk',minus:'spe'}, {id:'Adamant',name:'고집',plus:'atk',minus:'spa'},
  {id:'Naughty',name:'개구쟁이',plus:'atk',minus:'spd'}, {id:'Bold',name:'대담',plus:'def',minus:'atk'},
  {id:'Docile',name:'온순'}, {id:'Relaxed',name:'무사태평',plus:'def',minus:'spe'},
  {id:'Impish',name:'장난꾸러기',plus:'def',minus:'spa'}, {id:'Lax',name:'촐랑',plus:'def',minus:'spd'},
  {id:'Timid',name:'겁쟁이',plus:'spe',minus:'atk'}, {id:'Hasty',name:'성급',plus:'spe',minus:'def'},
  {id:'Serious',name:'성실'}, {id:'Jolly',name:'명랑',plus:'spe',minus:'spa'},
  {id:'Naive',name:'천진난만',plus:'spe',minus:'spd'}, {id:'Modest',name:'조심',plus:'spa',minus:'atk'},
  {id:'Mild',name:'의젓',plus:'spa',minus:'def'}, {id:'Quiet',name:'냉정',plus:'spa',minus:'spe'},
  {id:'Bashful',name:'수줍음'}, {id:'Rash',name:'덜렁',plus:'spa',minus:'spd'},
  {id:'Calm',name:'차분',plus:'spd',minus:'atk'}, {id:'Gentle',name:'얌전',plus:'spd',minus:'def'},
  {id:'Sassy',name:'건방',plus:'spd',minus:'spe'}, {id:'Careful',name:'신중',plus:'spd',minus:'spa'},
  {id:'Quirky',name:'변덕'},
] satisfies {id:string;name:string;plus?:StatKey;minus?:StatKey}[];
export function natureLabel(id:string) {
  const nature=natures.find(value=>value.id===id) ?? natures.find(value=>value.id==='Serious')!;
  return `${nature.name} · ${nature.plus && nature.minus ? `${statNames[nature.plus]} ↑ / ${statNames[nature.minus]} ↓` : '능력치 보정 없음'}`;
}
// evs stores stat points for new profiles; unmarked snapshots retain legacy EV rules.
export type TrainingProfile={forme?:string;gender?:import('./gender').PokemonGender;shiny?:boolean;ivs:StatBlock;evs:StatBlock;moves:string[];ability:string;nature:string;teraType?:import('./tera').TeraType;statSystem?:'points';runBonuses?:Partial<StatBlock>};
export type FormTrainingSettings={moves:string[];ability:string;teraType:import('./tera').TeraType};
export type FormOption={species:string;name:string;spriteKey:string;moves:string[];ability:string;abilities:string[];baseStats:StatBlock;teraType:string;requiredItem?:string;settings?:FormTrainingSettings;learnableMoves?:string[];selfMoves?:string[]};
export type TrainingView={formOptions?:FormOption[];genders?:import('./gender').PokemonGender[];species:string;profile:TrainingProfile;revision:number;abilities:string[];learnableMoves:string[];selfMoves:string[];unlockedMoves:string[];baseStats:StatBlock};
export function trainedStat(base:number,iv:number,points:number,key:StatKey,natureId:string) {
  if(key==='hp' && base===1)return 1;
  const neutral=base+Math.floor(iv/2)+points+(key==='hp' ? 60 : 5);
  const nature=natures.find(value=>value.id===natureId);
  return Math.floor(neutral*(nature?.plus===key ? 110 : nature?.minus===key ? 90 : 100)/100);
}
export type IVGain={species:string;changes:{stat:StatKey;from:number;to:number}[]};
export type MoveSwap={move:string;slot:number};
export type MoveGain={species:string;moves:string[];equipped?:{move:string;replaced:string;slot:number}};
export const TRAINING_POINT_PRICE=8;
export const INITIAL_GROWTH_POINTS=TRAINING_POINT_PRICE*32;
export function trainingCost(before:TrainingProfile,after:TrainingProfile) {
  return statKeys.reduce((cost,key)=>cost+Math.max(0,after.evs[key]-before.evs[key])*TRAINING_POINT_PRICE,0)
    +(after.ability!==before.ability ? 50 : 0)
    +(after.nature!==before.nature ? 50 : 0);
}
