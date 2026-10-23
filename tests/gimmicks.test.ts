import {publicAssetExists} from './helpers/runtime-assets';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {BattleSession} from '../src/server/battle-session';
import {TowerStore} from '../src/server/tower-store';
import {packTeam,pokemonSets} from '../src/data/teams';
import {FORMAT,PRE_GIMMICK_FORMAT} from '../src/data/battle-rules';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {GimmickPolicy} from '../src/battle/gimmick-policy';
import {DamagePolicy} from '../src/battle/policy';
import {megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {itemIcon,itemIconExtension,heldItems} from '../src/data/held-items';
import {itemShopRule} from '../src/data/held-item-shop';
import {existsSync} from 'node:fs';
import {presentationFrames} from '../src/web/battle-presentation';
import {describeLine} from '../src/web/catalog';
function teams(item:string,bench?:string){
 const own=Showdown.Teams.unpack(packTeam(['Charizard','Blastoise','Venusaur'],{},{Charizard:item,...(bench?{Blastoise:bench}:{})}))!;
 own[0].moves=['Flamethrower','Growl'];
 const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;
 enemy.forEach(p=>p.moves=['Rest']);
 return {p1:Showdown.Teams.pack(own),p2:Showdown.Teams.pack(enemy)};
}
test('50 matching mega stones and a dynamax band have icons, legal forms and legendary shop grades',()=>{
 assert.equal(Object.keys(megaStones).length,50);
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const [item,info]of Object.entries(megaStones)){
  assert.ok(pokemonSets[info.species]);assert.equal(validator.validateSet({...structuredClone(pokemonSets[info.species]),...(item==='Zygardite'?{ability:'Power Construct'}:{}),item},{}),null,item);
  assert.ok(Showdown.Dex.species.get(info.forme).isMega);
  assert.equal(itemShopRule(item as keyof typeof heldItems).rarity,'legendary');
  assert.ok(publicAssetExists('public/sprites/items/'+itemIcon(item as keyof typeof heldItems)+'.'+itemIconExtension(item)));
 }
 assert.equal(itemShopRule(DYNAMAX_ITEM).rarity,'legendary');
});
test('wrong stone purchases roll back wallet, bag and ledger; a matching stone survives the next battle snapshot',()=>{
 const store=new TowerStore(':memory:');try{
 store.ensurePlayer('mega');const run=store.battle(store.start('mega',['Charizard','Blastoise','Venusaur'])).run_id;
 store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);store.db.prepare("UPDATE players SET coins=8000 WHERE id='mega'").run();
 store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(run,6,JSON.stringify(['Charizardite X','Blastoisinite',DYNAMAX_ITEM,'Leftovers']));
 const before=store.view('mega');assert.throws(()=>store.purchaseItem('mega',run,6,'Blastoisinite','Charizard'),/맞는/);assert.deepEqual(store.view('mega'),before);
 store.purchaseItem('mega',run,6,'Charizardite X','Charizard');assert.equal(store.view('mega').coins,4250);
 const battle=store.battle(store.enter('mega',run,6,['Charizard','Blastoise','Venusaur']));
 assert.equal(Showdown.Teams.unpack(battle.player_team)![0].item,'Charizardite X');
 }finally{store.close();}
});
test('mega requires a confirmed move; changes real stats/ability before attacking and consumes the shared team allowance',async()=>{
 const session=new BattleSession(async()=>{},[1,2,3,4],{teams:teams('Charizardite X',DYNAMAX_ITEM)});
 try{
 let before=await session.ready();assert.ok(before.actions.some(a=>a.command==='move 1 mega'));
 let plain=await session.submit(before.id,before.requestId,'move 2');assert.ok(!plain.messages.some(l=>l.startsWith('|-mega|')));
 const after=await session.submit(plain.id,plain.requestId,'move 1 mega'),active=after.team.find(p=>p.active)!;
 assert.equal(active.displaySpecies,'Charizard-Mega-X');assert.equal(active.ability,'Tough Claws');assert.ok(active.stats!.atk>before.team[0].stats!.atk);
 const lines=after.messages,mega=lines.findIndex(l=>l.startsWith('|-mega|'));assert.ok(mega>=0 && lines.slice(mega).some(l=>l.startsWith('|move|p1a: Charizard|')));
 const frames=presentationFrames(plain,after),charge=frames.findIndex(f=>f.motion?.kind==='mega-charge'),flash=frames.findIndex(f=>f.motion?.kind==='mega-flash'),attack=frames.findIndex(f=>f.motion?.kind==='move'&&f.motion.side==='player');
 assert.deepEqual(frames.flatMap(f=>f.motion?.kind.startsWith('mega-') ? [f.motion.kind] : []),['mega-charge','mega-shell','mega-burst','mega-flash','mega-reveal']);assert.ok(charge>=0 && flash>charge && attack>flash);assert.equal(frames[charge].view.team[0].displaySpecies,'Charizard');assert.equal(frames[flash].view.team[0].displaySpecies,'Charizard-Mega-X');
 const bench=await session.submit(after.id,after.requestId,'switch 2');assert.ok(!bench.actions.some(a=>a.command.endsWith(' dynamax')||a.command.endsWith(' mega')));
 assert.throws(()=>session.submit(bench.id,bench.requestId,'move 1 dynamax'),/선택/);
 }finally{await session.dispose();}
});
test('dynamax doubles actual HP, uses correct max move power/category, ends after three turns and blocks bench mega',async()=>{
 const session=new BattleSession(async()=>{},[1,2,3,4],{teams:teams(DYNAMAX_ITEM,'Blastoisinite')});
 try{
 let v=await session.ready(),hp=Number(v.team[0].condition.split('/')[1]);assert.equal(v.maxMovePP![0].power,130);assert.equal(v.maxMovePP![0].category,'Special');
 const beforeDynamax=v;v=await session.submit(v.id,v.requestId,'move 2 dynamax');
 const frames=presentationFrames(beforeDynamax,v);assert.deepEqual(frames.flatMap(f=>f.motion?.kind.startsWith('dynamax-') ? [f.motion.kind] : []),['dynamax-recall','dynamax-ball','dynamax-release','dynamax-grow']);
 assert.ok(!frames.some(f=>f.motion?.kind==='heal' && f.motion.side==='player'));
 const silent=v.messages.filter(l=>l.startsWith('|-heal|p1')&&l.includes('[silent]'));assert.ok(silent.length);for(const line of silent)assert.equal(describeLine(line),null);assert.match(describeLine('|-heal|p1a: Charizard|90/100')!,/회복/);
 assert.equal(v.team[0].dynamax,true);assert.equal(Number(v.team[0].condition.split('/')[1]),hp*2);assert.equal(v.team[0].item,DYNAMAX_ITEM);
 assert.equal(v.movePP![1].name,'Max Guard');assert.ok(!v.actions.some(a=>a.command.endsWith(' dynamax')));
 for(let i=0;i<2;i++)v=await session.submit(v.id,v.requestId,'move 2');
 assert.equal(v.team[0].dynamax,false);assert.equal(Number(v.team[0].condition.split('/')[1]),hp);
 v=await session.submit(v.id,v.requestId,'switch 2');assert.ok(!v.actions.some(a=>a.command.endsWith(' mega')));
 }finally{await session.dispose();}
 assert.equal(Showdown.Dex.items.get(DYNAMAX_ITEM).exists,false,'custom item must not leak into the shared Dex');
});
test('both sides share one-use restrictions and accepted gimmick actions replay exactly; old formats keep dynamax disabled',async()=>{
 const own=packTeam(['Charizard','Blastoise','Venusaur'],{},{Charizard:'Charizardite X',Blastoise:DYNAMAX_ITEM});
 const enemy=packTeam(['Gyarados','Snorlax','Gengar'],{},{Gyarados:DYNAMAX_ITEM,Gengar:'Gengarite'});
 const log=await runBattle({teams:{p1:own,p2:enemy},seed:[4,3,2,1],player:new GimmickPolicy(),opponent:new GimmickPolicy()});
 for(const side of ['p1','p2'])assert.equal(log.publicProtocol.filter(l=>(l.startsWith('|-mega|'+side)||l.startsWith('|-start|'+side)) && (/\|-mega\|/.test(l)||l.includes('|Dynamax|'))).length,1,side);
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 const old=new BattleSession(async()=>{},[1,2,3,4],{format:PRE_GIMMICK_FORMAT,teams:{p1:packTeam(['Charizard','Blastoise','Venusaur']),p2:packTeam(['Gyarados','Snorlax','Gengar'])}});
 try{const v=await old.ready();assert.ok(!v.actions.some(a=>a.command.endsWith(' dynamax')));}finally{await old.dispose();}
});

