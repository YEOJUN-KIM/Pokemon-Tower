const initials='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const initialKeys=['r','R','s','e','E','f','a','q','Q','t','T','d','w','W','c','z','x','v','g'];
const vowelKeys=['k','o','i','O','j','p','u','P','h','hk','ho','hl','y','n','nj','np','nl','b','m','ml','l'];
const finalKeys=['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g'];
const jamoKeys:Record<string,string>=Object.fromEntries([...initials].map((letter,index)=>[letter,initialKeys[index]]));
for(const [index,letter] of [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'].entries())jamoKeys[letter]=vowelKeys[index];
function normalize(value:string) {
  return [...value.normalize('NFC')].map(letter=>{
    const initial=letter.charCodeAt(0)-0x1100;
    return initial>=0 && initial<19 ? initials[initial] : letter;
  }).join('').trim().toLowerCase();
}
function compact(value:string) {
  return normalize(value).normalize('NFD').replace(/\p{M}/gu,'').normalize('NFC').replace(/[^\p{L}\p{N}]/gu,'');
}
function keyboardName(value:string) {
  return [...value].map(letter=>{
    const syllable=letter.charCodeAt(0)-0xac00;
    if(syllable<0 || syllable>=11172)return jamoKeys[letter] ?? letter;
    return initialKeys[Math.floor(syllable/588)]+vowelKeys[Math.floor(syllable%588/28)]+finalKeys[syllable%28];
  }).join('').toLowerCase();
}
export type PokemonNameIndex={names:string[];compactNames:string[];initials:string[];keyboards:string[]};
export type PokemonNameQuery={raw:string;compact:string;keyboard:string};
export function createPokemonNameIndex(name:string,englishName:string,aliases:string[]=[]):PokemonNameIndex {
  const names=[...new Set([name,englishName,...aliases].map(normalize))];
  return {names,compactNames:names.map(compact),keyboards:names.filter(value=>/[가-힣]/.test(value)).map(value=>compact(keyboardName(value))),initials:names.filter(value=>/[가-힣]/.test(value)).map(value=>[...value].map(letter=>{
    const syllable=letter.charCodeAt(0)-0xac00;
    return syllable>=0 && syllable<11172 ? initials[Math.floor(syllable/588)] : letter;
  }).join('').replace(/\s+/g,''))};
}
export function preparePokemonNameQuery(query:string):PokemonNameQuery {
  const raw=normalize(query);
  return {raw,compact:compact(raw),keyboard:compact(keyboardName(raw))};
}
export function matchesPokemonNameIndex(index:PokemonNameIndex,query:PokemonNameQuery) {
  if(!query.raw)return true;
  return index.names.some(name=>name.includes(query.raw))
    || (!!query.compact && index.compactNames.some(name=>name.includes(query.compact)))
    || index.initials.some(name=>name.includes(query.raw.replace(/\s+/g,'')))
    || (!!query.keyboard && index.keyboards.some(name=>name.includes(query.keyboard)));
}
export function matchesPokemonName(name:string,englishName:string,query:string,aliases:string[]=[]) {
  return matchesPokemonNameIndex(createPokemonNameIndex(name,englishName,aliases),preparePokemonNameQuery(query));
}
