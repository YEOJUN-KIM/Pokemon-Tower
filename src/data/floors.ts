import type {PokemonSpecies} from './teams';
export type Floor = {number: number; name: string; opponents: readonly [PokemonSpecies, PokemonSpecies, PokemonSpecies]; reward: number};
// Provisional compositions: a gentler first floor, then more varied teams and late complementary types.
const initialFloors = [
  {number: 1, name: '첫 번째 승부', opponents: ['Pikachu', 'Golem', 'Cloyster'], reward: 100},
  {number: 2, name: '새로운 파트너', opponents: ['Arcanine', 'Venusaur', 'Blastoise'], reward: 150},
  {number: 3, name: '첫 번째 고비', opponents: ['Snorlax', 'Charizard', 'Gyarados'], reward: 200},
  {number: 4, name: '단단한 방어선', opponents: ['Golem', 'Raichu', 'Cloyster'], reward: 250},
  {number: 5, name: '특수 공격의 시험', opponents: ['Espeon', 'Gengar', 'Lucario'], reward: 450},
  {number: 6, name: '속도와 방어', opponents: ['Jolteon', 'Lapras', 'Scizor'], reward: 350},
  {number: 7, name: '드래곤의 문', opponents: ['Dragonite', 'Arcanine', 'Venusaur'], reward: 400},
  {number: 8, name: '모래바람의 층', opponents: ['Tyranitar', 'Gyarados', 'Gengar'], reward: 450},
  {number: 9, name: '정상으로 가는 길', opponents: ['Metagross', 'Garchomp', 'Lapras'], reward: 500},
  {number: 10, name: '타워의 정상', opponents: ['Garchomp', 'Metagross', 'Dragonite'], reward: 550},
] as const satisfies readonly Floor[];
// Content expansion first; reward and encounter balance remain provisional.
export const floors:readonly Floor[]=[...initialFloors.map(floor=>({...floor,name:floor.number===10 ? '첫 번째 챔피언 관문' : floor.name})),
  ...Array.from({length:90},(_,index):Floor=>{const number=index+11;return {number,name:number===100 ? '타워의 정상' : number===50 ? '첫 번째 관문' : number>=51&&number<=60 ? '숨 고르기 구간' : number%10===0 ? '챔피언 관문' : number%5===0 ? '관장의 시험' : '더 높은 곳으로',opponents:initialFloors[(number-1)%10].opponents,reward:100+(number-1)*50+(number%5===0 && number%10!==0 ? 150 : 0)};})];
