import zMoves from './z-moves.json' with {type:'json'};
import catalog from './move-catalog.json' with {type:'json'};
import gigantamaxMoves from './gigantamax-moves.json' with {type:'json'};
export type MoveInfo={name:string;type:string;category:string;power:number;accuracy:number|boolean;pp:number;description:string};
export const moveInfo:Record<string,MoveInfo>= {...catalog,...zMoves,...gigantamaxMoves};
export const moveTypeNames:Record<string,string>={Normal:'노말',Fire:'불꽃',Water:'물',Electric:'전기',Grass:'풀',Ice:'얼음',Fighting:'격투',Poison:'독',Ground:'땅',Flying:'비행',Psychic:'에스퍼',Bug:'벌레',Rock:'바위',Ghost:'고스트',Dragon:'드래곤',Dark:'악',Steel:'강철',Fairy:'페어리'};
export const moveCategoryNames:Record<string,string>={Physical:'물리',Special:'특수',Status:'변화'};
