import {species} from './catalog';
import {moveTypeNames} from '../data/move-info';
import type {BattleView, PokemonView} from './contracts';

export function currentTypes(pokemon: Pick<PokemonView,'species'|'displaySpecies'|'types'|'terastallized'>):string[] {
  if(pokemon.terastallized && pokemon.terastallized!=='Stellar')return [pokemon.terastallized];
  return pokemon.types ?? (species[pokemon.displaySpecies ?? pokemon.species]?.types ?? []).map(type=>Object.keys(moveTypeNames).find(key=>moveTypeNames[key]===type) ?? type);
}

// Apply public type changes only; no hidden opponent data reaches the browser.
export function applyPublicTypes(view:BattleView,line:string) {
  const [,event,actor,value,extra]=line.split('|');
  const own=actor?.startsWith('p1a:'),enemy=actor?.startsWith('p2a:');
  if(!own && !enemy)return;
  const pokemon=own ? view.team.find(p=>p.species===actor.split(': ')[1]) ?? view.team.find(p=>p.active) : view.opponent;
  if(!pokemon)return;
  if(['switch','drag','replace','detailschange','-formechange'].includes(event))pokemon.types=currentTypes({species:value.split(',')[0]});
  if(event==='-start' && value==='typechange')pokemon.types=extra.split('/');
  if(event==='-start' && value==='typeadd')pokemon.types=[...new Set([...currentTypes(pokemon),extra])];
  if(event==='-end' && value==='typechange')pokemon.types=currentTypes({species:pokemon.displaySpecies ?? pokemon.species});
  if(event==='-end' && value==='typeadd')pokemon.types=currentTypes(pokemon).filter(type=>type!==extra);
  if(event==='-transform'){
    const target=own ? view.opponent : view.team.find(p=>p.active);
    if(target)pokemon.types=[...currentTypes(target)];
  }
}
