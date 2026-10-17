import {vitamins} from '../data/shop';
export type VitaminUsage={counts:Record<string,number>;limit:number;usedStats:string[]};
export function vitaminDisabledReason(usage:VitaminUsage|undefined,species:string,name:string){
 if(!usage)return undefined;
 if((usage.counts[species]??0)>=usage.limit)return '영양제 한도 도달';
 const stat=Object.entries(vitamins).find(([,vitamin])=>vitamin.name===name)?.[0];
 if(stat&&usage.usedStats.includes(stat))return '이번 층에서 이미 사용한 영양제';
 return undefined;
}
