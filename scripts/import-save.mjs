import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const source=process.argv[2],destination=process.argv[3];
if(!source||!destination)throw new Error('Usage: node scripts/import-save.mjs save.json recovery-code.txt');
const bundle=JSON.parse(await readFile(source,'utf8'));
if(bundle.version!==1||!/^[a-f0-9]{64}$/.test(bundle.owner))throw new Error('Unsupported save bundle.');
const db=new DatabaseSync(process.env.TOWER_DB_PATH||'.data/tower.sqlite');
try {
  db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;');
  const excluded=new Set(['accounts','account_sessions','save_claims','auth_limits']);
  for(const [name,rows] of Object.entries(bundle.tables)) {
    if(!/^[a-z_]+$/.test(name)||excluded.has(name)||!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name))throw new Error(`Unexpected table: ${name}`);
    const columns=db.prepare(`PRAGMA table_info("${name}")`).all().map(row=>row.name);
    for(const row of rows) {
      const keys=Object.keys(row);
      if(!keys.length||keys.some(key=>!columns.includes(key)))throw new Error(`Unexpected save columns: ${name}`);
      db.prepare(`INSERT OR IGNORE INTO "${name}" (${keys.map(key=>`"${key}"`).join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(key=>row[key]));
    }
  }
  if(db.prepare('SELECT 1 FROM accounts WHERE player_id=?').get(bundle.owner))throw new Error('This save is already connected to an account.');
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Imported save has missing references.');
  const code=randomBytes(24).toString('base64url'),hash=createHash('sha256').update(code).digest('hex');
  db.prepare('DELETE FROM save_claims WHERE player_id=?').run(bundle.owner);
  db.prepare('INSERT INTO save_claims VALUES (?,?,?)').run(hash,bundle.owner,Date.now()+7*86400000);
  // Write the code before committing; it is never logged or exposed by a public endpoint.
  await writeFile(destination,code+'\n',{mode:0o600});
  db.exec('COMMIT');
  console.log('Save imported without replacing existing players. One-time recovery code written to the requested private file (valid for 7 days).');
}catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}finally{db.close();}
