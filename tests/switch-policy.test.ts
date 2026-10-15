import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {SwitchingPolicy,CautiousSwitchingPolicy} from '../src/battle/switch-policy';
import {TeraPolicy} from '../src/battle/gimmick-policy';
import {PublicSwitchInformation} from '../src/battle/switch-information';
import {type Observation,type OwnPokemon} from '../src/battle/policy';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {packTeam,starters} from '../src/data/teams';
import {TowerStore,AI_VERSION} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';

function pokemon(name:string,active=false,moves=['Thunderbolt']):OwnPokemon{return {ident:`p2: ${name}`,details:`${name}, L50`,condition:'140/140',active,moves,stats:{atk:100,spa:100,def:100,spd:100,spe:100}};}
function observation():Observation{
 const own=pokemon('Pikachu',true),team=[own,pokemon('Gyarados',false,['Ice Fang']),pokemon('Blastoise',false,['Ice Beam'])];
 return {turn:1,ownTeam:team,opponent:{species:'Garchomp',condition:'100/100'},lastOpponentMove:'Earthquake',legalActions:[{command:'move 1',label:'Thunderbolt',estimatedDamage:0},{command:'switch 2',label:'Gyarados',estimatedDamage:-1},{command:'switch 3',label:'Blastoise',estimatedDamage:-1}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Dragon','Ground']}};
}

test('v6 escapes immune attacks and dangerous matchups while saved v5 still attacks',()=>{
 const o=observation();assert.equal(new SwitchingPolicy().choose(o),'switch 2');assert.equal(new TeraPolicy().choose(o),'move 1');
 o.ownTeam[0]=pokemon('Blastoise',true,['Surf']);o.opponent={species:'Venusaur',condition:'100/100'};o.lastOpponentMove='Energy Ball';o.switching!.opponentTypes=['Grass','Poison'];o.ownTeam[1]=pokemon('Charizard',false,['Flamethrower']);o.legalActions[0]={command:'move 1',label:'Surf',estimatedDamage:25};
 assert.equal(new SwitchingPolicy().choose(o),'switch 2');
});

test('finishing attacks, boosts, dynamax, trapping and no safe partner retain the active Pokemon',()=>{
 for(const kind of ['finish','boost','dynamax','trapped','unsafe']){
  const o=observation();
  if(kind==='finish'){o.opponent={species:'Blastoise',condition:'1/100'};o.switching!.opponentTypes=['Water'];o.legalActions[0].estimatedDamage=90;}
  if(kind==='boost')o.switching!.boosts.atk=2;
  if(kind==='dynamax')o.switching!.dynamax=true;
  if(kind==='trapped')o.legalActions=o.legalActions.slice(0,1);
  if(kind==='unsafe'){o.ownTeam[1].condition='10/140';o.ownTeam[2].condition='10/140';}
  assert.match(new SwitchingPolicy().choose(o),/^move /,kind);
 }
});

test('entry hazards can reject a partner, while boots protect it and forced replacement ranks survivors',()=>{
 const o=observation();o.ownTeam[1].condition='60/140';o.ownTeam[2].condition='0 fnt';o.legalActions=o.legalActions.slice(0,2);o.switching!.hazards.stealthRock=true;
 assert.equal(new SwitchingPolicy().choose(o),'move 1');o.ownTeam[1].item='Heavy-Duty Boots';assert.equal(new SwitchingPolicy().choose(o),'switch 2');
 const forced=observation();forced.legalActions=forced.legalActions.slice(1);forced.ownTeam[0].condition='0 fnt';assert.equal(new SwitchingPolicy().choose(forced),'switch 2');
 forced.ownTeam[1].condition='1/140';forced.ownTeam[2].condition='1/140';forced.switching!.hazards={stealthRock:true,spikes:3,toxicSpikes:2,stickyWeb:true};
 assert.ok(forced.legalActions.some(a=>a.command===new SwitchingPolicy().choose(forced)));
});

test('voluntary switches obey cooldown, return lockout and the four-switch battle limit',()=>{
 const policy=new SwitchingPolicy(),o=observation();assert.equal(policy.choose(o),'switch 2');
 for(const turn of [2,3]){o.turn=turn;assert.equal(policy.choose(o),'move 1');}
 for(const turn of [4,7,10]){o.turn=turn;assert.equal(policy.choose(o),'switch 2');}
 o.turn=13;assert.equal(policy.choose(o),'move 1');
 const other=new SwitchingPolicy(),first=observation();other.choose(first);
 const returned=observation();returned.turn=4;returned.ownTeam[1].ident=first.ownTeam[0].ident;returned.legalActions=returned.legalActions.slice(0,2);
 assert.equal(other.choose(returned),'move 1');returned.turn=6;assert.equal(other.choose(returned),'switch 2');
});

test('public switch context tracks only our hazards/boosts and public opponent tera/type changes',()=>{
 const info=new PublicSwitchInformation('p2');
 for(const line of ['|-sidestart|p1: Player|Spikes','|-sidestart|p2: Tower AI|Spikes','|-sidestart|p2: Tower AI|Spikes','|-sidestart|p2: Tower AI|Stealth Rock','|switch|p1a: Charizard|Charizard, L50|100/100','|-terastallize|p1a: Charizard|Water','|-boost|p2a: Pikachu|atk|2','|-start|p2a: Pikachu|Dynamax'])info.consume(line);
 assert.deepEqual(info.view().opponentTypes,['Water']);assert.equal(info.view().hazards.spikes,2);assert.equal(info.view().boosts.atk,2);assert.equal(info.view().dynamax,true);
 info.consume('|switch|p2a: Gyarados|Gyarados, L50|100/100');assert.deepEqual(info.view().boosts,{});assert.equal(info.view().dynamax,false);
 info.consume('|-sideend|p2: Tower AI|Spikes');assert.equal(info.view().hazards.spikes,0);
 info.consume('|switch|p1a: Venusaur|Venusaur, L50|100/100');assert.deepEqual(info.view().opponentTypes,['Grass','Poison']);
 info.consume('|-start|p1a: Venusaur|typechange|Water');assert.deepEqual(info.view().opponentTypes,['Water']);
 for(const hazard of ['Stealth Rock','Sticky Web','Toxic Spikes'])info.consume(`|-sidestart|p2: Tower AI|move: ${hazard}`);
 assert.equal(info.view().hazards.stealthRock,true);assert.equal(info.view().hazards.stickyWeb,true);assert.equal(info.view().hazards.toxicSpikes,1);
 info.consume('|-sideend|p2: Tower AI|move: Stealth Rock');assert.equal(info.view().hazards.stealthRock,false);
});

test('real v6 battle voluntarily switches before fainting, keeps observations private and replays exactly',async()=>{
 const player=Showdown.Teams.unpack(packTeam(['Garchomp','Snorlax','Venusaur']))!;player[0].moves=['Swords Dance','Earthquake','Dragon Claw','Rock Slide'];
 const enemy=Showdown.Teams.unpack(packTeam(['Pikachu','Gyarados','Blastoise']))!;enemy[0].moves=['Thunderbolt','Thunder Wave','Volt Switch','Nasty Plot'];enemy[1].moves=['Ice Fang','Waterfall','Dragon Dance','Earthquake'];
 const log=await runBattle({teams:{p1:Showdown.Teams.pack(player),p2:Showdown.Teams.pack(enemy)},seed:[2,3,4,5],opponent:new SwitchingPolicy(),player:{choose:o=>o.legalActions.find(a=>a.command==='move 1')?.command??o.legalActions[0].command}});
 const first=log.decisions.find(d=>d.side==='p2' && d.observation.turn===1)!;assert.match(first.action,/^switch [23]$/);
 for(const d of log.decisions){
  assert.ok(d.observation.ownTeam.every(p=>p.ident.startsWith(d.side)));
  if(d.side==='p1')assert.equal(d.observation.switching,undefined);
  if(d.observation.opponent)assert.deepEqual(Object.keys(d.observation.opponent).sort(),['condition','species']);
 }
 const replay=await replayBattle(log);assert.deepEqual(battleEvents(replay.publicProtocol),battleEvents(log.publicProtocol));
});

test('v5 saved battles restore with v5, while new battles record the current AI',async()=>{
 const store=new TowerStore(':memory:'),service=new TowerService(store);try{
  store.ensurePlayer('legacy');const id=store.start('legacy',starters);assert.equal(store.battle(id).ai_version,AI_VERSION);
  store.db.prepare('UPDATE battles SET ai_version=? WHERE id=?').run('tower-policy-v5',id);
  const response=await service.state('legacy');assert.equal(response.battle!.status,'waiting');assert.equal(store.battle(id).ai_version,'tower-policy-v5');
 }finally{await service.dispose();store.close();}
});

test('v7 respects uncertain own trapping warnings and a real Arena Trap battle finishes and replays',async()=>{
 const o=observation();o.switching!.maybeTrapped=true;
 assert.equal(new CautiousSwitchingPolicy().choose(o),'move 1');
 assert.equal(new SwitchingPolicy().choose(o),'switch 2'); // Saved v6 decisions are unchanged.
 const own=Showdown.Teams.unpack(packTeam(['Pikachu','Gyarados','Blastoise']))!,enemy=Showdown.Teams.unpack(packTeam(['Dugtrio','Snorlax','Venusaur']))!;
 own[0].moves=['Thunderbolt','Thunder Wave','Volt Switch','Nasty Plot'];enemy[0].ability='Arena Trap';enemy[0].moves=['Earthquake','Rock Slide','Sucker Punch','Stealth Rock'];
 const log=await runBattle({teams:{p1:Showdown.Teams.pack(own),p2:Showdown.Teams.pack(enemy)},seed:[1,2,3,4],player:new CautiousSwitchingPolicy(),opponent:new CautiousSwitchingPolicy()});
 assert.ok(log.winner);assert.ok(log.decisions.some(d=>d.observation.switching?.maybeTrapped));
 for(const d of log.decisions)if(d.observation.switching?.maybeTrapped && d.observation.legalActions.some(a=>a.command.startsWith('move ')))assert.ok(!d.action.startsWith('switch '));
 const replay=await replayBattle(log);assert.deepEqual(battleEvents(replay.publicProtocol),battleEvents(log.publicProtocol));
 const store=new TowerStore(':memory:'),service=new TowerService(store);try{
  store.ensurePlayer('v6');const id=store.start('v6',starters);store.db.prepare('UPDATE battles SET ai_version=? WHERE id=?').run('tower-policy-v6',id);
  assert.equal((await service.state('v6')).battle!.status,'waiting');
 }finally{await service.dispose();store.close();}
});
