import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {towerThemes,secondTowerTheme,type TowerTheme} from '../src/data/tower-themes';
import {towerTrainerEncounter} from '../src/data/tower-trainers';

test('second region never repeats and new Johto route ends with champion then Red',()=>{
  for(const first of Object.keys(towerThemes) as TowerTheme[])for(let i=0;i<100;i++)assert.notEqual(secondTowerTheme(String(i),first),first);
  assert.equal(towerTrainerEncounter(40,'route','johto',true)?.boss.role,'elite');
  assert.equal(towerTrainerEncounter(50,'route','johto',true)?.boss.name,'목호');
  assert.equal(towerTrainerEncounter(50,'route','johto',true,true)?.boss.name,'레드');
  assert.equal(towerTrainerEncounter(50,'route','johto')?.boss.name,'레드');
});

test('hidden battle stays on floor 50, survives reload, advances once, and switches region',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('route');const id=store.start('route',starters),run=store.battle(id).run_id;
    store.db.prepare("UPDATE run_themes SET theme='johto' WHERE run_id=?").run(run);
    store.db.prepare("UPDATE run_routes SET second_theme='hoenn' WHERE run_id=?").run(run);
    store.db.prepare("UPDATE runs SET floor=50,state='recruit' WHERE id=?").run(run);
    store.db.prepare("UPDATE battles SET floor=50,status='complete',boss=? WHERE id=?").run(JSON.stringify(towerTrainerEncounter(50,run,'johto',true)!.boss),id);
    store.recruit('route',run,id,null,null);
    assert.equal(store.view('route').run!.floor,50);assert.equal(store.view('route').run!.boss?.name,'레드');
    assert.equal(store.currentBattle('route'),null);
    store.close();store=new TowerStore(path);
    assert.equal(store.view('route').run!.hiddenBossPending,true);
    const red=store.enter('route',run,50,starters);assert.equal(JSON.parse(store.battle(red).boss!).name,'레드');
    assert.equal(store.currentBattle('route')?.id,red);
    assert.equal((store.db.prepare('SELECT COUNT(*) n FROM battles WHERE run_id=? AND floor=50').get(run) as {n:number}).n,2);
    store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(red);
    store.recruit('route',run,red,null,null);
    assert.equal(store.view('route').run!.floor,51);assert.equal(store.view('route').run!.theme,'hoenn');assert.equal(store.view('route').run!.hiddenBossPending,false);
    assert.throws(()=>store.recruit('route',run,red,null,null));
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{store.close();}
});

test('v25 battle migration preserves saved battle and action references',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('legacy');const id=store.start('legacy',starters),before=store.battle(id);
    store.db.prepare("INSERT INTO actions VALUES (?,1,'move 1')").run(id);
    const sql=(store.db.prepare("SELECT sql FROM sqlite_master WHERE name='battles'").get() as {sql:string}).sql;
    const old=sql.replace('CREATE TABLE battles','CREATE TABLE old_battles').replace(/stage INTEGER NOT NULL DEFAULT 0 CHECK\(stage IN \(0,1\)\),\s*/,'').replace('UNIQUE(run_id, floor, stage)','UNIQUE(run_id, floor)');
    const columns=(store.db.prepare('PRAGMA table_info(battles)').all() as {name:string}[]).filter(c=>c.name!=='stage').map(c=>c.name).join(',');
    store.db.exec(`PRAGMA foreign_keys=OFF;${old};INSERT INTO old_battles(${columns}) SELECT ${columns} FROM battles;DROP TABLE battles;ALTER TABLE old_battles RENAME TO battles;PRAGMA user_version=25;`);
    store.db.prepare('DELETE FROM run_routes WHERE run_id=?').run(before.run_id);
    store.close();store=new TowerStore(path);
    assert.equal(store.battle(id).player_team,before.player_team);assert.equal(store.history(id).length,1);
    assert.equal(store.view('legacy').run!.hiddenBossPending,false);
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{store.close();}
});

test('a second-chapter Johto champion does not clear until Red is beaten',()=>{
  const store=new TowerStore(':memory:');
  try{
    store.ensurePlayer('final');const id=store.start('final',starters),run=store.battle(id).run_id;
    store.db.prepare("UPDATE run_routes SET second_theme='johto' WHERE run_id=?").run(run);
    store.db.prepare("UPDATE runs SET floor=100,state='recruit' WHERE id=?").run(run);
    store.db.prepare("UPDATE battles SET floor=100,status='complete' WHERE id=?").run(id);
    store.recruit('final',run,id,null,null);assert.equal(store.view('final').run!.state,'select');assert.equal(store.view('final').run!.boss?.name,'레드');
    const red=store.enter('final',run,100,starters);
    store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(red);
    store.recruit('final',run,red,null,null);assert.equal(store.view('final').run!.state,'cleared');
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{store.close();}
});
