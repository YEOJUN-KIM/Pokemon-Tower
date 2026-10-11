import {readFile,writeFile} from 'node:fs/promises';
import Showdown from 'pokemon-showdown';

function csv(text){let header,rows=[],row=[],field='',quoted=false;const commit=()=>{row.push(field.replace(/\r$/,''));field='';if(!header)header=row;else if(row.length===header.length)rows.push(Object.fromEntries(header.map((key,i)=>[key,row[i]])));row=[];};for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===','){row.push(field);field='';}else if(!quoted&&c==='\n')commit();else field+=c;}if(field||row.length)commit();return rows;}
const cache='.data/import-cache/ability_flavor_text.csv';let flavor;
try{flavor=await readFile(cache,'utf8');}catch{const response=await fetch('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/ability_flavor_text.csv');if(!response.ok)throw Error(`HTTP ${response.status}`);flavor=await response.text();await writeFile(cache,flavor);}
const ids=new Map(csv(await readFile('.data/import-cache/abilities.csv','utf8')).map(row=>[row.id,Showdown.Dex.abilities.get(row.identifier).name]));
const result=Object.fromEntries(Showdown.Dex.abilities.all().map(ability=>[ability.name,ability.shortDesc]));
for(const row of csv(flavor)){if(row.language_id==='3'&&ids.has(row.ability_id))result[ids.get(row.ability_id)]=row.flavor_text.replace(/\s+/g,' ').trim();}
await writeFile('src/data/ability-descriptions.json',JSON.stringify(result,null,2)+'\n');
console.log(`Saved ${Object.keys(result).length} ability descriptions.`);
