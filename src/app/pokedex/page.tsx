import Pokedex from '../../web/pokedex';
import {pokedexEntries} from '../../server/pokedex-entries';
import '../../web/pokedex.css';
import {requirePageAccount} from '../../server/page-account';

export default async function Page() {
  await requirePageAccount('/pokedex');
  return <Pokedex entries={pokedexEntries()} />;
}
