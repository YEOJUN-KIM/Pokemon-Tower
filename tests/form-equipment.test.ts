import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {packTeam,packPlayerTeam,pokemonSets} from '../src/data/teams';
import {collectionSpecies,selectableForms} from '../src/data/selectable-forms';
import gigantamaxForms from '../src/data/gigantamax-forms.json' with {type:'json'};
import {defaultProfile} from '../src/server/training';
import {BattleSession} from '../src/server/battle-session';
import {TowerStore} from '../src/server/tower-store';
import {presentationFrames} from '../src/web/battle-presentation';
import {registerHooks} from 'node:module';
registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}});
const {TowerControls}=await import('../src/web/tower-controls');
import {species,pokemonName} from '../src/web/catalog';
import {existsSync} from 'node:fs';
import {pokemonImageSources} from '../src/web/pokemon-image';

test('every playable Gigantamax species receives the player flag and has the matching form sprite',()=>{
  for(const gmax of Object.keys(gigantamaxForms)){
    const normal=gmax.replace(/-Gmax$/,''),member=collectionSpecies(normal);
    if(!pokemonSets[member])continue;
    const profile=defaultProfile(member,normal===member?undefined:normal);
    const packed=Showdown.Teams.unpack(packPlayerTeam([member,'Blastoise','Venusaur'],{[member]:profile},{[member]:'Dynamax Band'}))!;
    assert.equal(packed[0].species,normal);
    assert.equal(packed[0].gigantamax,true,gmax);
    assert.ok(species[gmax],gmax);
    assert.deepEqual(species[gmax].types,species[normal].types,gmax);
    assert.ok(pokemonImageSources(species[gmax].id,false,true,species[gmax].spriteKey).some(path=>existsSync('public'+path)),gmax);
  }
});

test('both Urshifu styles and Gengar show their own Gigantamax form, restore it and animate correctly',async()=>{
  for(const normal of ['Urshifu','Urshifu-Rapid-Strike','Gengar']){
    const member=collectionSpecies(normal),profile=defaultProfile(member,normal===member?undefined:normal);
    profile.moves=['Protect',normal==='Urshifu-Rapid-Strike'?'Surging Strikes':normal==='Urshifu'?'Wicked Blow':'Shadow Ball'];
    const enemy=Showdown.Teams.unpack(packTeam(['Blastoise','Venusaur','Gyarados']))!;
    for(const set of enemy)set.moves=['Protect'];
    const session=new BattleSession(async()=>{},[1,2,3,4],{rule:'dynamax',teams:{p1:packPlayerTeam([member,'Blastoise','Venusaur'],{[member]:profile},{[member]:'Dynamax Band'}),p2:Showdown.Teams.pack(enemy)}});
    try{
      const before=await session.ready();
      let view=await session.submit(before.id,before.requestId,'move 1 dynamax');
      assert.equal(view.team[0].displaySpecies,normal+'-Gmax');
      assert.equal(view.team[0].species,member);
      assert.ok(view.messages.some(line=>line.includes('|Dynamax|Gmax')));
      const frames=presentationFrames(before,view);
      assert.equal(frames.find(frame=>frame.motion?.kind==='dynamax-grow')!.view.team[0].displaySpecies,normal+'-Gmax');
      for(let turn=0;turn<2;turn++)view=await session.submit(view.id,view.requestId,'move 1');
      assert.equal(view.team[0].dynamax,false);
      assert.equal(view.team[0].displaySpecies,normal);
    }finally{await session.dispose();}
  }
});

test('all selectable family forms keep equipment under the collection member after settlement',()=>{
  for(const [forme,form] of Object.entries(selectableForms)){
    if(form.collection!=='family')continue;
    const store=new TowerStore(':memory:');
    try{
      store.ensurePlayer('forms');store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('forms',form.baseSpecies);
      const saved=store.trainingCollection('forms').find(entry=>entry.species===form.baseSpecies)!;
      store.train('forms',form.baseSpecies,saved.revision,defaultProfile(form.baseSpecies,forme));
      const row=store.battle(store.start('forms',[form.baseSpecies,'Blastoise','Venusaur'],'chaos'));
      const item=form.requiredItem??'Leftovers';
      store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(row.run_id,form.baseSpecies,item);
      row.player_team=packPlayerTeam([form.baseSpecies,'Blastoise','Venusaur'],{[form.baseSpecies]:defaultProfile(form.baseSpecies,forme)},{[form.baseSpecies]:item});
      store.db.prepare('UPDATE battles SET player_team=? WHERE id=?').run(row.player_team,row.id);
      store.complete(row.id,{schemaVersion:1,engineVersion:row.engine_version,format:row.format,teams:{p1:row.player_team,p2:row.opponent_team},seed:JSON.parse(row.seed),rule:row.rule,upgrades:JSON.parse(row.upgrades),trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teraTickets:JSON.parse(row.tera_tickets),decisions:[],publicProtocol:[],winner:'Player',turns:1},{id:row.id,status:'complete',requestId:1,turn:1,team:[],opponent:null,actions:[],messages:[],winner:'Player',error:null});
      assert.deepEqual(store.view('forms').run!.heldItems,{[form.baseSpecies]:item},forme);
      assert.equal(store.view('forms').run!.partnerForms![form.baseSpecies],forme);
    }finally{store.close();}
  }
});

test('24th floor preparation exposes equipment, transfers a held item and allows mask replacement',()=>{
  const store=new TowerStore(':memory:');
  try{
    store.ensurePlayer('prep');
    for(const name of ['Urshifu','Gengar','Ogerpon'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('prep',name);
    for(const [name,forme] of [['Urshifu','Urshifu-Rapid-Strike'],['Ogerpon','Ogerpon-Hearthflame']]){
      const saved=store.trainingCollection('prep').find(entry=>entry.species===name)!;
      store.train('prep',name,saved.revision,defaultProfile(name,forme));
    }
    const row=store.battle(store.start('prep',['Urshifu','Gengar','Ogerpon'],'chaos'));
    store.db.prepare("UPDATE runs SET floor=24,state='select' WHERE id=?").run(row.run_id);
    store.db.prepare('INSERT INTO run_item_bag VALUES (?,?,1)').run(row.run_id,'Hearthflame Mask');store.equipItem('prep',row.run_id,24,'Ogerpon','Hearthflame Mask');
    store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(row.run_id,'Urshifu','Mystic Water');
    store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(row.run_id,'Gengar','Leftovers');
    const tower=store.view('prep');
    const html=renderToStaticMarkup(createElement(TowerControls,{tower,selected:['Urshifu','Gengar','Ogerpon'],setSelected:()=>{},busy:false,submit:async()=>{}}));
    assert.match(html,/data-open-bag="true"/);
    assert.match(html,/24층/);
    assert.ok(html.includes(pokemonName('Urshifu-Rapid-Strike')));
    store.equipItem('prep',row.run_id,24,'Gengar','Mystic Water','Urshifu');
    assert.deepEqual(store.view('prep').run!.heldItems,{Gengar:'Mystic Water',Ogerpon:'Hearthflame Mask'});
    store.equipItem('prep',row.run_id,24,'Ogerpon',null);assert.equal(store.view('prep').run!.partnerForms!.Ogerpon,undefined);store.equipItem('prep',row.run_id,24,'Ogerpon','Hearthflame Mask');
    store.db.prepare('INSERT INTO run_trainer_equipment VALUES (?,?)').run(row.run_id,'Dynamax Band');
    const next=store.battle(store.enter('prep',row.run_id,24,['Gengar','Urshifu','Ogerpon']));
    const team=Showdown.Teams.unpack(next.player_team)!;
    assert.equal(team[0].item,'Mystic Water');assert.equal(team[0].gigantamax,true);
    assert.equal(team[1].species,'Urshifu-Rapid-Strike');assert.equal(team[1].item,'');assert.equal(store.view('prep').run!.itemBag!.Leftovers,1);
    assert.equal(team[2].species,'Ogerpon-Hearthflame');assert.equal(team[2].item,'Hearthflame Mask');
  }finally{store.close();}
});

test('each Ogerpon mask transforms without changing the collection identity or held mask',async()=>{
  for(const normal of ['Ogerpon','Ogerpon-Wellspring','Ogerpon-Hearthflame','Ogerpon-Cornerstone']){
    const profile=defaultProfile('Ogerpon',normal==='Ogerpon'?undefined:normal);
    profile.moves=['Protect','Ivy Cudgel'];
    const enemy=Showdown.Teams.unpack(packTeam(['Blastoise','Venusaur','Gyarados']))!;
    for(const set of enemy)set.moves=['Protect'];
    const session=new BattleSession(async()=>{},[1,2,3,4],{rule:'tera',teraTickets:{p1:1,p2:0},teams:{p1:packPlayerTeam(['Ogerpon','Blastoise','Venusaur'],{Ogerpon:profile},selectableForms[normal]?.requiredItem?{Ogerpon:selectableForms[normal].requiredItem!}:{}),p2:Showdown.Teams.pack(enemy)}});
    try{
      const before=await session.ready();
      const after=await session.submit(before.id,before.requestId,'move 1 terastallize');
      const transformed=normal==='Ogerpon'?'Ogerpon-Teal-Tera':normal+'-Tera';
      assert.equal(after.team[0].species,'Ogerpon');
      assert.equal(after.team[0].displaySpecies,transformed);
      assert.equal(species[transformed].id,species[normal].id);
      assert.equal(species[transformed].spriteKey,species[normal].spriteKey);
      assert.equal(after.team[0].item,before.team[0].item);
      assert.ok(presentationFrames(before,after).some(frame=>frame.view.team[0].displaySpecies===transformed));
    }finally{await session.dispose();}
  }
});
