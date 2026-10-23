import {publicAssetExists} from './helpers/runtime-assets';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {paldeaTrainers,paldeaSample,paldeaEventSamples} from '../src/data/paldea-trainers';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {npcGimmick} from '../src/data/npc-gimmicks';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {AdvancedSwitchPolicy} from '../src/battle/advanced-switch-policy';
import {evaluateSwitchCandidates} from '../src/battle/switch-evaluation';
import {DamagePolicy,type Observation,type OwnPokemon} from '../src/battle/policy';
import {packTeam,pokemonSets,starters} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents,FORMAT} from '../src/battle/run';
import {towerThemes} from '../src/data/tower-themes';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {hiddenBossEligible} from '../src/server/hidden-boss-events';
import preservation from './fixtures/paldea-preservation.json' with {type:'json'};
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {randomUUID} from 'node:crypto';

test('every non-Paldea reviewed/runtime row stays equal to HEAD',()=>{
 for(const [path,hash]of Object.entries(preservation.hashes)){const d=JSON.parse(readFileSync(path,'utf8'));const rows=(d.samples??d).filter((r:{id:string})=>r.id!=='named-ariana'&&!preservation.excluded.includes(r.id)&&!paldeaTrainers.some(t=>t.id===r.id));assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),hash,path);}
});
test('exactly 14 reviewed triples, 12 live identities, 2 event-only identities',()=>{
 assert.equal(paldeaTrainers.length,14);assert.equal(trainerCatalog.filter(t=>t.generation===9).length,12);assert.equal(paldeaEventSamples.length,2);
 for(const id of ['named-katy','named-larry','named-giacomo','named-penny','named-arven','named-ai-sada','named-ai-turo'])assert.ok(!trainerCatalog.some(t=>t.id===id));
 assert.deepEqual(towerThemes.paldea.organizations,[]);assert.equal(hiddenBossEligible('paldea',50,'named-geeta'),true);
 assert.equal(towerTrainerEncounter(50,'paldea-test','paldea',true)!.boss.id,'named-geeta');
 assert.equal(towerTrainerEncounter(50,'paldea-test','paldea',true,true)!.boss.id,'named-nemona');
});
for(const t of paldeaTrainers)test(`${t.id}: exact legal ordered builds and designated Tera, ordinary held items retained`,()=>{
 const sample=paldeaSample(t),validator=new Showdown.TeamValidator(FORMAT);
 assert.ok(publicAssetExists(`public/sprites/trainers/${sample.portrait}.png`));
 for(const floor of [45,95]){
  const snap=snapshotTrainerEventBattle(`paldea:${t.id}:${floor}`,sample,floor,'basic',CURRENT_PROGRESSION),sets=Showdown.Teams.unpack(snap.opponentTeam)!;
  assert.deepEqual(sets.map(s=>s.species),t.entries);assert.ok(normalNpcTemplate(t.id,floor,sample.role));
  for(let i=0;i<3;i++){const p=sets[i],spec=t.team[i];assert.deepEqual(p.moves,spec.moves);assert.equal(p.ability,spec.ability);assert.equal(p.item,spec.item);assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.ability,item:p.item,moves:p.moves,nature:p.nature},{}),null);}
  if(t.teraType){assert.equal(sets[2].teraType,t.teraType);assert.equal(npcGimmick(t.id,9,t.entries,t.ace)?.species,t.ace);assert.equal(snap.opponentTeraTickets,floor>= (sample.role==='champion'?50:55)?1:0);}
  else {assert.equal(npcGimmick(t.id,9,t.entries,t.ace),null);assert.equal(snap.opponentTeraTickets,0);assert.ok(!t.entries.includes('Koraidon')&&!t.entries.includes('Miraidon'));}
 }
});
for(const t of paldeaTrainers)test(`${t.id}: actual policy battle and deterministic replay`,async()=>{
 const sample=paldeaSample(t),snap=snapshotTrainerEventBattle('paldea-real:'+t.id,sample,95,'basic',CURRENT_PROGRESSION);
 const log=await runBattle({teams:{p1:packTeam(starters),p2:snap.opponentTeam},seed:snap.seed,rule:'basic',opponentRule:snap.opponentTeraTickets?'tera':'basic',teraTickets:{p1:0,p2:snap.opponentTeraTickets},opponentTeraSpecies:t.teraType?t.ace:undefined,player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(95,sample))});
 assert.ok(log.winner);assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 for(const l of log.publicProtocol.filter(l=>l.startsWith('|-terastallize|p2')))assert.ok(l.includes(t.ace+'|'+t.teraType));
 if(t.category==='champion'){
  assert.equal(log.publicProtocol.find(l=>l.startsWith('|switch|p2'))?.split('|')[3].split(',')[0],'Glimmora');
  assert.ok(log.decisions.filter(d=>d.side==='p2'&&d.action.startsWith('switch ')).every(d=>!d.observation.legalActions.some(a=>a.command.startsWith('move '))));
 }
 if(t.category==='event')assert.ok(!log.publicProtocol.some(l=>l.startsWith('|-terastallize|p2')));
});

const mon=(name:string,active:boolean,moves:string[],spe=180):OwnPokemon=>({ident:`p2: ${name}`,details:name+', L50',active,condition:'200/200',stats:{atk:100,def:90,spa:100,spd:90,spe},moves,ability:'',item:''});
function obs(pivot=true):Observation{
 const own=mon('Dragapult',true,pivot?['Dragon Darts','U-turn']:['Dragon Darts','Shadow Ball']),bench=mon('Aegislash',false,['Flash Cannon','Shadow Ball'],70);bench.stats.def=150;bench.stats.spd=150;
 return {turn:3,ownTeam:[own,bench],opponent:{species:'Dragonite',condition:'100/100'},lastOpponentMove:'Dragon Claw',legalActions:[{command:'move 1',label:own.moves![0],estimatedDamage:50},{command:'move 2',label:own.moves![1],estimatedDamage:20},{command:'switch 2',label:'Switch',estimatedDamage:-1}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:[]}};
}
test('an Elite with no pivot uses the same evaluator for a real direct switch choice',()=>{
 const o=obs(false),p=new AdvancedSwitchPolicy(new DamagePolicy());assert.equal(evaluateSwitchCandidates(o).recommended?.pokemon.ident,'p2: Aegislash');assert.equal(p.choose(o),'switch 2');assert.equal(p.lastEvaluation?.mode,'switch');
 assert.equal(createNpcPolicy(npcAi(95,{kind:'elite',role:'elite',tactic:'balanced'})).choose(o),'switch 2');
 assert.equal(npcAi(95,{kind:'normal',tactic:'balanced'}).advancedSwitch,undefined);
 assert.equal(npcAi(20,{kind:'elite',tactic:'balanced'}).advancedSwitch,undefined);
});
test('safe pivot, slow lethal pivot, KO and favorable matchup choose distinct actions',()=>{
 const o=obs();assert.equal(new AdvancedSwitchPolicy(new DamagePolicy()).choose(o),'move 2');
 o.ownTeam[0].stats.spe=10;o.ownTeam[0].condition='10/200';assert.equal(new AdvancedSwitchPolicy(new DamagePolicy()).choose(o),'switch 2');
 o.opponent!.condition='1/100';assert.equal(new AdvancedSwitchPolicy(new DamagePolicy()).choose(o),'move 1');
 const favorable=obs();favorable.opponent={species:'Blissey',condition:'100/100'};favorable.lastOpponentMove='Seismic Toss';assert.equal(new AdvancedSwitchPolicy(new DamagePolicy()).choose(favorable),'move 1');
});
test('Volt Switch immune targets require direct switching; revealed abilities only',()=>{
 const o=obs();o.ownTeam[0]=mon('Pawmot',true,['Close Combat','Volt Switch']);o.legalActions[0].label='Close Combat';o.legalActions[1].label='Volt Switch';o.opponent={species:'Garchomp',condition:'100/100'};o.lastOpponentMove='Earthquake';o.ownTeam[1]=mon('Corviknight',false,['Brave Bird'],70);
 assert.equal(new AdvancedSwitchPolicy(new DamagePolicy()).choose(o),'switch 2');
});
test('direct switch excludes entry death and 20% remaining HP; Boots recover candidate value',()=>{
 const o=obs(false);Object.assign(o.switching!.hazards,{stealthRock:true,spikes:3});
 o.ownTeam[1].condition='10/200';assert.equal(evaluateSwitchCandidates(o).recommended,undefined);
 o.ownTeam[1].condition='100/200';assert.equal(evaluateSwitchCandidates(o).recommended,undefined);
 o.ownTeam[1].item='Heavy-Duty Boots';assert.equal(new AdvancedSwitchPolicy(new DamagePolicy()).choose(o),'switch 2');
});
test('direct switching shares Poison absorption and Web speed costs',()=>{
 const o=obs(false),poison=mon('Weezing',false,['Sludge Bomb'],140);poison.stats.def=150;poison.ability='Neutralizing Gas';o.ownTeam[1]=poison;
 Object.assign(o.switching!.hazards,{toxicSpikes:2,stickyWeb:true});const r=evaluateSwitchCandidates(o).recommended!;
 assert.ok(r);assert.equal(r.entry.absorbBenefit,.12);assert.ok(r.entry.speedCost>0);
 poison.item='Heavy-Duty Boots';assert.equal(evaluateSwitchCandidates(o).recommended?.entry.damage,0);assert.equal(evaluateSwitchCandidates(o).recommended?.entry.speedCost,0);
});
test('pivot and direct switch share a cooldown; a rejected hazard target cannot leak through fallback',()=>{
 const o=obs(false),p=new AdvancedSwitchPolicy({choose:o=>o.legalActions.find(a=>a.command.startsWith('switch '))?.command??o.legalActions[0].command});
 assert.equal(p.choose(o),'switch 2');assert.equal(p.choose({...o,turn:4}),'move 1');
 o.ownTeam[1].condition='1/200';assert.equal(p.choose({...o,turn:7}),'move 1');
});
test('a non-pivot Elite actually switches to the Dragon-resistant receiver in the engine',async()=>{
 const own=Showdown.Teams.unpack(packTeam(['Dragapult','Aegislash','Charizard']))!,foe=Showdown.Teams.unpack(packTeam(['Dragonite','Blastoise','Venusaur']))!;
 own[0].moves=['Protect','Shadow Ball','Flamethrower','Thunderbolt'];foe[0].moves=['Dragon Claw'];const policy=new AdvancedSwitchPolicy(new DamagePolicy());let protectedOnce=false;
 const log=await runBattle({teams:{p1:Showdown.Teams.pack(foe),p2:Showdown.Teams.pack(own)},rule:'basic',player:new DamagePolicy(),opponent:{switchingInformation:true,uncertainSwitchingInformation:true,observePublicLine:l=>policy.observePublicLine(l),choose:o=>{const protect=o.legalActions.find(a=>a.label==='Protect');if(!protectedOnce&&protect){protectedOnce=true;return protect.command;}return policy.choose(o);}}});
 assert.ok(log.decisions.some(d=>d.side==='p2'&&d.action==='switch 2'&&d.observation.legalActions.some(a=>a.command.startsWith('move '))));
 assert.ok(log.publicProtocol.some(l=>l.startsWith('|switch|p2a: Aegislash|')));assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
test('Nemona preserves a full-Sash lead setup action before advanced exits',()=>{
 const t=paldeaTrainers.find(t=>t.id==='named-nemona')!,o=obs(false);o.turn=1;o.ownTeam[0]=mon('Lycanroc',true,['Stealth Rock','Accelerock','Stone Edge','Close Combat']);o.ownTeam[0].item='Focus Sash';o.legalActions[0]={command:'move 1',label:'Stealth Rock',estimatedDamage:0};o.legalActions[1]={command:'move 2',label:'Accelerock',estimatedDamage:15};
 assert.equal(createNpcPolicy(npcAi(100,paldeaSample(t))).choose(o),'move 1');
});
test('Paldea saved policy, Tera plan and accepted public history survive disk reconnect',async()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path),service=new TowerService(store);
 try{
  store.ensurePlayer('paldea-save');const initial=store.battle(store.start('paldea-save',starters,'basic')),run=initial.run_id;
  store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(initial.id);store.db.prepare("UPDATE run_themes SET theme='paldea' WHERE run_id=?").run(run);store.db.prepare("UPDATE runs SET floor=50,state='select' WHERE id=?").run(run);
  const row=store.battle(store.enter('paldea-save',run,50,starters)),boss=JSON.parse(row.boss!);
  assert.equal(boss.id,'named-geeta');assert.equal(boss.npcAi.paldea,'named-geeta');assert.equal(boss.gimmick.species,'Kingambit');assert.equal(Showdown.Teams.unpack(row.opponent_team)![2].teraType,'Dark');
  const ready=(await service.state('paldea-save')).battle!,played=(await service.action('paldea-save',row.id,ready.requestId,ready.actions.find(a=>a.command.startsWith('move '))!.command)).battle!;
  await service.dispose();store.close();store=new TowerStore(path);service=new TowerService(store);
  const restored=(await service.state('paldea-save')).battle!;assert.deepEqual(battleEvents(restored.messages),battleEvents(played.messages));assert.equal(store.battle(row.id).opponent_team,row.opponent_team);assert.deepEqual(JSON.parse(store.battle(row.id).boss!).npcAi,boss.npcAi);
 }finally{await service.dispose();store.close();}
});
test('all requested abilities and moves exist in the installed engine, without substitutions',()=>{
 for(const t of paldeaTrainers)for(const p of t.team){const ability=Showdown.Dex.abilities.get(p.ability);assert.ok(ability.exists&&!ability.isNonstandard);for(const m of p.moves)assert.ok(Showdown.Dex.moves.get(m).exists);}
 assert.equal(paldeaTrainers.find(t=>t.id==='named-nemona')!.team[1].moves.includes('Revival Blessing'),false);
});
function engine(own:string[],enemy='Blissey'){
 const p2=Showdown.Teams.unpack(packTeam(own))!,p1=Showdown.Teams.unpack(packTeam([enemy,'Snorlax','Venusaur']))!;p1[0].moves=['Protect'];
 const b=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});return {b,p1,p2,start(){b.setPlayer('p1',{name:'Player',team:p1});b.setPlayer('p2',{name:'Tower AI',team:p2});b.makeChoices('team 123','team 123');}};
}
test('Protean changes only once per entry in generation 9 and resets on reentry',()=>{
 const e=engine(['Meowscarada','Pawmot','Lycanroc']);e.p2[0].ability='Protean';e.p2[0].moves=['Knock Off','Flower Trick'];
 try{e.start();e.b.p1.active[0].hp=e.b.p1.active[0].maxhp=10000;e.b.makeChoices('move 1','move 1');assert.deepEqual(e.b.p2.active[0].getTypes(),['Dark']);e.b.makeChoices('move 1','move 2');assert.deepEqual(e.b.p2.active[0].getTypes(),['Dark']);e.b.makeChoices('move 1','switch 2');e.b.makeChoices('move 1','switch 2');e.b.makeChoices('move 1','move 2');assert.deepEqual(e.b.p2.active[0].getTypes(),['Grass']);}finally{e.b.destroy();}
});
test('Electric Tera Mismagius retains Levitate and ignores Ground damage',()=>{
 const e=engine(['Mismagius','Bellibolt','Kilowattrel'],'Garchomp');e.p2[0].ability='Levitate';e.p2[0].teraType='Electric';e.p2[0].moves=['Tera Blast'];e.p1[0].moves=['Earthquake'];
 try{e.start();const p=e.b.p2.active[0],hp=p.hp;e.b.makeChoices('move 1','move 1 terastallize');assert.equal(p.terastallized,'Electric');assert.equal(p.hp,hp);assert.ok(e.b.log.some(l=>l.startsWith('|-immune|p2a: Mismagius')));}finally{e.b.destroy();}
});
test('Geeta Toxic Debris and Supreme Overlord use the actual engine state',()=>{
 const e=engine(['Glimmora','Espathra','Kingambit'],'Snorlax');e.p2[0].ability='Toxic Debris';e.p2[0].moves=['Stealth Rock'];e.p2[2].ability='Supreme Overlord';e.p1[0].moves=['Tackle'];
 try{e.start();e.b.makeChoices('move 1','move 1');assert.ok(e.b.p1.sideConditions.toxicspikes);assert.ok(e.b.p1.sideConditions.stealthrock);
  const king=e.b.p2.pokemon.find(p=>p.baseSpecies.name==='Kingambit')!;
  e.b.p2.active[0].faint();e.b.faintMessages();e.b.p2.pokemon.find(p=>p.baseSpecies.name==='Espathra')!.faint();e.b.faintMessages();
  assert.equal(e.b.p2.totalFainted,2);king.isActive=true;e.b.p2.active[0]=king;e.b.singleEvent('Start',king.getAbility(),king.abilityState,king);assert.equal(king.abilityState.fallen,2);
 }finally{e.b.destroy();}
});
