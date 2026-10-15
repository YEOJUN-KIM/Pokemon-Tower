import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {LearningOpponentPolicy} from '../src/battle/learning-opponent-policy';
import {CautiousSwitchingPolicy} from '../src/battle/switch-policy';
import {DamagePolicy,type Observation,type OwnPokemon} from '../src/battle/policy';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {packTeam} from '../src/data/teams';
import {abilityLearningCases} from '../scripts/lib/ability-learning-cases';
import {TowerStore,AI_VERSION} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';

for(const [index,c] of abilityLearningCases.entries())for(const control of [false,true]){
 test(`enemy ${c.attacker} vs ${c.target}: ${control?'non-immune control':c.ability+' learned after probe'}`,async()=>{
  const targets=Showdown.Teams.unpack(packTeam([c.target,'Blastoise','Snorlax']))!;
  targets[0].ability=control?c.control:c.ability;
  targets[0].moves[0]='Rest';
  const attackers=Showdown.Teams.unpack(packTeam([c.attacker,'Snorlax','Scizor']))!;
  attackers[0].moves=[...c.moves];
  const ai=new LearningOpponentPolicy();
  const damage=new DamagePolicy();let probed=false;
  const log=await runBattle({rule:'basic',seed:[10+index,22,33,44],teams:{p1:Showdown.Teams.pack(targets),p2:Showdown.Teams.pack(attackers)},player:{choose:o=>o.turn===1&&o.legalActions.some(a=>a.command==='move 1')?'move 1':damage.choose(o)},
   opponent:{switchingInformation:true,uncertainSwitchingInformation:true,observePublicLine:l=>ai.observePublicLine(l),choose(o){const action=ai.choose(o);if(!probed&&o.turn===1&&o.legalActions.some(a=>a.command==='move 1')){probed=true;return 'move 1';}return action;}}});
  const next=log.decisions.find(d=>d.side==='p2'&&d.observation.turn===2)!;
  assert(next);
  const first=log.publicProtocol.slice(log.publicProtocol.indexOf('|turn|1'),log.publicProtocol.indexOf('|turn|2'));
  assert(first.some(l=>l.startsWith('|move|p2a: ')&&l.includes('|'+c.moves[0]+'|')));
  if(control)assert(first.some(l=>l.startsWith('|-damage|p1a: '+c.target+'|')));
  else{
   assert(next.action.startsWith('move '),'attack with available alternative');
   const move=next.observation.legalActions.find(a=>a.command===next.action)!;
   assert.notEqual(Showdown.Dex.moves.get(move.label).type,c.blockedType);
  }
  for(const d of log.decisions)assert(d.observation.legalActions.some(a=>a.command===d.action));
  assert.deepEqual(battleEvents(log.publicProtocol),battleEvents((await replayBattle(log)).publicProtocol));
 });
}
function observation():Observation{
 const own=(name:string,moves:string[],active:boolean):OwnPokemon=>({ident:'p2: '+name,details:name,condition:'180/180',active,ability:'Natural Cure',moves,stats:{atk:100,def:100,spa:150,spd:100,spe:120}});
 return {turn:1,ownTeam:[own('Starmie',['Surf','Psychic'],true),own('Espeon',['Psychic'],false)],opponent:{species:'Quagsire',condition:'100/100'},legalActions:[{command:'move 1',label:'Surf',estimatedDamage:90},{command:'move 2',label:'Psychic',estimatedDamage:70},{command:'switch 2',label:'Espeon',estimatedDamage:-1}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:['Water','Ground']}};
}
test('enemy learns only public information, keeps alternative attacks and respects bypass',()=>{
 const o=observation(),ai=new LearningOpponentPolicy();
 assert.equal(ai.choose(o),new CautiousSwitchingPolicy().choose(o));
 ai.observePublicLine('|request|{"side":{"pokemon":[{"ability":"waterabsorb"}]}}');
 ai.observePublicLine('|-ability|p2a: Starmie|Water Absorb');
 assert.equal(ai.choose(o),'move 1','own ability or requests do not reveal opponent ability');
 ai.observePublicLine('|move|p2a: Starmie|Surf|p1a: Quagsire');
 ai.observePublicLine('|-immune|p1a: Quagsire|[from] ability: Water Absorb');
 o.turn=2;assert.equal(ai.choose(o),'move 2');
 o.ownTeam[0].ability='Mold Breaker';assert.equal(ai.choose(o),'move 1');
 o.ownTeam[0].ability='Natural Cure';
 ai.observePublicLine('|switch|p1a: Quagsire|Quagsire, L50|100/100');
 assert.equal(ai.choose(o),'move 1','new opponent entry clears prior evidence');
});
test('no attack answer permits a bounded safe switch, with trap and dynamax guards',()=>{
 for(const guard of ['none','trap','dynamax','entry-ko']){
  const o=observation(),ai=new LearningOpponentPolicy();
  o.legalActions=o.legalActions.filter(a=>a.command!=='move 2');o.ownTeam[0].moves=['Surf'];
  ai.choose(o);ai.observePublicLine('|-immune|p1a: Quagsire|[from] ability: Water Absorb');o.turn=2;
  if(guard==='trap')o.switching!.maybeTrapped=true;
  if(guard==='dynamax')o.switching!.dynamax=true;
  if(guard==='entry-ko'){o.switching!.hazards.stealthRock=true;o.ownTeam[1].condition='1/180';}
  assert.equal(ai.choose(o),guard==='none'?'switch 2':'move 1');
  if(guard==='none'){o.turn=3;assert.equal(ai.choose(o),'move 1','cooldown prevents repeated switches');}
 }
});
test('when no ally has an answer, the enemy still returns a legal action',()=>{
 const o=observation(),ai=new LearningOpponentPolicy();
 o.legalActions=o.legalActions.filter(a=>a.command!=='move 2');o.ownTeam.forEach(p=>p.moves=['Surf']);
 ai.observePublicLine('|-immune|p1a: Quagsire|[from] ability: Water Absorb');
 assert.equal(ai.choose(o),'move 1');
});
test('new battles run the current AI and saved v7 battles remain resumable',async()=>{
 for(const version of [AI_VERSION,'tower-policy-v7']){
  const store=new TowerStore(':memory:'),service=new TowerService(store);
  try{
   store.ensurePlayer('learning');const id=store.start('learning',['Charizard','Blastoise','Venusaur']);
   assert.equal(store.battle(id).ai_version,AI_VERSION);
   if(version==='tower-policy-v7')store.db.prepare('UPDATE battles SET ai_version=? WHERE id=?').run(version,id);
   assert.equal((await service.state('learning')).battle!.status,'waiting');
   assert.equal(store.battle(id).ai_version,version);
  }finally{await service.dispose();store.close();}
 }
});
