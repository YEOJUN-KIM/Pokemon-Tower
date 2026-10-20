import chart from './type-chart.json' with {type:'json'};
const table:Record<string,Record<string,number>>=chart;
export function typeEffectiveness(attack:string,defending:string[]){return defending.reduce((n,type)=>n*(table[attack]?.[type]??1),1);}
export function publicMoveEffectiveness({type,defending,ability='',ownAbility='',move='',ignoreAbility=false}:{type:string;defending:string[];ability?:string;ownAbility?:string;move?:string;ignoreAbility?:boolean}){
 const id=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');ability=id(ability);ownAbility=id(ownAbility);move=id(move);
 if(['scrappy','mindseye'].includes(ownAbility)&&['Normal','Fighting'].includes(type))defending=defending.filter(t=>t!=='Ghost');
 let result=typeEffectiveness(type,defending);
 if(move==='freezedry')result=defending.reduce((n,t)=>n*(t==='Water'?2:table.Ice[t]??1),1);
 if(move==='flyingpress')result*=typeEffectiveness('Flying',defending);
 if(move==='thousandarrows'&&result===0)result=1;
 if(ignoreAbility||['moldbreaker','teravolt','turboblaze'].includes(ownAbility))return result;
 if(ability==='wonderguard'&&result<=1)return 0;
 if(ability==='levitate'&&type==='Ground'&&move!=='thousandarrows')return 0;
 if(ability==='flashfire'&&type==='Fire'||['waterabsorb','stormdrain','dryskin'].includes(ability)&&type==='Water'||['voltabsorb','lightningrod','motordrive'].includes(ability)&&type==='Electric'||ability==='sapsipper'&&type==='Grass')return 0;
 return result;
}
