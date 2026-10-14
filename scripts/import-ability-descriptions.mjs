import {mkdir,readFile,writeFile} from 'node:fs/promises';
import Showdown from 'pokemon-showdown';
import localization from '../src/data/ability-localization.json' with {type:'json'};

function csv(text){let header,rows=[],row=[],field='',quoted=false;const commit=()=>{row.push(field.replace(/\r$/,''));field='';if(!header)header=row;else if(row.length===header.length)rows.push(Object.fromEntries(header.map((key,i)=>[key,row[i]])));row=[];};for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===','){row.push(field);field='';}else if(!quoted&&c==='\n')commit();else field+=c;}if(field||row.length)commit();return rows;}
async function source(name){
 const cache=`.data/cache/import/${name}.csv`;
 try{return await readFile(cache,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 const response=await fetch(`https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/${name}.csv`);
 if(!response.ok)throw Error(`HTTP ${response.status}`);
 const text=await response.text();await mkdir('.data/import-cache',{recursive:true});await writeFile(cache,text);return text;
}
const flavor=await source('ability_flavor_text');
const ids=new Map(csv(await source('abilities')).map(row=>[row.id,Showdown.Dex.abilities.get(row.identifier).name]));
const result=Object.fromEntries(Showdown.Dex.abilities.all().map(ability=>[ability.name,ability.shortDesc]));
for(const row of csv(flavor)){if(row.language_id==='3'&&ids.has(row.ability_id))result[ids.get(row.ability_id)]=row.flavor_text.replace(/\s+/g,' ').trim();}
Object.assign(result,localization.descriptions);
await writeFile('src/data/ability-descriptions.json',JSON.stringify(result,null,2)+'\n');
console.log(`Saved ${Object.keys(result).length} ability descriptions.`);
