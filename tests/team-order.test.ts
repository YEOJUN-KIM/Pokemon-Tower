import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {defaultProfile} from '../src/server/training';
import {selectableForms} from '../src/data/selectable-forms';
import {packTeam} from '../src/data/teams';
import type {BattleLog} from '../src/battle/run';
import type {BattleView} from '../src/web/contracts';

function win(store:TowerStore,id:string,publicProtocol:string[]=[]){
  const row=store.battle(id);
  const log:BattleLog={schemaVersion:1,engineVersion:row.engine_version,format:row.format,trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams:{p1:row.player_team,p2:row.opponent_team},seed:JSON.parse(row.seed),rule:row.rule,upgrades:JSON.parse(row.upgrades),teraTickets:JSON.parse(row.tera_tickets),decisions:[],publicProtocol,winner:'Player',turns:5};
  const view:BattleView={id,status:'complete',requestId:1,turn:5,team:[],opponent:null,actions:[],messages:[],winner:'Player',error:null};
  store.complete(id,log,view);
  store.recruit('order',row.run_id,id,null,null);
}

test('Rapid Strike Urshifu stays ahead of Garchomp and Gengar after each battle',()=>{
  const store=new TowerStore(':memory:');
  try{
    store.ensurePlayer('order');
    for(const name of ['Urshifu','Garchomp','Gengar'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('order',name);
    const entry=store.trainingCollection('order').find(p=>p.species==='Urshifu')!;
    store.train('order','Urshifu',entry.revision,defaultProfile('Urshifu','Urshifu-Rapid-Strike'));
    const team=['Urshifu','Garchomp','Gengar'];
    let id=store.start('order',team,'basic');
    for(let floor=1;floor<=3;floor++){
      assert.equal(Showdown.Teams.unpack(store.battle(id).player_team)![0].species,'Urshifu-Rapid-Strike');
      win(store,id);
      const run=store.view('order').run!;
      assert.deepEqual(run.suggestedTeam,team);
      if(floor<3)id=store.enter('order',run.id,run.floor,run.suggestedTeam);
    }
  }finally{store.close();}
});

test('form item settlement updates one collection member and removes knocked-off items',()=>{
  const store=new TowerStore(':memory:');
  try{
    store.ensurePlayer('order');store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('order','Urshifu');
    const entry=store.trainingCollection('order').find(p=>p.species==='Urshifu')!;
    store.train('order','Urshifu',entry.revision,defaultProfile('Urshifu','Urshifu-Rapid-Strike'));
    const first=store.start('order',['Urshifu','Blastoise','Venusaur'],'basic'),runId=store.battle(first).run_id;
    store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(runId,'Urshifu','Leftovers');
    store.db.prepare('UPDATE battles SET player_team=? WHERE id=?').run(packTeam(['Urshifu','Blastoise','Venusaur'],{Urshifu:defaultProfile('Urshifu','Urshifu-Rapid-Strike')},{Urshifu:'Leftovers'}),first);
    win(store,first);
    assert.deepEqual(store.view('order').run!.heldItems,{Urshifu:'Leftovers'});
    const second=store.enter('order',runId,2,['Urshifu','Blastoise','Venusaur']);
    assert.equal(Showdown.Teams.unpack(store.battle(second).player_team)![0].item,'Leftovers');
    win(store,second,['|-enditem|p1a: Urshifu|Leftovers|[from] move: Knock Off']);
    assert.deepEqual(store.view('order').run!.heldItems,{});
  }finally{store.close();}
});

test('existing duplicate form holders merge on reopening, preserve tools and stay repaired',()=>{
  const path=`.data/tests/form-items-${randomUUID()}.sqlite`;
  let store=new TowerStore(path);
  try{
    store.ensurePlayer('order');store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('order','Urshifu');
    const id=store.start('order',['Urshifu','Blastoise','Venusaur'],'basic'),runId=store.battle(id).run_id;
    store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(runId,'Urshifu','Dynamax Band');
    store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(runId,'Urshifu-Rapid-Strike','Leftovers');
    for(let reopen=0;reopen<2;reopen++){
      store.close();store=new TowerStore(path);
      const run=store.view('order').run!;
      assert.deepEqual(run.heldItems,{Urshifu:'Dynamax Band'});
      assert.equal(run.itemBag!.Leftovers,1);
    }
  }finally{store.close();}
});

test('family forms preserve a newly selected lead order, while separate forms keep their identity',()=>{
  for(const [forme,form] of Object.entries(selectableForms)){
    const store=new TowerStore(':memory:');
    try{
      store.ensurePlayer('order');
      const member=form.collection==='family'?form.baseSpecies:forme;
      store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('order',member);
      if(form.collection==='family'){
        const entry=store.trainingCollection('order').find(p=>p.species===member)!;
        store.train('order',member,entry.revision,defaultProfile(member,forme));
      }
      const first=store.start('order',['Blastoise',member,'Venusaur'],'basic');
      win(store,first);
      const run=store.view('order').run!;
      const team=[member,'Venusaur','Blastoise'];
      const second=store.enter('order',run.id,run.floor,team);
      win(store,second);
      assert.deepEqual(store.view('order').run!.suggestedTeam,team,forme);
    }finally{store.close();}
  }
});
