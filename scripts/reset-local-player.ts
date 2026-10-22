// Explicitly reset one account's gameplay data, retaining credentials and other players.
// Usage: node --env-file=.env.local --import tsx scripts/reset-local-player.ts <username>
import {backup,DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {TowerStore} from '../src/server/tower-store';

const username=process.argv[2];
if(!username || !/^[a-zA-Z0-9_]{3,24}$/.test(username))throw Error('Provide the exact local account username.');
const path=resolve(process.env.TOWER_DB_PATH || '.data/tower.sqlite');
if(!existsSync(path))throw Error('Save database does not exist.');
const store=new TowerStore(path),db=store.db;
try {
  const account=db.prepare('SELECT player_id FROM accounts WHERE username=?').get(username.toLowerCase()) as {player_id:string}|undefined;
  if(!account)throw Error('Account not found; no data reset.');
  const destination=resolve(dirname(path),'backups',`before-player-reset-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
  mkdirSync(dirname(destination),{recursive:true});
  await backup(db,destination);
  const copy=new DatabaseSync(destination,{readOnly:true});
  try {if(copy.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok')throw Error('Backup integrity check failed.');}finally{copy.close();}

  // Follow actual foreign keys, including event/reward descendants. Never clear whole tables.
  const quote=(s:string)=>`"${s.replaceAll('"','""')}"`;
  const preserved=new Set(['accounts','account_sessions','auth_limits']);
  const tables=(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name:string}[]).map(r=>r.name).filter(n=>!preserved.has(n));
  const targets=new Map(tables.map((name,i)=>[name,`reset_target_${i}`]));
  const links=tables.flatMap(child=>{
    const groups=new Map<number,{table:string;from:string;to:string}[]>();
    for(const fk of db.prepare(`PRAGMA foreign_key_list(${quote(child)})`).all() as {id:number;table:string;from:string;to:string}[]) {
      if(!targets.has(fk.table))continue;
      groups.set(fk.id,[...(groups.get(fk.id)??[]),fk]);
    }
    return [...groups.values()].map(keys=>({child,parent:keys[0].table,keys}));
  });
  db.exec('BEGIN IMMEDIATE; PRAGMA defer_foreign_keys=ON;');
  try {
    for(const target of targets.values())db.exec(`CREATE TEMP TABLE ${target}(row_id INTEGER PRIMARY KEY)`);
    db.prepare(`INSERT INTO ${targets.get('players')} SELECT rowid FROM players WHERE id=?`).run(account.player_id);
    let added:number;
    do {
      added=0;
      for(const {child,parent,keys} of links) {
        const join=keys.map(k=>`c.${quote(k.from)}=p.${quote(k.to)}`).join(' AND ');
        added+=Number(db.prepare(`INSERT OR IGNORE INTO ${targets.get(child)} SELECT c.rowid FROM ${quote(child)} c JOIN ${quote(parent)} p ON ${join} JOIN ${targets.get(parent)} t ON t.row_id=p.rowid`).run().changes);
      }
    } while(added);
    const cleared:Record<string,number>={};
    for(const name of tables) {
      if(name==='players')continue;
      const count=Number(db.prepare(`DELETE FROM ${quote(name)} WHERE rowid IN (SELECT row_id FROM ${targets.get(name)})`).run().changes);
      if(count)cleared[name]=count;
    }
    // Recreate the same player ID using schema defaults, preserving account references.
    db.prepare('DELETE FROM players WHERE id=?').run(account.player_id);
    db.prepare('INSERT INTO players(id) VALUES (?)').run(account.player_id);
    if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Reset foreign key check failed.');
    db.exec('COMMIT');
    store.ensurePlayer(account.player_id);
    const fresh=store.view(account.player_id);
    if(fresh.run || fresh.coins!==0 || fresh.growthPoints!==0)throw Error('New player state verification failed.');
    console.log(JSON.stringify({backup:destination,cleared,newPlayer:{coins:fresh.coins,growthPoints:fresh.growthPoints,run:fresh.run,partners:store.trainingCollection(account.player_id).length}},null,2));
  } catch(error) {if(db.isTransaction)db.exec('ROLLBACK');throw error;}
} finally {store.close();}
