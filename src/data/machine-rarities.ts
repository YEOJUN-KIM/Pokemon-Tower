import {machineMoves,MACHINE_COUNT} from './shop';
import type {ItemRarity} from './held-item-shop';

// Provisional grades account for reliability, utility and setup potential, not just power.
export const machineRarities:Record<typeof machineMoves[number],ItemRarity>={
  Protect:'rare',Substitute:'unique',Toxic:'unique','Will-O-Wisp':'unique','Thunder Wave':'rare',
  'Swords Dance':'epic','Calm Mind':'epic','Bulk Up':'unique','Sunny Day':'uncommon','Rain Dance':'uncommon',
  Sandstorm:'uncommon','Light Screen':'rare',Reflect:'rare',Rest:'uncommon',
  Flamethrower:'unique','Fire Blast':'unique',Thunderbolt:'unique',Thunder:'rare','Ice Beam':'unique',Blizzard:'rare',
  Surf:'rare',Scald:'epic','Energy Ball':'rare','Solar Beam':'uncommon','Giga Drain':'unique','Sludge Bomb':'unique',
  Psychic:'unique','Shadow Ball':'unique','Dark Pulse':'rare','Dragon Pulse':'rare','Flash Cannon':'rare',
  Earthquake:'epic','Rock Slide':'rare','Stone Edge':'unique','Brick Break':'uncommon','Focus Blast':'rare',
  'U-turn':'unique','Volt Switch':'unique','X-Scissor':'uncommon','Dazzling Gleam':'rare',
  'Close Combat':'epic','Draco Meteor':'epic',Overheat:'unique','Leaf Storm':'unique','Nasty Plot':'epic',
  'Quiver Dance':'legendary','Shell Smash':'legendary',
};
export function machineRarity(move:string):ItemRarity{return machineRarities[move as keyof typeof machineRarities] ?? 'uncommon';}
export const machinePrices:Record<ItemRarity,number>={uncommon:150,rare:300,unique:600,epic:975,legendary:1500};
export function machinePrice(move:string):number{return machinePrices[machineRarity(move)];}
export function machineRarityWeights(clearedFloor:number):Record<ItemRarity,number>{
  if(clearedFloor>=45)return {uncommon:15,rare:28,unique:37,epic:16,legendary:4};
  if(clearedFloor>=40)return {uncommon:18,rare:31,unique:35,epic:13,legendary:3};
  if(clearedFloor>=35)return {uncommon:23,rare:33,unique:31,epic:11,legendary:2};
  if(clearedFloor>=30)return {uncommon:28,rare:35,unique:27,epic:8.5,legendary:1.5};
  if(clearedFloor>=25)return {uncommon:35,rare:36,unique:22,epic:6,legendary:1};
  if(clearedFloor>=20)return {uncommon:45,rare:34,unique:17,epic:3.5,legendary:0.5};
  if(clearedFloor>=15)return {uncommon:55,rare:31,unique:12,epic:1.8,legendary:0.2};
  if(clearedFloor>=10)return {uncommon:65,rare:27,unique:7,epic:0.9,legendary:0.1};
  return {uncommon:75,rare:21,unique:3.5,epic:0.49,legendary:0.01};
}
export function rollMachineOffers<T extends {move:string}>(candidates:readonly T[],clearedFloor:number,random:()=>number):T[]{
  const remaining=[...candidates],result:T[]=[],weights=machineRarityWeights(clearedFloor);
  while(result.length<MACHINE_COUNT && remaining.length){
    const groups=(Object.keys(weights) as ItemRarity[]).map(rarity=>({weight:weights[rarity],items:remaining.filter(item=>machineRarity(item.move)===rarity)})).filter(group=>group.items.length);
    let draw=random()*groups.reduce((sum,group)=>sum+group.weight,0),selected=groups.at(-1)!;
    for(const group of groups){draw-=group.weight;if(draw<0){selected=group;break;}}
    const offer=selected.items[Math.floor(random()*selected.items.length)];result.push(offer);remaining.splice(remaining.indexOf(offer),1);
  }
  return result;
}
