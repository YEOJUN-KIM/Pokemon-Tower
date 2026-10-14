import {readFile,writeFile} from 'node:fs/promises';
import Showdown from 'pokemon-showdown';

const root='https://play.pokemonshowdown.com/sprites/';
const folders=['gen5','gen5-back','gen5ani','gen5ani-back'];
const indexes=await Promise.all(folders.map(async folder=>{
  const response=await fetch(`${root}${folder}/`,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`${folder}: ${response.status}`);
  const html=await response.text();
  return new Set([...html.matchAll(/href=["']([^"']+\.(?:png|gif))["']/g)].map(match=>decodeURIComponent(match[1]).split('/').at(-1)!));
}));
const dex=JSON.parse(await readFile('src/data/pokedex.json','utf8')) as {id:number;species:string}[];
const forms=JSON.parse(await readFile('src/data/battle-forms.json','utf8')) as Record<string,{id:number;spriteKey?:string|number}>;
type Entry={key:string;animatedFront:boolean;animatedBack:boolean};
const sprites:Record<string,Entry>={},missing:{id:string|number;species:string;key:string}[]=[];
for(const {id,species} of [...dex,...Object.entries(forms).map(([species,form])=>({id:form.spriteKey ?? form.id,species}))]) {
  // Some battle forms share their base image ID; never replace its normal dex art.
  if(sprites[id])continue;
  const key=Showdown.Dex.species.get(species).spriteid;
  if(indexes[0].has(`${key}.png`) && indexes[1].has(`${key}.png`)) {
    sprites[id]={key,animatedFront:indexes[2].has(`${key}.gif`),animatedBack:indexes[3].has(`${key}.gif`)};
  } else missing.push({id,species,key});
}
await writeFile('src/data/pixel-sprites.json',JSON.stringify(sprites,null,2)+'\n');
const coverage={checkedAt:new Date().toISOString(),source:root,folders,total:dex.length,staticBoth:dex.filter(entry=>sprites[entry.id]).length,animatedFront:dex.filter(entry=>sprites[entry.id]?.animatedFront).length,animatedBack:dex.filter(entry=>sprites[entry.id]?.animatedBack).length,animatedBoth:dex.filter(entry=>sprites[entry.id]?.animatedFront && sprites[entry.id]?.animatedBack).length,missing};
await writeFile('artifacts/qa/assets/reports/pixel-sprite-coverage.json',JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify(coverage));
