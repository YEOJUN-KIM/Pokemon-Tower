export type PokemonGender='M'|'F'|'N';
export const genderNames:Record<PokemonGender,string>={M:'수컷',F:'암컷',N:'무성'};
export function genderFromDetails(details:string):PokemonGender{return details.split(', ').find(part=>part==='M'||part==='F') as 'M'|'F' ?? 'N';}
