import {effectNotice} from './battle-effects';

// Only effects whose engine hook runs before the move belong here. Reaction
// abilities (Color Change, contact damage, etc.) must retain protocol order.
const abilityPresentationTiming:Readonly<Record<string,'before-move'>>={Protean:'before-move',Libero:'before-move'};
export const isBeforeMoveAbility=(name:string)=>abilityPresentationTiming[name]==='before-move';
export function orderBattlePresentationEvents(protocol:readonly string[]):string[]{
 const lines=[...protocol];
 for(let index=0;index<lines.length;index++){
  const [,event,actor]=lines[index].split('|');
  if(event!=='move')continue;
  let end=index+1;
  while(end<lines.length){
   const notice=effectNotice(lines[end]);
   if(!notice||notice.actor!==actor||notice.kind!=='ability'||abilityPresentationTiming[notice.name]!=='before-move')break;
   end++;
  }
  if(end>index+1){const effects=lines.splice(index+1,end-index-1);lines.splice(index,0,...effects);index=end-1;}
 }
 return lines;
}
