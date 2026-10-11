import {DatabaseSync} from 'node:sqlite';
import {writeFile,mkdir} from 'node:fs/promises';
const prefix=process.argv[2];
if(!prefix||!/^[a-f0-9]{10,64}$/.test(prefix))throw new Error('Provide an unambiguous player ID prefix (10+ hex characters).');
const db=new DatabaseSync(process.env.TOWER_DB_PATH||'.data/tower.sqlite',{readOnly:true});
try {
  db.exec('BEGIN');
  const players=db.prepare('SELECT id FROM players WHERE id LIKE ?').all(`${prefix}%`);
  if(players.length!==1)throw new Error('Player not uniquely identified.');
  const owner=players[0].id;
  const runs=db.prepare('SELECT id FROM runs WHERE player_id=?').all(owner).map(row=>row.id);
  const battles=runs.length?db.prepare(`SELECT id FROM battles WHERE run_id IN (${runs.map(()=>'?').join(',')})`).all(...runs).map(row=>row.id):[];
  const tables={};
  const excluded=new Set(['accounts','account_sessions','save_claims','auth_limits']);
  for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
    if(excluded.has(name))continue;
    const columns=db.prepare(`PRAGMA table_info("${name}")`).all().map(row=>row.name);
    const key=name==='players'?'id':columns.includes('player_id')?'player_id':columns.includes('run_id')?'run_id':columns.includes('battle_id')?'battle_id':null;
    if(!key)continue;
    const ids=['id','player_id'].includes(key)?[owner]:key==='run_id'?runs:battles;
    tables[name]=ids.length?db.prepare(`SELECT * FROM "${name}" WHERE "${key}" IN (${ids.map(()=>'?').join(',')})`).all(...ids):[];
  }
  db.exec('COMMIT');
  await mkdir('.data',{recursive:true});
  await writeFile('.data/original-save.json',JSON.stringify({version:1,owner,tables}));
  console.log(`Exported original save: ${tables.unlocks.length} species, ${tables.runs.length} runs. Private bundle: .data/original-save.json`);
}finally {db.close();}
