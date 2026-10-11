import Showdown from 'pokemon-showdown';
import references from './johto-original-trainers.json' with {type:'json'};
import {pokemonSets} from './teams';
import {FORMAT} from './battle-rules';
export const johtoReferences:Record<string,{game:string;battle:string;url:string;sets:{species:string;level:number;ability:string;item:string;moves:string[]}[]}>=references;
// Only explicit upgrades: preserve the original pool, role and most of each moveset.
export const johtoMoveUpgrades:Record<string,Record<string,Record<string,string>>>={
 falkner:{Pidgeot:{Swagger:'Brave Bird'},Pelipper:{'Hidden Power':'Air Slash'}},
 bugsy:{Pinsir:{Guillotine:'Swords Dance'}},
 whitney:{Delcatty:{Assist:'Return'}},
 morty:{Mismagius:{Astonish:'Shadow Ball'}},
 chuck:{Hitmonchan:{'Focus Punch':'Drain Punch'},Breloom:{'Focus Punch':'Close Combat'},Poliwrath:{'Focus Punch':'Drain Punch'}},
 jasmine:{Magnezone:{'Zap Cannon':'Thunderbolt','Lock-On':'Volt Switch'},Bronzong:{'Dream Eater':'Psychic'}},
 pryce:{Dewgong:{'Sheer Cold':'Ice Beam'}},
 will:{Jynx:{'Dream Eater':'Psychic'}},
 koga:{Muk:{Swagger:'Poison Jab'}},
 lance:{Dragonite:{'Hyper Beam':'Extreme Speed'}},
 red:{Snorlax:{'Giga Impact':'Body Slam'},Venusaur:{'Frenzy Plant':'Energy Ball'},Charizard:{'Blast Burn':'Flamethrower'},Blastoise:{'Hydro Cannon':'Surf'}},
};
const validator=new Showdown.TeamValidator(FORMAT);
const buildCache=new Map<string,{moves:string[];ability:string;item:string}>();
export function johtoOriginalBuild(id:string,name:string){
 const cacheKey=id+':'+name,cached=buildCache.get(cacheKey);
 if(cached)return {...cached,moves:[...cached.moves]};
 const key=id.replace(/^named-/,''),reference=johtoReferences[key]?.sets.find(s=>s.species===name);
 if(!reference)return null;
 const moves=reference.moves.map(m=>johtoMoveUpgrades[key]?.[name]?.[m]??Showdown.Dex.moves.get(m).name);
 // Levitate Gengar was legal in HGSS; the current engine uses Cursed Body.
 const ability=reference.ability==='Levitate'&&name==='Gengar'?'Cursed Body':reference.ability;
 const build={moves,ability,item:reference.item};
 const errors=validator.validateSet({...structuredClone(pokemonSets[name]),...build},{});
 if(errors)throw Error(id+' '+name+': '+errors.join('; '));
 buildCache.set(cacheKey,build);
 return {...build,moves:[...build.moves]};
}
