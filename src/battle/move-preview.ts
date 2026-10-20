import Showdown,{type Battle} from 'pokemon-showdown';

/** Native ModifyType/ModifyMove callbacks on an isolated current-state snapshot.
 * Preview hooks cannot consume the live PRNG, write logs or mutate ability/item state.
 * Tower's custom stat/item-budget hooks never change move types and are omitted.
 */
export function resolveBattleMovePreviews(battle:Battle,side:'p1'|'p2',moves:readonly string[]){
 if(!moves.length)return [];
 const source=Object.assign(Object.create(Object.getPrototypeOf(battle)),battle,{events:null}) as Battle;
 const snapshot=source.toJSON();
 const preview=Showdown.Battle.fromJSON(JSON.stringify(snapshot));
 preview.dex=battle.dex;
 try{
  const pokemon=(side==='p1'?preview.p1:preview.p2).active[0];
  if(!pokemon)return [];
  return moves.map(id=>{
   let move=preview.dex.getActiveMove(id);
   const target=move.target==='self'?pokemon:pokemon.side.foe.active[0];
   preview.setActiveMove(move,pokemon,target);
   preview.singleEvent('ModifyType',move,null,pokemon,target,move,move);
   preview.singleEvent('ModifyMove',move,null,pokemon,target,move,move);
   move=preview.runEvent('ModifyType',pokemon,target,move,move);
   move=preview.runEvent('ModifyMove',pokemon,target,move,move);
   preview.clearActiveMove();
   return {type:move.type,category:move.category};
  });
 }finally{preview.destroy();}
}
