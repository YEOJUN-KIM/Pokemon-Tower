import BattleGame from '../../web/battle-game';
import {pokedexEntries} from '../../server/pokedex-entries';
import {requirePageAccount} from '../../server/page-account';
export default async function Page({searchParams}: {searchParams: Promise<{prepare?: string}>}) {
  const params = await searchParams;
  await requirePageAccount(params.prepare==='1'?'/battle?prepare=1':'/battle');
  return <BattleGame prepareNewRun={params.prepare === '1'} entries={pokedexEntries()} />;
}
