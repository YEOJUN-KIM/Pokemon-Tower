import {mkdir,readFile,writeFile} from 'node:fs/promises';
import Showdown from 'pokemon-showdown';
import localization from '../src/data/ability-localization.json' with {type:'json'};
import {cachedSourceText,pokeapiCsv} from './lib/source-cache.mjs';

const source=name=>cachedSourceText(pokeapiCsv(name));
if(process.argv.includes('--check-sources')){await Promise.all(['ability_flavor_text','abilities'].map(source));console.log('Ability importer sources ready; no runtime files written.');process.exit(0);}

function csv(text){let header,rows=[],row=[],field='',quoted=false;const commit=()=>{row.push(field.replace(/\r$/,''));field='';if(!header)header=row;else if(row.length===header.length)rows.push(Object.fromEntries(header.map((key,i)=>[key,row[i]])));row=[];};for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===','){row.push(field);field='';}else if(!quoted&&c==='\n')commit();else field+=c;}if(field||row.length)commit();return rows;}
const flavor=await source('ability_flavor_text');
const ids=new Map(csv(await source('abilities')).map(row=>[row.id,Showdown.Dex.abilities.get(row.identifier).name]));
const result=Object.fromEntries(Showdown.Dex.abilities.all().map(ability=>[ability.name,ability.shortDesc]));
for(const row of csv(flavor)){if(row.language_id==='3'&&ids.has(row.ability_id))result[ids.get(row.ability_id)]=row.flavor_text.replace(/\s+/g,' ').trim();}
Object.assign(result,localization.descriptions);
await writeFile('src/data/ability-descriptions.json',JSON.stringify(result,null,2)+'\n');
console.log(`Saved ${Object.keys(result).length} ability descriptions.`);
