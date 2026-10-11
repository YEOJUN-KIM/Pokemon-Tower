import PermanentShop from '../../web/permanent-shop';
import {pokedexEntries} from '../../server/pokedex-entries';
import {requirePageAccount} from '../../server/page-account';
export default async function Page(){await requirePageAccount('/upgrades');return <PermanentShop entries={pokedexEntries().filter(entry=>entry.battleReady!==false)}/>;}
