export const CURRENT_PROGRESSION='hundred-floor-v1' as const;
export type TowerProgression=typeof CURRENT_PROGRESSION|'legacy';

// Two fifty-floor climbs: the second opens below the first summit, then surpasses it.
// Saved runs without a progression record keep the previous generation rules.
export function towerDifficulty(floor:number) {
  if(!Number.isSafeInteger(floor)||floor<1||floor>100)throw Error('Unsupported progression floor');
  if(floor<=50)return {
    chapter:1,localFloor:floor,
    bstCeiling:Math.min(600,470+floor*2.6),
    ivCap:floor<=10?0:Math.min(12,Math.floor(1+floor*.22)),
    points:Math.max(0,Math.floor((floor-10)*.2)),
    legendary:false,mythical:false,
  };
  const localFloor=floor-50;
  return {
    chapter:2,localFloor,
    bstCeiling:localFloor<=10?550+(localFloor-1)*30/9:Math.min(720,585+(localFloor-11)*135/39),
    ivCap:localFloor<=10?Math.floor(7+(localFloor-1)*3/9):Math.floor(11+(localFloor-11)*20/39),
    points:localFloor<=10?Math.floor(3+(localFloor-1)*4/9):Math.floor(8+(localFloor-11)*58/39),
    legendary:floor>=75,mythical:floor>=90,
  };
}

export function progressionLabel(floor:number,totalFloors:number){
  if(totalFloors<100)return null;
  return floor===50?'첫 번째 관문':floor===100?'최종 관문':floor>=51&&floor<=60?'숨 고르기 구간':floor<50?'첫 번째 등반':'두 번째 등반';
}

// Common early trainers do not all have a Tera Orb. The once-per-team rule is unchanged.
export function opponentTeraTickets(floor:number,kind:'normal'|'elite'|'named'){
  return kind!=='normal' && floor>=20?1:0;
}

export function eliteChance(floor:number){
  // Compatibility curve for old runs. New random NPCs use npc-ranks.rankWeights.
  if(floor<11)return 0;
  if(floor<=50)return .08+(floor-11)*.17/39;
  if(floor<=60)return .08+(floor-51)*.04/9;
  return .14+(floor-61)*.36/39;
}
