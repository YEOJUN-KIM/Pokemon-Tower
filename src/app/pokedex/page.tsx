import Pokedex from '../../web/pokedex';
import {pokedexEntries} from '../../server/pokedex-entries';
import {requirePageAccount} from '../../server/page-account';

export default async function Page({searchParams}: {searchParams: Promise<{from?:string}>}) {
  const returnToBattle=(await searchParams).from==='battle';
  await requirePageAccount(returnToBattle ? '/pokedex?from=battle' : '/pokedex');
  return <Pokedex mode="collection" entries={pokedexEntries()} returnToBattle={returnToBattle} />;
}
