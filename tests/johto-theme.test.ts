import {normalNpcTemplate} from '../src/server/npc-templates';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {towerTrainerEncounter} from '../src/data/tower-trainers';

test('Johto milestones use distinct gyms, three distinct elite trainers and Lance at forty and Red at fifty',()=>{
  const gyms=new Set<string>();
  for(let i=0;i<100;i++){
    const run=`johto-${i}`,chosen=[5,15,25,35,45].map(f=>towerTrainerEncounter(f,run,'johto')!);
    assert.equal(new Set(chosen.map(t=>t.boss.id)).size,5);
    for(const t of chosen){gyms.add(t.boss.id);assert.equal(t.boss.generation,2);assert.equal(t.boss.role,'gym');assert.ok(t.entries.length>=5);}
    const elite=[10,20,30].map(f=>towerTrainerEncounter(f,run,'johto')!);
    assert.equal(new Set(elite.map(t=>t.boss.id)).size,3);for(const t of elite)assert.equal(t.boss.role,'elite');
    assert.equal(towerTrainerEncounter(40,run,'johto')!.boss.name,'목호');
    assert.equal(towerTrainerEncounter(50,run,'johto')!.boss.name,'레드');assert.equal(towerTrainerEncounter(50,run,'johto')!.boss.role,'champion');
    assert.equal(towerTrainerEncounter(51,run,'johto'),null);
  }
  assert.equal(gyms.size,8);
});

test('new Johto preview and fixed template persist, while a v15 legacy run remains unthemed',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('johto');const run=store.battle(store.start('johto',starters)).run_id;
    store.db.prepare('UPDATE run_themes SET theme=? WHERE run_id=?').run('johto',run);
    for(const floor of [5,10,40,50]){
      store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
      const preview=store.view('johto').run!.boss!,encounter=towerTrainerEncounter(floor,run,'johto',true)!;
      assert.equal(store.view('johto').run!.theme,'johto');assert.deepEqual(preview,encounter.boss);
      const id=store.enter('johto',run,floor,starters),row=store.battle(id),team=Showdown.Teams.unpack(row.opponent_team)!;
      assert.equal(team.length,3);assert.equal(new Set(team.map(p=>p.species)).size,3);
      const template=normalNpcTemplate(preview.id,floor,preview.role)!;
      assert.ok(team.some(p=>p.species===template.ace));
      const equipped=team.map(p=>p.item).filter(Boolean);assert.equal(new Set(equipped).size,equipped.length);
      if(floor===50)assert.equal(team.find(p=>p.species==='Dragonite')!.item,'Dragoninite');
      
      for(const p of team){const original=template.team.find(entry=>entry.species===p.species)!;assert.ok(original);assert.equal(p.ability,original.profile.ability);assert.deepEqual(p.moves.map(m=>Showdown.Dex.moves.get(m).name),original.profile.moves);}
      const savedBoss={...preview,npcAi:JSON.parse(row.boss!).npcAi,...(floor===50?{gimmick:template.signature}:{})};
      store.close();store=new TowerStore(path);assert.deepEqual(store.battle(id),row);assert.deepEqual(store.view('johto').run!.boss,savedBoss);
    }
    store.db.prepare("UPDATE runs SET floor=5,state='select' WHERE id=?").run(run);
    store.db.exec('DROP TABLE run_themes; PRAGMA user_version=15;');store.close();store=new TowerStore(path);
    assert.equal(store.view('johto').run!.theme,null);assert.deepEqual(store.view('johto').run!.boss,towerTrainerEncounter(5,run)!.boss);
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{store.close();}
});
