export const schema = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  coins INTEGER NOT NULL DEFAULT 0 CHECK(coins >= 0),
  growth_points INTEGER NOT NULL DEFAULT 0 CHECK(growth_points >= 0)
) STRICT;
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, player_id TEXT NOT NULL UNIQUE REFERENCES players(id),
  password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS account_sessions (
  token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), expires_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS save_claims (
  token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), expires_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS auth_limits (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS player_settings (
  player_id TEXT PRIMARY KEY REFERENCES players(id), audio TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS unlocks (
  player_id TEXT NOT NULL REFERENCES players(id),
  species TEXT NOT NULL,
  PRIMARY KEY(player_id, species)
) STRICT;
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  floor INTEGER NOT NULL CHECK(floor > 0),
  state TEXT NOT NULL CHECK(state IN ('select','battle','recruit','lost','cleared','abandoned')),
  created_at INTEGER NOT NULL,
  total_floors INTEGER NOT NULL DEFAULT 100 CHECK(total_floors BETWEEN 1 AND 100),
  profiles TEXT NOT NULL DEFAULT '{}'
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS one_active_run ON runs(player_id)
  WHERE state IN ('select','battle','recruit');
CREATE TABLE IF NOT EXISTS members (
  run_id TEXT NOT NULL REFERENCES runs(id),
  slot INTEGER NOT NULL CHECK(slot >= 0 AND slot < 6),
  species TEXT NOT NULL,
  PRIMARY KEY(run_id, slot), UNIQUE(run_id, species)
) STRICT;
CREATE TABLE IF NOT EXISTS run_villains (
  run_id TEXT PRIMARY KEY REFERENCES runs(id), organization TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  floor INTEGER NOT NULL,
  player_team TEXT NOT NULL, opponent_team TEXT NOT NULL, seed TEXT NOT NULL,
  engine_version TEXT NOT NULL, format TEXT NOT NULL, ai_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','complete')),
  reward INTEGER NOT NULL CHECK(reward >= 0), candidates TEXT NOT NULL,
  log TEXT, view TEXT, boss TEXT, trainer TEXT, upgrades TEXT NOT NULL DEFAULT '[]',
  stage INTEGER NOT NULL DEFAULT 0 CHECK(stage IN (0,1)),
  attempt INTEGER NOT NULL DEFAULT 0 CHECK(attempt>=0),
  UNIQUE(run_id, floor, stage, attempt)
) STRICT;
CREATE TABLE IF NOT EXISTS actions (
  battle_id TEXT NOT NULL REFERENCES battles(id),
  request_id INTEGER NOT NULL CHECK(request_id > 0),
  command TEXT NOT NULL,
  PRIMARY KEY(battle_id, request_id)
) STRICT;
CREATE TABLE IF NOT EXISTS rewards (
  battle_id TEXT PRIMARY KEY REFERENCES battles(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  amount INTEGER NOT NULL CHECK(amount > 0)
) STRICT;
CREATE TABLE IF NOT EXISTS recruitments (
  battle_id TEXT PRIMARY KEY REFERENCES battles(id),
  species TEXT, replaced TEXT, iv_gain TEXT, move_gain TEXT
) STRICT;
CREATE TABLE IF NOT EXISTS run_upgrades (
  run_id TEXT NOT NULL REFERENCES runs(id), kind TEXT NOT NULL CHECK(kind IN ('attack','speed','guard','defense','specialAttack','specialDefense','accuracy','critical')),
  start_floor INTEGER NOT NULL, end_floor INTEGER NOT NULL,
  PRIMARY KEY(run_id,kind)
) STRICT;
CREATE TABLE IF NOT EXISTS growth_rewards (
  run_id TEXT PRIMARY KEY REFERENCES runs(id), amount INTEGER NOT NULL CHECK(amount>=0)
) STRICT;
CREATE TABLE IF NOT EXISTS machine_shops (
  run_id TEXT NOT NULL REFERENCES runs(id), floor INTEGER NOT NULL,
  offers TEXT NOT NULL, PRIMARY KEY(run_id,floor)
) STRICT;
CREATE TABLE IF NOT EXISTS machine_purchases (
  run_id TEXT NOT NULL, floor INTEGER NOT NULL, move TEXT NOT NULL,
  species TEXT NOT NULL, slot INTEGER, price INTEGER NOT NULL CHECK(price>0),
  PRIMARY KEY(run_id,floor,move),
  FOREIGN KEY(run_id,floor) REFERENCES machine_shops(run_id,floor)
) STRICT;
CREATE TABLE IF NOT EXISTS pokemon_training (
  player_id TEXT NOT NULL REFERENCES players(id), species TEXT NOT NULL,
  profile TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
  PRIMARY KEY(player_id,species)
) STRICT;
CREATE TABLE IF NOT EXISTS move_unlocks (
  player_id TEXT NOT NULL REFERENCES players(id), species TEXT NOT NULL, move TEXT NOT NULL,
  PRIMARY KEY(player_id,species,move)
) STRICT;
CREATE TABLE IF NOT EXISTS favorites (
  player_id TEXT NOT NULL REFERENCES players(id), species TEXT NOT NULL,
  PRIMARY KEY(player_id,species)
) STRICT;
CREATE TABLE IF NOT EXISTS run_item_bag (
  run_id TEXT NOT NULL REFERENCES runs(id), item TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>=0),
  PRIMARY KEY(run_id,item)
) STRICT;
CREATE TABLE IF NOT EXISTS run_held_items (
  run_id TEXT NOT NULL REFERENCES runs(id), species TEXT NOT NULL, item TEXT NOT NULL,
  PRIMARY KEY(run_id,species)
) STRICT;
CREATE TABLE IF NOT EXISTS item_purchases (
  run_id TEXT NOT NULL REFERENCES runs(id), floor INTEGER NOT NULL, item TEXT NOT NULL,
  PRIMARY KEY(run_id,floor,item)
) STRICT;
CREATE TABLE IF NOT EXISTS item_shops (
  run_id TEXT NOT NULL REFERENCES runs(id), floor INTEGER NOT NULL,
  offers TEXT NOT NULL, PRIMARY KEY(run_id,floor)
) STRICT;
CREATE TABLE IF NOT EXISTS run_themes (
  run_id TEXT PRIMARY KEY REFERENCES runs(id), theme TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS run_progression (
  run_id TEXT PRIMARY KEY REFERENCES runs(id),
  version TEXT NOT NULL CHECK(version IN ('hundred-floor-v1'))
) STRICT;
CREATE TABLE IF NOT EXISTS shop_rerolls(run_id TEXT NOT NULL REFERENCES runs(id),floor INTEGER NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('items','machines')),count INTEGER NOT NULL CHECK(count>=0),PRIMARY KEY(run_id,floor,kind)) STRICT;
CREATE TABLE IF NOT EXISTS shop_receipts(run_id TEXT NOT NULL REFERENCES runs(id),floor INTEGER NOT NULL,kind TEXT NOT NULL,revision INTEGER NOT NULL,product TEXT NOT NULL,buyer TEXT,PRIMARY KEY(run_id,floor,kind,revision,product)) STRICT;
CREATE TABLE IF NOT EXISTS vitamin_shops(run_id TEXT NOT NULL REFERENCES runs(id),floor INTEGER NOT NULL,offers TEXT NOT NULL,PRIMARY KEY(run_id,floor)) STRICT;
CREATE TABLE IF NOT EXISTS vitamin_purchases(run_id TEXT NOT NULL REFERENCES runs(id),floor INTEGER NOT NULL,stat TEXT NOT NULL,species TEXT NOT NULL,price INTEGER NOT NULL,PRIMARY KEY(run_id,floor,stat)) STRICT;
CREATE TABLE IF NOT EXISTS run_stat_boosts(run_id TEXT NOT NULL REFERENCES runs(id),species TEXT NOT NULL,stat TEXT NOT NULL,points INTEGER NOT NULL CHECK(points>=0),PRIMARY KEY(run_id,species,stat)) STRICT;
CREATE TABLE IF NOT EXISTS consumable_shops(run_id TEXT NOT NULL REFERENCES runs(id),floor INTEGER NOT NULL,offers TEXT NOT NULL,PRIMARY KEY(run_id,floor)) STRICT;
CREATE TABLE IF NOT EXISTS run_tera_tickets(run_id TEXT PRIMARY KEY REFERENCES runs(id),quantity INTEGER NOT NULL CHECK(quantity>=0)) STRICT;
CREATE TABLE IF NOT EXISTS tera_purchases(run_id TEXT NOT NULL REFERENCES runs(id),floor INTEGER NOT NULL,PRIMARY KEY(run_id,floor)) STRICT;
CREATE TABLE IF NOT EXISTS run_villain_campaigns(run_id TEXT PRIMARY KEY REFERENCES runs(id),defeated_battle_id TEXT UNIQUE REFERENCES battles(id)) STRICT;
CREATE TABLE IF NOT EXISTS run_battle_items(run_id TEXT NOT NULL REFERENCES runs(id),kind TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>=0),PRIMARY KEY(run_id,kind)) STRICT;
CREATE TABLE IF NOT EXISTS run_rules(run_id TEXT PRIMARY KEY REFERENCES runs(id),rule TEXT NOT NULL CHECK(rule IN ('basic','mega','dynamax','tera','z','chaos'))) STRICT;
CREATE TABLE IF NOT EXISTS permanent_upgrades(player_id TEXT PRIMARY KEY REFERENCES players(id),reroll_level INTEGER NOT NULL DEFAULT 0 CHECK(reroll_level BETWEEN 0 AND 2),shiny_tickets INTEGER NOT NULL DEFAULT 0 CHECK(shiny_tickets>=0),egg_tickets INTEGER NOT NULL DEFAULT 0 CHECK(egg_tickets>=0)) STRICT;
CREATE TABLE IF NOT EXISTS permanent_receipts(player_id TEXT NOT NULL REFERENCES players(id),request_id TEXT NOT NULL,payload TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(player_id,request_id)) STRICT;
CREATE TABLE IF NOT EXISTS run_routes(run_id TEXT PRIMARY KEY REFERENCES runs(id),second_theme TEXT NOT NULL,pending_boss INTEGER NOT NULL DEFAULT 0) STRICT;
CREATE TABLE IF NOT EXISTS permanent_retry_upgrades(player_id TEXT PRIMARY KEY REFERENCES players(id),level INTEGER NOT NULL DEFAULT 0 CHECK(level BETWEEN 0 AND 3)) STRICT;
CREATE TABLE IF NOT EXISTS run_retries(run_id TEXT PRIMARY KEY REFERENCES runs(id),retry_limit INTEGER NOT NULL CHECK(retry_limit BETWEEN 0 AND 3),used INTEGER NOT NULL DEFAULT 0 CHECK(used BETWEEN 0 AND 3),pending_battle_id TEXT REFERENCES battles(id)) STRICT;
CREATE TABLE IF NOT EXISTS run_trainer_equipment(run_id TEXT NOT NULL REFERENCES runs(id),item TEXT NOT NULL CHECK(item IN ('Dynamax Band','Tera Orb')),PRIMARY KEY(run_id,item)) STRICT;
  PRAGMA user_version = 31;
`;
