import PermanentShop from '../../web/permanent-shop';
import {pokedexEntries} from '../../server/pokedex-entries';
import {requirePageAccount} from '../../server/page-account';

export default async function Page(){await requirePageAccount('/eggs');return <PermanentShop page="eggs" entries={pokedexEntries().filter(entry=>entry.battleReady!==false)}/>;}
