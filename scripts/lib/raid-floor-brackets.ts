export const raidFloorBrackets=[
 {id:'early',name:'Early',min:1,max:30,floors:[5,15,25]},
 {id:'mid',name:'Mid',min:31,max:60,floors:[35,45,55]},
 {id:'late',name:'Late',min:61,max:80,floors:[65,75]},
 {id:'endgame',name:'Endgame',min:81,max:100,floors:[85,95]},
] as const;
export type RaidFloorBracketId=typeof raidFloorBrackets[number]['id'];
export function raidFloorBracket(id:RaidFloorBracketId){const bracket=raidFloorBrackets.find(b=>b.id===id);if(!bracket)throw Error(`Unknown floor bracket ${id}`);return bracket;}
export function endgameDifficulty(rate:number){return rate<40?'너무 강함':rate<=65?'적당히 어려움':rate<=80?'비교적 쉬움':'너무 쉬움';}
