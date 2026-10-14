import {eggGradeWeights,type EggGrade} from './egg-grades';
export const eggKinds=['normal','rare','superRare','shiny'] as const;
export type EggKind=typeof eggKinds[number];
export function highestEggKind(kinds:readonly EggKind[]):EggKind{
 return [...eggKinds].reverse().find(kind=>kinds.includes(kind))??'normal';
}
export const machinePokemonWeights=eggGradeWeights;
export const MACHINE_SHINY_WEIGHT=24;
export function machinePokemonKind(roll:number):EggGrade{
 if(!Number.isInteger(roll)||roll<0||roll>=10000)throw Error('Invalid egg machine roll');
 return roll<machinePokemonWeights.normal?'normal':roll<machinePokemonWeights.normal+machinePokemonWeights.rare?'rare':'superRare';
}
export function machineShiny(roll:number):boolean{
 if(!Number.isInteger(roll)||roll<0||roll>=10000)throw Error('Invalid shiny roll');
 return roll<MACHINE_SHINY_WEIGHT;
}
export const eggKindInfo={
 normal:{name:'일반 알',description:'다양한 포켓몬과 새로운 기술을 수집',image:'/sprites/eggs/normal.png'},
 rare:{name:'레어 알',description:'준전설·패러독스·울트라비스트 중 하나 확정',image:'/sprites/eggs/rare.png'},
 superRare:{name:'슈퍼레어 알',description:'초전설·환상의 포켓몬 중 하나 확정',image:'/sprites/eggs/super-rare.png'},
 shiny:{name:'이로치 알',description:'무작위 포켓몬의 이로치 외형 확정',image:'/sprites/eggs/shiny.png'},
} satisfies Record<EggKind,{name:string;description:string;image:string}>;
export function isEggKind(value:unknown):value is EggKind{return typeof value==='string'&&(eggKinds as readonly string[]).includes(value);}
export const rareEggWeights={sublegendary:4500,paradox:2500,ultrabeast:1500,legendary:1000,mythical:500} as const;
export type RareEggCategory=keyof typeof rareEggWeights;
export const rareEggNames:Record<RareEggCategory,string>={sublegendary:'준전설',paradox:'패러독스',ultrabeast:'울트라비스트',legendary:'초전설',mythical:'환상'};
export function rareEggCategory(roll:number):RareEggCategory{
 if(!Number.isInteger(roll)||roll<0||roll>=10000)throw Error('Invalid rare egg roll');
 let total=0;
 for(const [category,weight] of Object.entries(rareEggWeights)){total+=weight;if(roll<total)return category as RareEggCategory;}
 throw Error('Invalid rare egg weights');
}
