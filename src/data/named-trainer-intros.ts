// Only verified pre-battle excerpts. Omitted IDs intentionally have no quote.
export const namedTrainerIntros:Record<string,{text:string;game:string;source:string}>={
 'named-lance':{text:'드래곤 조련사 목호! 자아, 간다!',game:'금·은 / 하트골드·소울실버',source:'https://d.namu.moe/w/목호'},
 'named-red':{text:'……………… ………………',game:'하트골드·소울실버',source:'https://bulbapedia.bulbagarden.net/wiki/Red_(game)/Quotes'},
 'named-red-kanto':{text:'… …!',game:'레츠고! 피카츄·레츠고! 이브이',source:'https://bulbapedia.bulbagarden.net/wiki/Red_(game)/Quotes'},
};
export function namedTrainerIntro(id:string):string{return namedTrainerIntros[id]?.text??'';}
