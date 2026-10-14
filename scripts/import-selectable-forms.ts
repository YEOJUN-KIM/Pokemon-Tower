import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {FORMAT} from '../src/data/battle-rules';
import dex from '../src/data/pokedex.json' with {type:'json'};
import roster from '../src/data/battle-roster.json' with {type:'json'};
import moves from '../src/data/move-catalog.json' with {type:'json'};
import {moveTypeNames} from '../src/data/move-info';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
const regions:Record<string,string>={Alola:'알로라',Galar:'가라르',Hisui:'히스이',Paldea:'팔데아'};
const requested:Record<string,string>={
 'Rotom-Heat':'히트로토무','Rotom-Wash':'워시로토무','Rotom-Frost':'프로스트로토무','Rotom-Fan':'스핀로토무','Rotom-Mow':'커트로토무',
 'Deoxys-Attack':'테오키스 어택폼','Deoxys-Defense':'테오키스 디펜스폼','Deoxys-Speed':'테오키스 스피드폼',
 'Dialga-Origin':'디아루가 오리진폼','Palkia-Origin':'펄기아 오리진폼','Giratina-Origin':'기라티나 오리진폼',
 'Shaymin-Sky':'쉐이미 스카이폼','Tornadus-Therian':'토네로스 영물폼','Thundurus-Therian':'볼트로스 영물폼','Landorus-Therian':'랜드로스 영물폼','Enamorus-Therian':'러브로스 영물폼',
 'Kyurem-Black':'블랙큐레무','Kyurem-White':'화이트큐레무','Keldeo-Resolute':'케르디오 각오의 모습','Hoopa-Unbound':'굴레를 벗어난 후파','Zygarde-10%':'지가르데 10%폼',
 'Necrozma-Dusk-Mane':'네크로즈마 황혼의 갈기','Necrozma-Dawn-Wings':'네크로즈마 새벽의 날개','Urshifu-Rapid-Strike':'우라오스 연격의 태세',
 'Calyrex-Ice':'버드렉스 백마 탄 모습','Calyrex-Shadow':'버드렉스 흑마 탄 모습',
 'Ogerpon-Wellspring':'오거폰 우물의 가면','Ogerpon-Hearthflame':'오거폰 화덕의 가면','Ogerpon-Cornerstone':'오거폰 주춧돌의 가면',
 'Ursaluna-Bloodmoon':'다투곰',
};
for(const species of Showdown.Dex.species.all()){
 const region=species.forme.split('-')[0];
 // Pikachu's Alola cap is a costume, rather than a regional variant.
 if(!/^(Alola|Galar|Hisui|Paldea(?:-(Combat|Blaze|Aqua))?)$/.test(species.forme)||species.name==='Pikachu-Alola'||species.battleOnly||!isCollectibleSpecies(species.name))continue;
 const base=dex.find(entry=>entry.id===species.num)!;
 const breed:Record<string,string>={Combat:'컴뱃종',Blaze:'블레이즈종',Aqua:'워터종'};
 requested[species.name]=`${regions[region]} ${base.name}${breed[species.forme.split('-')[1]]?' '+breed[species.forme.split('-')[1]]:''}`;
}
mkdirSync('.data/form-import-cache',{recursive:true});
async function source(name:string){const path=`.data/cache/forms/${name}.csv`;if(existsSync(path))return readFileSync(path,'utf8');const response=await fetch(`https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/${name}.csv`);if(!response.ok)throw Error(name+': '+response.status);const text=await response.text();writeFileSync(path,text);return text;}
const pokemon=(await source('pokemon')).trim().split('\n').slice(1).map(line=>line.split(','));
const formIds=new Map<string,number>();for(const row of pokemon){const species=Showdown.Dex.species.get(row[1].replace(/-breed$/,'').replace(/-galar-standard$/,'-galar'));if(species.exists&&!formIds.has(species.name))formIds.set(species.name,Number(row[0]));}
const koreanMoves=new Map<string,string>(),moveIds=new Map<number,string>();
for(const line of (await source('moves')).trim().split('\n').slice(1)){const row=line.split(',');const move=Showdown.Dex.moves.get(row[1]);if(move.exists)moveIds.set(Number(row[0]),move.name);}
for(const line of (await source('move_names')).trim().split('\n').slice(1)){const [id,lang,...name]=line.split(',');if(lang==='3'&&moveIds.has(Number(id)))koreanMoves.set(moveIds.get(Number(id))!,name.join(',').replace(/\r$/,''));}
const validator=new Showdown.TeamValidator(FORMAT),result:Record<string,unknown>={},newMoves={...moves} as Record<string,unknown>;
const signature:Record<string,string>={'Rotom-Heat':'Overheat','Rotom-Wash':'Hydro Pump','Rotom-Frost':'Blizzard','Rotom-Fan':'Air Slash','Rotom-Mow':'Leaf Storm','Calyrex-Ice':'Glacial Lance','Calyrex-Shadow':'Astral Barrage','Necrozma-Dusk-Mane':'Sunsteel Strike','Necrozma-Dawn-Wings':'Moongeist Beam','Kyurem-Black':'Fusion Bolt','Kyurem-White':'Fusion Flare','Keldeo-Resolute':'Secret Sword','Urshifu-Rapid-Strike':'Surging Strikes','Ursaluna-Bloodmoon':'Blood Moon'};
for(const [name,displayName] of Object.entries(requested)){
 const species=Showdown.Dex.species.get(name),base=dex.find(p=>p.id===species.num)!;
 const id=formIds.get(name);if(!id||!base||species.battleOnly)throw Error('No selectable form metadata: '+name);
 const requiredItem=species.requiredItem??species.requiredItems?.[0];
 const set={name:species.name,species:species.name,ability:species.abilities[0],level:50,nature:'Serious',gender:species.gender||'M',item:requiredItem??'',moves:[],ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs:{hp:1,atk:0,def:0,spa:0,spd:0,spe:0}};
 const learned=new Set<string>();let ancestor=species;const visited=new Set<string>();
 while(ancestor&&!visited.has(ancestor.id)){visited.add(ancestor.id);for(const key of Object.keys(Showdown.Dex.species.getLearnsetData(ancestor.id).learnset??{}))learned.add(Showdown.Dex.moves.get(key).name);const parent=ancestor.prevo||ancestor.changesFrom||(ancestor.baseSpecies!==ancestor.name?ancestor.baseSpecies:'');if(!parent)break;ancestor=Showdown.Dex.species.get(parent);}
 const legal=[...learned].filter(move=>!validator.validateSet({...set,moves:[...new Set([...(species.requiredMove?[species.requiredMove]:[]),move])]},{})).sort();
 const attacks=legal.filter(name=>{const m=Showdown.Dex.moves.get(name);return m.category!=='Status'&&!m.ohko&&!m.selfdestruct&&!m.flags.charge&&!m.flags.recharge&&(m.basePower>=60||m.priority>0||m.multihit||m.basePowerCallback);}).sort((a,b)=>score(b)-score(a));
 function score(moveName:string){const m=Showdown.Dex.moves.get(moveName);return (m.basePower||60)*(species.types.includes(m.type)?1.5:1)*(m.category==='Physical'?species.baseStats.atk:species.baseStats.spa)*(m.accuracy===true?1:m.accuracy/100);}
 const selected:string[]=[];for(const move of [...(signature[name]?[signature[name]]:[]),...attacks]){if(legal.includes(move)&&!selected.includes(move)&&!validator.validateSet({...set,moves:[...selected,move]},{}))selected.push(move);if(selected.length===4)break;}
 if(species.requiredMove&&!selected.includes(species.requiredMove))selected[3]=species.requiredMove;
 if(selected.length!==4||validator.validateTeam([{...set,moves:selected}, {...set,name:'Blastoise',species:'Blastoise',item:'',ability:'Torrent',moves:['Surf']},{...set,name:'Venusaur',species:'Venusaur',item:'',ability:'Overgrow',moves:['Energy Ball']}]))throw Error('Invalid default form team: '+name);
 const flag=(roster as Record<string,{legendary:boolean;mythical:boolean}>)[base.species];
 const abilities=[...new Set(Object.values(species.abilities))].filter(ability=>!validator.validateSet({...set,ability,moves:selected},{}));
 const regional=regions[species.forme.split('-')[0]];
 const paldeaFamily=name==='Tauros-Paldea-Blaze'||name==='Tauros-Paldea-Aqua';
 result[name]={id,nationalId:species.num,baseSpecies:base.species,name:regional?base.name:displayName,generation:regional?({Alola:7,Galar:8,Hisui:8,Paldea:9} as Record<string,number>)[species.forme.split('-')[0]]:base.generation,types:species.types,displayTypes:species.types.map(t=>moveTypeNames[t]),ability:species.abilities[0],abilities,baseStats:species.baseStats,heightm:species.heightm,bst:species.bst,legendary:flag.legendary,mythical:flag.mythical,...(regional?{region:regional,...(species.forme.startsWith('Paldea-')?{regionLabel:regional+' '+displayName.split(' ').at(-1)}:{})}:{}),...(requiredItem?{requiredItem}:{}),moves:selected,selfMoves:selected,legalMoves:legal,collection:name.startsWith('Rotom-')||regional?'separate':'family'};
 for(const name of legal)if(!newMoves[name]){const m=Showdown.Dex.moves.get(name);newMoves[name]={name:koreanMoves.get(name)??name,type:m.type,category:m.category,power:m.basePower,accuracy:m.accuracy,pp:m.pp,description:''};}
 if(paldeaFamily){const form=result[name] as {baseSpecies:string;name:string;collection:string};form.baseSpecies='Tauros-Paldea-Combat';form.name=base.name+' '+displayName.split(' ').at(-1);form.collection='family';}
 if(name==='Ursaluna-Bloodmoon'){const form=result[name] as {collection:string;regionLabel:string;generation:number};form.collection='separate';form.regionLabel='붉은달';form.generation=9;}
 if(name==='Tauros-Paldea-Combat')(result[name] as {regionLabel:string}).regionLabel=regional;
}
writeFileSync('src/data/selectable-forms.json',JSON.stringify(result,null,2)+'\n');writeFileSync('src/data/move-catalog.json',JSON.stringify(newMoves,null,2)+'\n');
const expandedRoster={...roster} as Record<string,unknown>,expandedLearnsets=JSON.parse(readFileSync('src/data/move-learnsets.json','utf8'));
for(const name of ['Tauros-Paldea-Blaze','Tauros-Paldea-Aqua']){delete expandedRoster[name];delete expandedLearnsets[name];}
for(const [name,form] of Object.entries(result) as [string,any][]){if(form.collection!=='separate')continue;expandedRoster[name]={id:form.id,legendary:form.legendary,mythical:form.mythical,ability:form.ability,moves:form.moves,abilities:form.abilities,baseStats:form.baseStats,bst:form.bst,types:form.types,specialist:false};expandedLearnsets[name]={version:'native-form',selfMoves:form.selfMoves,legalMoves:form.legalMoves};}
writeFileSync('src/data/battle-roster.json',JSON.stringify(expandedRoster,null,2)+'\n');writeFileSync('src/data/move-learnsets.json',JSON.stringify(expandedLearnsets,null,2)+'\n');
const missing=new Set(JSON.parse(readFileSync('src/data/local-sprite-missing.json','utf8')) as string[]),availability=JSON.parse(readFileSync('src/data/form-sprite-availability.json','utf8'));
for(const form of Object.values(result) as {id:number;nationalId:number}[]){
 for(const side of ['','back/','shiny/','back/shiny/']){const relative=side+form.id+'.png',path='public/vendor/pokeapi/pokemon/'+relative;if(existsSync(path)){missing.delete(relative);continue;}const response=await fetch('https://raw.githubusercontent.com/PokeAPI/sprites/a3a1432e688ea028f12c51371d5253037cb9f17b/sprites/pokemon/'+relative);if(response.status===404){missing.add(relative);continue;}if(!response.ok)throw Error(relative+': '+response.status);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid sprite '+relative);writeFileSync(path,bytes);missing.delete(relative);}
 availability[form.id]={dotBoth:false,showdownBoth:false,front:existsSync(`public/vendor/pokeapi/pokemon/${form.id}.png`),back:existsSync(`public/vendor/pokeapi/pokemon/back/${form.id}.png`),baseId:form.nationalId};
}
writeFileSync('src/data/local-sprite-missing.json',JSON.stringify([...missing].sort(),null,2)+'\n');writeFileSync('src/data/form-sprite-availability.json',JSON.stringify(availability,null,2)+'\n');
console.log(`Imported ${Object.keys(result).length} selectable forms with legal default moves and source sprites.`);

