'use client';
import type {TowerView} from './contracts';
import type {PokedexEntry} from './pokedex-data';
import {PokemonSettings} from './pokemon-settings';

/** Adapt the existing run snapshot/save contract to the shared settings dialog. */
export function RunPokemonSettings({tower,entries,name,onClose,returnFocus,submit}:{tower:TowerView;entries:PokedexEntry[];name:string;onClose:()=>void;returnFocus:string;submit:(body:Record<string,unknown>)=>Promise<void>}){
 const run=tower.run!,entry=run.adjustment?.entries.find(entry=>entry.species===name),pokemon=entries.find(entry=>entry.species===name);
 if(!entry||!pokemon)return null;
 return <PokemonSettings entry={entry} pokemon={pokemon} points={tower.growthPoints} allowFormChange={false} inRun returnFocus={returnFocus} onClose={onClose} onSave={(entry,profile)=>submit({type:'adjust-run',runId:run.id,floor:run.floor,snapshot:run.adjustment?.snapshot,species:entry.species,revision:entry.revision,profile})}/>;
}
