import type {MachinePartner} from '../shared/contracts';
export type BagPocket='tools'|'consumables'|'machines'|'battle'|'important'|'z';
export const bagPocketNames:Record<BagPocket,string>={tools:'도구',consumables:'소모품',machines:'기술머신',battle:'배틀 소모품',important:'중요한 도구',z:'Z크리스탈'};
export type BagEntry={id:string;pocket:BagPocket;name:string;description:string;icon:string;quantity?:number;holder?:string;action:'equip'|'vitamin'|'machine'|'exchange'|'voucher'|'view';targets:string[];move?:string;item?:string;voucher?:{drawIndex:number;candidates:string[]};};
export type BagView={entries:BagEntry[];pockets:BagPocket[];partners:Record<string,MachinePartner>;currentMoves:Record<string,string[]>};
