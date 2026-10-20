import {statNames,type StatKey} from './training';
export const upgrades = {
  attack: {name:'플러스파워',icon:'x-attack',description:'출전 팀의 공격·특수공격 20% 증가',price:300},
  speed: {name:'스피드업',icon:'x-speed',description:'출전 팀의 스피드 20% 증가',price:300},
  guard: {name:'이펙트가드',icon:'guard-spec',description:'상대에 의한 출전 팀의 능력치 하락을 방지',price:300},
  defense: {name:'디펜드업',icon:'x-defense',description:'출전 팀의 방어 20% 증가',price:300},
  specialAttack: {name:'스페셜업',icon:'x-sp-atk',description:'출전 팀의 특수공격 20% 증가',price:300},
  specialDefense: {name:'스페셜가드',icon:'x-sp-def',description:'출전 팀의 특수방어 20% 증가',price:300},
  accuracy: {name:'잘맞히기',icon:'x-accuracy',description:'출전 팀의 기술 명중률 20% 증가',price:300},
  critical: {name:'크리티컬커터',icon:'dire-hit',description:'출전 팀의 급소율 1단계 증가',price:300},
} as const;
export type UpgradeKind = keyof typeof upgrades;
export const UPGRADE_FLOORS = 5;
export const SHOP_INTERVAL=10;
export const SHOP_REROLL_LIMIT=1;
// Legacy shorter runs retain their saved five-floor shop cadence.
export function isShopFloor(floor:number,totalFloors:number) {return floor>1 && floor<=totalFloors && (floor-1)%(totalFloors>=100?SHOP_INTERVAL:UPGRADE_FLOORS)===0;}
// Initial shop selection and prices; balance after the tower content is expanded.
export const MACHINE_COUNT = 4;
export const machineMoves = [
  'Protect','Substitute','Toxic','Will-O-Wisp','Thunder Wave','Swords Dance','Calm Mind',
  'Bulk Up','Sunny Day','Rain Dance','Sandstorm','Light Screen','Reflect','Rest',
  'Flamethrower','Fire Blast','Thunderbolt','Thunder','Ice Beam','Blizzard','Surf',
  'Scald','Energy Ball','Solar Beam','Giga Drain','Sludge Bomb','Psychic','Shadow Ball',
  'Dark Pulse','Dragon Pulse','Flash Cannon','Earthquake','Rock Slide','Stone Edge',
  'Brick Break','Focus Blast','U-turn','Volt Switch','X-Scissor','Dazzling Gleam',
  'Close Combat','Draco Meteor','Overheat','Leaf Storm','Nasty Plot','Quiver Dance','Shell Smash',
] as const;

// Each category gets one free reroll per checkpoint.
export const rerollPrice=(count:number)=>0;
export const vitamins={hp:{name:"맥스업",icon:"hp-up"},atk:{name:"타우린",icon:"protein"},def:{name:"사포닌",icon:"iron"},spa:{name:"리보플라빈",icon:"calcium"},spd:{name:"키토산",icon:"zinc"},spe:{name:"알칼로이드",icon:"carbos"}} as const;
export const VITAMIN_BOOST=5;
export const VITAMIN_LIMIT=3;
export const vitaminPrice=(floor:number)=>1400+100*(floor-1);

export function vitaminDescription(stat:StatKey){return `${statNames[stat]} 능력 포인트를 ${VITAMIN_BOOST} 올린다.`;}
