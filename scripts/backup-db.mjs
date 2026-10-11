import {DatabaseSync, backup} from 'node:sqlite';
import {mkdir, access} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';

const source = resolve(process.env.TOWER_DB_PATH || '.data/tower.sqlite');
const destination = resolve(process.argv[2] || `${dirname(source)}/backups/tower-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
if (source === destination) throw new Error('Backup destination must differ from the live database.');
await access(source);
try {await access(destination); throw new Error('Backup destination already exists. Choose a new filename.');}
catch (error) {if (error.code !== 'ENOENT') throw error;}
await mkdir(dirname(destination), {recursive:true});
const db = new DatabaseSync(source, {readOnly:true});
try {
  await backup(db, destination);
  const check = new DatabaseSync(destination, {readOnly:true});
  try {
    if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Backup integrity check failed.');
  } finally {check.close();}
  console.log(`Backup created: ${destination}`);
} finally {db.close();}
