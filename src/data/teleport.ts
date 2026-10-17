// Provisional registry weight. Tune with the complete event roster later.
export const teleportEventSettings={weight:10,minRulesVersion:2} as const;
export type TeleportEventSnapshot={segment:1|2;originFloor:number;destinationFloor:number};
export function teleportSegment(floor:number):1|2|null {
 return floor>=1&&floor<=48?1:floor>=51&&floor<=98?2:null;
}
export function createTeleportSnapshot(floor:number,roll:(max:number)=>number):TeleportEventSnapshot {
 const segment=teleportSegment(floor);
 if(!segment)throw Error('Invalid teleport origin');
 return {segment,originFloor:floor,destinationFloor:(segment===1?1:51)+roll(50)};
}
