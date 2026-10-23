import {mkdir,writeFile} from 'node:fs/promises';
import Showdown from 'pokemon-showdown';

// Import metadata once; browsing the archive never makes 1,025 API requests.
const source='https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
function csv(text) {
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {if(quoted && text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(!quoted && (c===',' || c==='\n')) {row.push(field.replace(/\r$/,''));field='';if(c==='\n'){rows.push(row);row=[];}}
    else field+=c;
  }
  if(field || row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  const header=rows.shift();return rows.filter(row=>row.length===header.length).map(row=>Object.fromEntries(header.map((key,i)=>[key,row[i]])));
}
const files=['pokemon_species','pokemon_species_names','pokemon','pokemon_types','type_names','pokemon_abilities','abilities','ability_names'];
const tables=Object.fromEntries(await Promise.all(files.map(async name=>{
  const response=await fetch(`${source}${name}.csv`);
  if(!response.ok)throw new Error(`${name}: ${response.status}`);
  return [name,csv(await response.text())];
})));
const localized=(rows,key,language)=>new Map(rows.filter(row=>row.local_language_id===String(language)).map(row=>[Number(row[key]),row.name]));
const korean=localized(tables.pokemon_species_names,'pokemon_species_id',3);
const english=localized(tables.pokemon_species_names,'pokemon_species_id',9);
const types=localized(tables.type_names,'type_id',3);
const abilities=localized(tables.ability_names,'ability_id',3);
const abilityIds=new Map(tables.abilities.map(row=>[Number(row.id),row.identifier]));
const defaultPokemon=new Map(tables.pokemon.filter(row=>row.is_default==='1').map(row=>[Number(row.species_id),Number(row.id)]));
const typeRows=new Map(),abilityRows=new Map();
for(const row of tables.pokemon_types){const id=Number(row.pokemon_id);const values=typeRows.get(id) ?? [];values.push(row);typeRows.set(id,values);}
for(const row of tables.pokemon_abilities)if(row.slot==='1')abilityRows.set(Number(row.pokemon_id),Number(row.ability_id));
const entries=tables.pokemon_species.map(row=>{
  const id=Number(row.id),name=korean.get(id),species=english.get(id);
  if(!name || !species)throw new Error(`Missing localized name: ${id}`);
  const pokemon=defaultPokemon.get(id),data=Showdown.Dex.species.get(species),ability=abilityRows.get(pokemon);
  return {id,species,name,aliases:[row.identifier],types:(typeRows.get(pokemon) ?? []).sort((a,b)=>Number(a.slot)-Number(b.slot)).map(row=>types.get(Number(row.type_id))),
    generation:Number(row.generation_id),ability:abilities.get(ability) ?? abilityIds.get(ability) ?? '',
    canMega:data.otherFormes?.some(form=>form.includes('-Mega')) ?? false,canGigantamax:!!data.canGigantamax};
}).sort((a,b)=>a.id-b.id);
if(entries.length<1025 || entries.some(entry=>!entry.types.length || entry.types.some(type=>!type)))throw new Error('Incomplete national dex metadata');
await mkdir('src/data',{recursive:true});
await mkdir('artifacts/qa/assets/reports',{recursive:true});
await writeFile('src/data/pokedex.json',JSON.stringify(entries,null,2)+'\n');
await writeFile('artifacts/qa/assets/reports/pokedex-source.json',JSON.stringify({importedAt:new Date().toISOString(),count:entries.length,files:files.map(name=>`${source}${name}.csv`),forms:'One default entry per species; Mega, Gigantamax and regional forms are excluded.'},null,2)+'\n');
console.log(`Imported ${entries.length} species with Korean and English names, types, generation and default ability.`);
