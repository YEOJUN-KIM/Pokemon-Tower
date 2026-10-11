import {writeFile} from 'node:fs/promises';
import Showdown from 'pokemon-showdown';
const response=await fetch('https://pokeapi.co/api/v2/pokemon?limit=2000');
if(!response.ok)throw new Error('Could not load the Pokemon form catalog');
const catalog=await response.json(),ids=new Map(catalog.results.map(row=>[row.name,row.url.match(/\/(\d+)\/$/)[1]]));
const forms={};
for(const form of Showdown.Dex.species.all().filter(form=>form.name.includes('-Mega') && form.num>0)){
 const name=({'Meowstic-M-Mega':'meowstic-male-mega','Meowstic-F-Mega':'meowstic-female-mega'}[form.name]??form.name.toLowerCase());
 const spriteKey=ids.get(name);
 if(!spriteKey)throw new Error('Missing Mega image: '+form.name);
 forms[form.name]={baseSpecies:form.baseSpecies,spriteKey};
}
await writeFile('src/data/mega-preview-forms.json',JSON.stringify(forms,null,2)+'\n');
console.log('Imported '+Object.keys(forms).length+' Mega preview sprite identifiers from PokéAPI.');
