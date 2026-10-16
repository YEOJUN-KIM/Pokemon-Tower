import type {DatabaseSync} from 'node:sqlite';
import {schema} from '../schema';
import {statKeys,type StatBlock,type TrainingProfile} from '../../data/training';
import {pokemonSets} from '../../data/teams';
import {defaultProfile} from '../training';
import {transaction} from './transaction';

// Preserve migration order and repair timing; repairs run in this transaction.
export function initializeTowerDatabase(db:DatabaseSync,repairArchivedOwnership:()=>void,repairFormHeldItems:()=>void):void {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    const version = db.prepare('PRAGMA user_version').get() as {user_version: number};
    if (version.user_version > 35) throw new Error('Unsupported database schema');
    // SQLite requires foreign keys disabled outside the transaction while rebuilding a parent table.
    if(version.user_version<28)db.exec('PRAGMA foreign_keys=OFF');
    try {transaction(db,() => {
      db.exec(schema);
      if(!(db.prepare('PRAGMA table_info(run_events)').all() as {name:string}[]).some(column=>column.name==='kind'))db.exec("ALTER TABLE run_events ADD COLUMN kind TEXT NOT NULL DEFAULT 'mystery-chest' CHECK(kind IN ('mystery-chest','breeder-gift','traveling-merchant'))");
      // Event IDs are content, not schema. Rebuild only this leaf table; keep
      // receipts, pending rewards, completed rows and the one-pending index.
      if(version.user_version<34){
        const definition=schema.match(/CREATE TABLE IF NOT EXISTS run_events\s*\([\s\S]*?\) STRICT;/)![0];
        db.exec(definition.replace('IF NOT EXISTS run_events','run_events_v34'));
        const hasChoice=(db.prepare('PRAGMA table_info(run_events)').all() as {name:string}[]).some(c=>c.name==='choice_id');
        const choice=hasChoice?'choice_id':"CASE WHEN status='choice' THEN NULL WHEN reward_kind IS NULL THEN 'skip' ELSE 'open' END";
        db.exec(`INSERT INTO run_events_v34(id,run_id,after_floor,kind,status,reward_kind,amount,choice_id)
          SELECT id,run_id,after_floor,kind,status,reward_kind,amount,${choice} FROM run_events;
          DROP TABLE run_events; ALTER TABLE run_events_v34 RENAME TO run_events;
          CREATE UNIQUE INDEX one_pending_run_event ON run_events(run_id) WHERE status!='complete';`);
        if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Event migration failed foreign key validation');
      }
      if(version.user_version<35){
        // Existing runs stay on v1. Only explicitly enabled new runs use v2.
        db.exec(`CREATE TABLE run_event_rules_v35(run_id TEXT PRIMARY KEY REFERENCES runs(id),version INTEGER NOT NULL CHECK(version IN (1,2))) STRICT;
          INSERT INTO run_event_rules_v35 SELECT * FROM run_event_rules;
          DROP TABLE run_event_rules; ALTER TABLE run_event_rules_v35 RENAME TO run_event_rules;`);
        const definition=schema.match(/CREATE TABLE IF NOT EXISTS run_events\s*\([\s\S]*?\) STRICT;/)![0];
        db.exec(definition.replace('IF NOT EXISTS run_events','run_events_v35'));
        const hasResult=(db.prepare('PRAGMA table_info(run_events)').all() as {name:string}[]).some(c=>c.name==='result_json');
        db.exec(`INSERT INTO run_events_v35(id,run_id,after_floor,kind,status,reward_kind,amount,choice_id,result_json)
          SELECT id,run_id,after_floor,kind,status,reward_kind,amount,choice_id,${hasResult?'result_json':'NULL'} FROM run_events;
          DROP TABLE run_events; ALTER TABLE run_events_v35 RENAME TO run_events;
          CREATE UNIQUE INDEX one_pending_run_event ON run_events(run_id) WHERE status!='complete';`);
        if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Reward migration failed foreign key validation');
      }
      const playerColumns=db.prepare('PRAGMA table_info(players)').all() as {name:string}[];
      if(!playerColumns.some(column=>column.name==='growth_points')) {
        db.exec('ALTER TABLE players ADD COLUMN growth_points INTEGER NOT NULL DEFAULT 0 CHECK(growth_points>=0)');
        // Preserve the previous permanent wallet once. Existing climbs retain only their own earnings.
        db.exec('UPDATE players SET growth_points=coins, coins=0');
        db.exec(`UPDATE players SET coins=MAX(0,
          COALESCE((SELECT SUM(rewards.amount) FROM rewards JOIN battles ON battles.id=rewards.battle_id JOIN runs ON runs.id=battles.run_id WHERE runs.player_id=players.id AND runs.state IN ('select','battle','recruit')),0)
          -COALESCE((SELECT COUNT(*)*200 FROM run_upgrades JOIN runs ON runs.id=run_upgrades.run_id WHERE runs.player_id=players.id AND runs.state IN ('select','battle','recruit')),0))`);
        db.exec("INSERT OR IGNORE INTO growth_rewards SELECT id,0 FROM runs WHERE state IN ('lost','cleared','abandoned')");
      }
      const battleColumns = db.prepare('PRAGMA table_info(battles)').all() as {name: string}[];
      if(!battleColumns.some(column=>column.name==='trainer_equipment'))db.exec('ALTER TABLE battles ADD COLUMN trainer_equipment TEXT');
      if (!battleColumns.some(column => column.name === 'boss')) db.exec('ALTER TABLE battles ADD COLUMN boss TEXT');
      if (!battleColumns.some(column => column.name === 'trainer')) db.exec('ALTER TABLE battles ADD COLUMN trainer TEXT');
      if (!battleColumns.some(column => column.name === 'upgrades')) db.exec("ALTER TABLE battles ADD COLUMN upgrades TEXT NOT NULL DEFAULT '[]'");
      if(!battleColumns.some(column=>column.name==='battle_items'))db.exec("ALTER TABLE battles ADD COLUMN battle_items TEXT NOT NULL DEFAULT '{}'");
      if(!battleColumns.some(column=>column.name==='tera_tickets'))db.exec(`ALTER TABLE battles ADD COLUMN tera_tickets TEXT NOT NULL DEFAULT '{"p1":0,"p2":0}'`);
      if(!battleColumns.some(column=>column.name==='villain_event'))db.exec('ALTER TABLE battles ADD COLUMN villain_event TEXT');
      if(!battleColumns.some(column=>column.name==='rule'))db.exec("ALTER TABLE battles ADD COLUMN rule TEXT NOT NULL DEFAULT 'chaos'");
      if(!battleColumns.some(column=>column.name==='stage')){
        const sql=(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='battles'").get() as {sql:string}).sql;
        const definition=sql.replace(/^CREATE TABLE(?: IF NOT EXISTS)?\s+["`]?battles["`]?/i,'CREATE TABLE battles_route_migration').replace(/UNIQUE\s*\(\s*run_id\s*,\s*floor\s*\)/i,'stage INTEGER NOT NULL DEFAULT 0 CHECK(stage IN (0,1)), UNIQUE(run_id, floor, stage)');
        if(!definition.includes('stage INTEGER'))throw Error('Unsupported battle table migration');
        db.exec(definition);
        const names=(db.prepare('PRAGMA table_info(battles)').all() as {name:string}[]).map(column=>'"'+column.name.replaceAll('"','""')+'"').join(',');
        db.exec(`INSERT INTO battles_route_migration(${names}) SELECT ${names} FROM battles; DROP TABLE battles; ALTER TABLE battles_route_migration RENAME TO battles;`);
      }
      const columns = db.prepare('PRAGMA table_info(runs)').all() as {name: string}[];
      if(!columns.some(column=>column.name==='profiles'))db.exec("ALTER TABLE runs ADD COLUMN profiles TEXT NOT NULL DEFAULT '{}'");
      const recruitmentColumns=db.prepare('PRAGMA table_info(recruitments)').all() as {name:string}[];
      if(!recruitmentColumns.some(column=>column.name==='move_gain'))db.exec('ALTER TABLE recruitments ADD COLUMN move_gain TEXT');
      if(!recruitmentColumns.some(column=>column.name==='iv_gain'))db.exec('ALTER TABLE recruitments ADD COLUMN iv_gain TEXT');
      if (!columns.some(column => column.name === 'total_floors')) {
        // Old runs keep their three-floor finish, even when resumed after this update.
        db.exec('ALTER TABLE runs ADD COLUMN total_floors INTEGER NOT NULL DEFAULT 3 CHECK(total_floors BETWEEN 1 AND 30)');
      }
      if(version.user_version<7) {
        // Convert the collection once; existing run snapshots and packed battles keep their original rules.
        const saved=db.prepare('SELECT player_id,species,profile FROM pokemon_training').all() as {player_id:string;species:string;profile:string}[];
        for(const row of saved) {
          const profile=JSON.parse(row.profile) as TrainingProfile;
          if(profile.statSystem==='points')continue;
          profile.evs=Object.fromEntries(statKeys.map(key=>[key,Math.floor((profile.evs[key]+4)/8)])) as StatBlock;
          profile.nature=profile.nature ?? 'Serious';profile.statSystem='points';
          db.prepare('UPDATE pokemon_training SET profile=?,revision=revision+1 WHERE player_id=? AND species=?').run(JSON.stringify(profile),row.player_id,row.species);
        }
      }
      if(version.user_version<8) {
        // Preserve old players' configured moves, including unsaved defaults.
        const owned=db.prepare('SELECT player_id,species FROM unlocks').all() as {player_id:string;species:string}[];
        for(const row of owned) {
          const saved=db.prepare('SELECT profile FROM pokemon_training WHERE player_id=? AND species=?').get(row.player_id,row.species) as {profile:string}|undefined;
          const profile=saved ? JSON.parse(saved.profile) as TrainingProfile : {...defaultProfile(row.species),moves:[...pokemonSets[row.species as keyof typeof pokemonSets].moves]};
          if(!saved)db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run(row.player_id,row.species,JSON.stringify(profile));
          for(const move of profile.moves)db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run(row.player_id,row.species,move);
        }
      }
      const runSQL=(db.prepare("SELECT sql FROM sqlite_master WHERE name='runs'").get() as {sql:string}).sql;
      if(version.user_version<15 || !runSQL.includes('BETWEEN 1 AND 100')){
        const definition=schema.match(/CREATE TABLE IF NOT EXISTS runs \([\s\S]*?\) STRICT;/)![0];
        db.exec(definition.replace('IF NOT EXISTS runs','runs_v12'));
        db.exec('INSERT INTO runs_v12(id,player_id,floor,state,created_at,total_floors,profiles) SELECT id,player_id,floor,state,created_at,total_floors,profiles FROM runs');
        db.exec('DROP TABLE runs; ALTER TABLE runs_v12 RENAME TO runs;');
        db.exec("CREATE UNIQUE INDEX one_active_run ON runs(player_id) WHERE state IN ('select','battle','recruit')");
        if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Tower migration failed foreign key validation');
      }
      const upgradeSQL=(db.prepare("SELECT sql FROM sqlite_master WHERE name='run_upgrades'").get() as {sql:string}).sql;
      if(!upgradeSQL.includes("'critical'")){db.exec("ALTER TABLE run_upgrades RENAME TO run_upgrades_old; CREATE TABLE run_upgrades(run_id TEXT NOT NULL REFERENCES runs(id),kind TEXT NOT NULL CHECK(kind IN ('attack','speed','guard','defense','specialAttack','specialDefense','accuracy','critical')),start_floor INTEGER NOT NULL,end_floor INTEGER NOT NULL,PRIMARY KEY(run_id,kind)) STRICT; INSERT INTO run_upgrades SELECT * FROM run_upgrades_old; DROP TABLE run_upgrades_old;");}
      const ruleSQL=(db.prepare("SELECT sql FROM sqlite_master WHERE name='run_rules'").get() as {sql:string}).sql;
      if(!ruleSQL.includes("'z'")){
        db.exec("CREATE TABLE run_rules_z(run_id TEXT PRIMARY KEY REFERENCES runs(id),rule TEXT NOT NULL CHECK(rule IN ('basic','mega','dynamax','tera','z','chaos'))) STRICT; INSERT INTO run_rules_z SELECT * FROM run_rules; DROP TABLE run_rules; ALTER TABLE run_rules_z RENAME TO run_rules;");
      }
      if(!(db.prepare('PRAGMA table_info(battles)').all() as {name:string}[]).some(c=>c.name==='attempt')){
        const sql=(db.prepare("SELECT sql FROM sqlite_master WHERE name='battles'").get() as {sql:string}).sql;
        const definition=sql.replace(/^CREATE TABLE(?: IF NOT EXISTS)?\s+["`]?battles["`]?/i,'CREATE TABLE battles_retry_migration').replace(/UNIQUE\s*\(\s*run_id\s*,\s*floor\s*,\s*stage\s*\)/i,'attempt INTEGER NOT NULL DEFAULT 0 CHECK(attempt>=0), UNIQUE(run_id, floor, stage, attempt)');
        if(!definition.includes('attempt INTEGER'))throw Error('Unsupported retry migration');
        db.exec(definition);
        const names=(db.prepare('PRAGMA table_info(battles)').all() as {name:string}[]).map(c=>'"'+c.name+'"').join(',');
        db.exec(`INSERT INTO battles_retry_migration(${names}) SELECT ${names} FROM battles; DROP TABLE battles; ALTER TABLE battles_retry_migration RENAME TO battles;`);
        if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Retry migration failed foreign key validation');
      }
      repairArchivedOwnership();
      repairFormHeldItems();
      if(version.user_version<31){
        // Inventory and starter tickets do not prove a trainer-equipment purchase.
        db.exec(`DELETE FROM run_held_items WHERE item='Dynamax Band';
          DELETE FROM run_item_bag WHERE item IN ('Dynamax Band','Tera Orb');
          DELETE FROM run_trainer_equipment WHERE NOT EXISTS (
            SELECT 1 FROM shop_receipts p WHERE p.run_id=run_trainer_equipment.run_id AND p.kind='items' AND p.buyer IS NULL AND p.product=run_trainer_equipment.item
          );
          INSERT OR IGNORE INTO run_trainer_equipment
            SELECT run_id,product FROM shop_receipts WHERE kind='items' AND buyer IS NULL AND product IN ('Dynamax Band','Tera Orb');`);
      }
    });} finally {db.exec('PRAGMA foreign_keys=ON');}
}
