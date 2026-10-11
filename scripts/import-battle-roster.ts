import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import dex from '../src/data/pokedex.json' with {type:'json'};
import existingLearnsets from '../src/data/move-learnsets.json' with {type:'json'};
import existingMoves from '../src/data/move-catalog.json' with {type:'json'};
import {evioliteSpecies,namedReferenceSpecies} from '../src/data/pokedex-roster';
import {FORMAT} from '../src/data/battle-rules';

const originals=new Set(['Charizard','Blastoise','Venusaur','Pikachu','Gyarados','Snorlax','Arcanine','Raichu','Cloyster','Espeon','Gengar','Lucario','Golem','Lapras','Jolteon','Scizor','Dragonite','Tyranitar','Metagross','Garchomp']);
const roster=dex.filter(entry=>originals.has(entry.species) || evioliteSpecies.has(entry.species) || namedReferenceSpecies.has(entry.species) || !Showdown.Dex.species.get(entry.aliases[0]).nfe);
const root='https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const cache='.data/import-cache';await mkdir(cache,{recursive:true});
const sourceRecords:{url:string;sha256:string}[]=[];
async function source(file:string) {
  let data:string;
  try{data=await readFile(`${cache}/${file}.csv`,'utf8');}catch{
    const response=await fetch(`${root}${file}.csv`,{signal:AbortSignal.timeout(120000)});
    if(!response.ok)throw Error(`${file}: ${response.status}`);
    data=await response.text();await writeFile(`${cache}/${file}.csv`,data);
  }
  sourceRecords.push({url:`${root}${file}.csv`,sha256:createHash('sha256').update(data).digest('hex')});return data;
}
function eachCSV(text:string,visit:(row:Record<string,string>)=>void) {
  let header:string[]|undefined,row:string[]=[],field='',quoted=false;
  const commit=()=>{row.push(field.replace(/\r$/,''));field='';if(!header)header=row;else if(row.length===header.length)visit(Object.fromEntries(header.map((key,i)=>[key,row[i]])));row=[];};
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted && text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted && c===','){row.push(field);field='';}else if(!quoted && c==='\n')commit();else field+=c;}
  if(field || row.length)commit();
}
const moveIds=new Map<number,string>(),names=new Map<number,string>(),descriptions=new Map<number,string>(),abilityIds=new Map<number,string>(),abilityNames:Record<string,string>={},versions=new Map<number,string>(),pokemonIds=new Map<number,string>();
const flags=new Map<number,{legendary:boolean;mythical:boolean}>();eachCSV(await source('pokemon_species'),row=>flags.set(Number(row.id),{legendary:row.is_legendary==='1',mythical:row.is_mythical==='1'}));
const wanted=new Map(roster.map(entry=>[entry.id,entry.species]));
eachCSV(await source('moves'),row=>{const move=Showdown.Dex.moves.get(row.identifier);if(move.exists)moveIds.set(Number(row.id),move.name);});
eachCSV(await source('move_names'),row=>{if(row.local_language_id==='3')names.set(Number(row.move_id),row.name);});
eachCSV(await source('move_flavor_text'),row=>{if(row.language_id==='3')descriptions.set(Number(row.move_id),row.flavor_text.replace(/\s+/g,' ').trim());});
eachCSV(await source('abilities'),row=>abilityIds.set(Number(row.id),Showdown.Dex.abilities.get(row.identifier).name));
eachCSV(await source('ability_names'),row=>{if(row.local_language_id==='3'){const name=abilityIds.get(Number(row.ability_id));if(name)abilityNames[name]=row.name;}});
eachCSV(await source('version_groups'),row=>versions.set(Number(row.id),row.identifier));
const forms:Record<string,{id:number;baseSpecies:string;types:string[];forme:string;spriteKey?:string}>={};
eachCSV(await source('pokemon'),row=>{const number=Number(row.species_id),id=Number(row.id);if(row.is_default==='1' && wanted.has(number))pokemonIds.set(id,wanted.get(number)!);else if(wanted.has(number)){const data=Showdown.Dex.species.get(row.identifier);if(data.exists && data.battleOnly && !data.isMega && !data.isPrimal && !data.name.includes('-Gmax'))forms[data.name]={id,baseSpecies:wanted.get(number)!,types:data.types,forme:data.forme};}});
for(const entry of roster){const data=Showdown.Dex.species.get(entry.species);for(const name of data.otherFormes ?? []){const form=Showdown.Dex.species.get(name);if(form.battleOnly && !form.isMega && !form.isPrimal && !name.includes('-Gmax') && !forms[name])forms[name]={id:entry.id,baseSpecies:entry.species,types:form.types,forme:form.forme};}}

// PokeAPI uses a named Cherrim sprite and a separate red-core ID for Minior.
forms['Cherrim-Sunshine'].spriteKey='421-sunshine';
forms.Minior={id:774,spriteKey:'10136',baseSpecies:'Minior',types:['Rock','Flying'],forme:''};
const learned=new Map<string,Map<number,Set<string>>>();
// The bulk table avoids hundreds of API calls. Keep only level-up rows for our roster.
eachCSV(await source('pokemon_moves'),row=>{const name=pokemonIds.get(Number(row.pokemon_id)),move=moveIds.get(Number(row.move_id));if(!name || !move || row.pokemon_move_method_id!=='1')return;const groups=learned.get(name) ?? new Map<number,Set<string>>(),group=Number(row.version_group_id),moves=groups.get(group) ?? new Set<string>();moves.add(move);groups.set(group,moves);learned.set(name,groups);});
const validator=new Showdown.TeamValidator(FORMAT),sets:Record<string,unknown>={},learnsets:Record<string,{version:string;selfMoves:string[];legalMoves:string[]}>={},metadata:Record<string,any>={...existingMoves},exceptions:unknown[]=[];
const preference=['scarlet-violet','sword-shield','ultra-sun-ultra-moon','sun-moon','omega-ruby-alpha-sapphire','x-y','black-2-white-2','black-white','heartgold-soulsilver','platinum','diamond-pearl','emerald','firered-leafgreen','ruby-sapphire','crystal','gold-silver','yellow','red-blue'];
for(const entry of roster){
  const species=Showdown.Dex.species.get(entry.aliases[0]);if(!species.exists)throw Error(`Unknown species ${entry.species}`);
  const base={species:species.name,name:species.name,level:50,ability:species.abilities['0'],nature:'Serious',gender:species.gender || 'M',item:'',moves:[] as string[],evs:{hp:1,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}};
  const collected=new Set<string>();let ancestor:typeof species|undefined=species;const visited=new Set<string>();
  while(ancestor && !visited.has(ancestor.id)){visited.add(ancestor.id);const learnset=Showdown.Dex.species.getLearnsetData(ancestor.id).learnset;for(const move of Object.keys(learnset ?? {}))collected.add(Showdown.Dex.moves.get(move).name);const parent=ancestor.prevo || (ancestor.changesFrom && ancestor.changesFrom!==ancestor.name ? ancestor.changesFrom : '');ancestor=parent ? Showdown.Dex.species.get(parent) : undefined;}
  // Sketch has its own legal move domain; self-taught Sketch still starts locked to one move.
  if(species.name==='Smeargle')for(const move of Showdown.Dex.moves.all())if(move.exists && !move.isZ && !move.isMax && !move.isNonstandard)collected.add(move.name);
  const legalMoves=[...collected].filter(name=>!validator.validateSet({...base,moves:[name]},{})).sort();
  const groups=learned.get(entry.species),version=preference.find(version=>[...groups?.keys() ?? []].some(id=>versions.get(id)===version));
  let selfMoves=version ? [...groups!.entries()].filter(([id])=>versions.get(id)===version).flatMap(([,moves])=>[...moves]).filter(name=>legalMoves.includes(name)) : [];
  if(originals.has(entry.species))selfMoves=(existingLearnsets as Record<string,any>)[entry.species].selfMoves;
  if(!selfMoves.length)throw Error(`No self moves ${entry.species}`);
  const score=(name:string)=>{const move=Showdown.Dex.moves.get(name);const power=move.basePower || (move.damage ? 65 : move.basePowerCallback ? 70 : 0);return power*(species.types.includes(move.type) ? 1.5 : 1)*(move.category==='Physical' ? species.baseStats.atk : species.baseStats.spa)*(move.accuracy===true ? 1 : move.accuracy/100);};
  const attacks=legalMoves.filter(name=>{const move=Showdown.Dex.moves.get(name);return move.category!=='Status' && !move.ohko && !move.selfdestruct && !move.flags.charge && !move.flags.recharge && !['Tackle','Swift','Thunder Shock','Struggle'].includes(name) && (move.basePower>=60 || !!move.multihit || !!move.damage || !!move.basePowerCallback || (move.priority>0 && move.basePower>=40));}).sort((a,b)=>score(b)-score(a) || a.localeCompare(b));
  const chosen:string[]=[];
  for(const type of species.types){const move=attacks.find(name=>Showdown.Dex.moves.get(name).type===type);if(move && !chosen.includes(move))chosen.push(move);}
  for(const move of attacks)if(!chosen.includes(move) && !chosen.some(name=>Showdown.Dex.moves.get(name).type===Showdown.Dex.moves.get(move).type))chosen.push(move);
  for(const move of [...attacks,...legalMoves])if(!chosen.includes(move))chosen.push(move);
  const moves:string[]=[];for(const move of chosen){if(!validator.validateSet({...base,moves:[...moves,move]},{}))moves.push(move);if(moves.length===4)break;}
  if(moves.length<4 || attacks.length<4)exceptions.push({species:species.name,legalMoveCount:legalMoves.length,attackingMoveCount:attacks.length,moves});
  const abilities=[...new Set(Object.values(species.abilities))].filter(ability=>!validator.validateSet({...base,moves,ability},{}));
  if(!abilities.length)throw Error(`No legal ability ${species.name}: ${moves.join(",")} ${JSON.stringify(validator.validateSet({...base,moves},{}))}`);base.ability=abilities[0];base.moves=moves;
  const errors=validator.validateSet(base,{});if(errors)throw Error(`${species.name}: ${errors.join(';')}`);
  sets[species.name]={id:entry.id,...flags.get(entry.id),ability:base.ability,moves,abilities,baseStats:species.baseStats,types:species.types,bst:species.bst,specialist:attacks.length<4};
  learnsets[species.name]={version:originals.has(entry.species) ? (existingLearnsets as Record<string,any>)[entry.species].version : version!,selfMoves:[...new Set(selfMoves)],legalMoves};
}
for(const [id,name] of moveIds){const move=Showdown.Dex.moves.get(name);metadata[name]={name:names.get(id) ?? metadata[name]?.name ?? name,type:move.type,category:move.category,power:move.basePower,accuracy:move.accuracy,pp:move.pp,description:descriptions.get(id) ?? move.shortDesc};}
await writeFile('src/data/battle-forms.json',JSON.stringify(forms,null,2)+'\n');
await writeFile('src/data/battle-roster.json',JSON.stringify(sets,null,2)+'\n');
await writeFile('src/data/move-learnsets.json',JSON.stringify(learnsets,null,2)+'\n');
await writeFile('src/data/move-catalog.json',JSON.stringify(metadata,null,2)+'\n');
await writeFile('src/data/ability-names.json',JSON.stringify(abilityNames,null,2)+'\n');
await writeFile('artifacts/reports/battle-data-source.json',JSON.stringify({importedAt:new Date().toISOString(),engineVersion:JSON.parse(await readFile('node_modules/pokemon-showdown/package.json','utf8')).version,format:FORMAT,count:Object.keys(sets).length,sources:sourceRecords,selfMovePolicy:'Latest supported PokeAPI level-up version; existing 20 starters preserve their previous self moves. Legal move domain and mechanics from installed Showdown. No Mega, Gigantamax or regional forms.',exceptions},null,2)+'\n');
console.log(`Imported ${Object.keys(sets).length} battle species, ${Object.keys(metadata).length} moves and ${Object.keys(abilityNames).length} ability names; ${exceptions.length} specialist/short learnsets.`);
