export const teraTypes = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy','Stellar'] as const;
export type TeraType = typeof teraTypes[number];
export type TeraTickets = Record<'p1'|'p2',number>;
export const TERA_TICKET_PRICE = 1350;
export const teraNames:Record<string,string> = {Normal:'노말',Fire:'불꽃',Water:'물',Electric:'전기',Grass:'풀',Ice:'얼음',Fighting:'격투',Poison:'독',Ground:'땅',Flying:'비행',Psychic:'에스퍼',Bug:'벌레',Rock:'바위',Ghost:'고스트',Dragon:'드래곤',Dark:'악',Steel:'강철',Fairy:'페어리',Stellar:'스텔라'};
export const teraColors:Record<string,string> = {Normal:'#a8a6b5',Fire:'#ff7045',Water:'#49a5ff',Electric:'#ffe05b',Grass:'#64dc83',Ice:'#8be6ed',Fighting:'#eb7661',Poison:'#cf7bef',Ground:'#dbb074',Flying:'#b7b7ff',Psychic:'#ff82b5',Bug:'#bad45b',Rock:'#c9b77a',Ghost:'#ac8be9',Dragon:'#8d87ff',Dark:'#a699b1',Steel:'#a3cedb',Fairy:'#ffb2e1',Stellar:'#a8f4f0'};
export function isTeraType(value:unknown):value is TeraType {return typeof value==='string' && (teraTypes as readonly string[]).includes(value);}
// Native engine restrictions for the two species with dedicated tera forms.
export function teraTypesForSpecies(name:string):readonly TeraType[]{
 if(name.startsWith('Terapagos'))return ['Stellar'];
 if(name.startsWith('Ogerpon'))return [name.includes('Hearthflame')?'Fire':name.includes('Wellspring')?'Water':name.includes('Cornerstone')?'Rock':'Grass'];
 return teraTypes;
}

