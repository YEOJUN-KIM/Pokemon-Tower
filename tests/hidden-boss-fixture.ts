import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import type {TowerTheme} from '../src/data/tower-themes';

export function hiddenBossFixture(theme:TowerTheme='johto',floor=50,path=':memory:',owner='hidden'){
 // Keep guaranteed hidden-boss tests independent of unrelated probability tracks.
 const store=new TowerStore(path,undefined,{});store.ensurePlayer(owner);
 const initial=store.start(owner,starters,'basic',{events:true}),run=store.battle(initial).run_id;
 store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(initial);
 store.db.prepare('UPDATE run_themes SET theme=? WHERE run_id=?').run(theme,run);
 store.db.prepare('UPDATE run_routes SET second_theme=? WHERE run_id=?').run(floor===100?theme:'hoenn',run);
 store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
 store.db.prepare('UPDATE run_retries SET retry_limit=3 WHERE run_id=?').run(run);
 const champion=store.enter(owner,run,floor,starters);
 return {store,owner,run,champion};
}
