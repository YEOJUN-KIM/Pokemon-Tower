import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import design from '../scripts/data/npc/alola-design.json' with {type:'json'};
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {alolaSample,alolaTrainers} from '../src/data/alola-trainers';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {FORMAT,runBattle,battleEvents,type BattleLog} from '../src/battle/run';
import {packTeam,pokemonSets,starters} from '../src/data/teams';
import {mechanicObserver,tuningTelemetry} from '../scripts/lib/alola-tuning-telemetry';
import {DamagePolicy,estimateDamage} from '../src/battle/policy';
import {createNpcPolicy} from '../src/battle/npc-policy';

const lineups:Record<string,string[]>={
 'named-olivia':['Cradily','Relicanth','Lycanroc'],
 'named-kahili':['Skarmory','Toucannon','Hawlucha'],
 'named-kiawe':['Arcanine','Talonflame','Marowak-Alola'],
};

for(const [id,lineup]of Object.entries(lineups))test(`${id}: all floors and 100 seeds keep fixed order, legal sets and original rank budgets`,()=>{
 const sample=alolaSample(alolaTrainers.find(t=>t.id===id)!),validator=new Showdown.TeamValidator(FORMAT);
 for(const floor of [5,45,54,55,75,95,100]){
  const row=normalNpcTemplate(id,floor,sample.role)!;assert.equal(row.team.length,3);assert.deepEqual(row.required,lineup);
  assert.equal(sample.aiCeiling,id==='named-kiawe'?'tactical':'expert');
  for(const p of row.team){assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),moves:p.profile.moves,nature:p.profile.nature,ability:p.profile.ability,item:p.item},{}),null,p.species);assert.equal(Object.values(p.profile.evs).reduce((a,b)=>a+b,0),id==='named-kiawe'?48:66);}
  for(let n=1;n<=100;n++)assert.deepEqual(generateOpponentTeam(floor,[n,floor,29,43],[],null,sample,CURRENT_PROGRESSION).map(p=>p.name),lineup);
 }
});

function fixture(species:string,item:string,moves:string[],ability:string,enemy='Shuckle',enemyMove='Withdraw'){
 const battle=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 const own=Showdown.Teams.unpack(packTeam([species,'Blastoise','Venusaur']))!,opponent=Showdown.Teams.unpack(packTeam([enemy,'Snorlax','Blissey']))!;
 Object.assign(own[0],{item,moves,ability});opponent[0].moves=[enemyMove];
 battle.setPlayer('p1',{name:'Player',team:opponent});battle.setPlayer('p2',{name:'Tower AI',team:own});battle.makeChoices('team 123','team 123');return battle;
}
test('White Herb after Close Combat resets defenses, actually doubles Unburden speed and doubles Acrobatics base power',()=>{
 const battle=fixture('Hawlucha','White Herb',['Close Combat','Acrobatics'],'Unburden');
 try{
  const p=battle.p2.active[0],speed=p.getStat('spe'),acro=Showdown.Dex.moves.get('Acrobatics');
  const power=()=>Number((acro.basePowerCallback as any).call(battle,p,battle.p1.active[0],acro));assert.equal(power(),55);
  battle.makeChoices('move 1','move 1');assert.equal(p.item,'');assert.equal(p.boosts.def,0);assert.equal(p.boosts.spd,0);assert.ok(p.volatiles.unburden);assert.equal(p.getStat('spe'),speed*2);assert.equal(power(),110);
  assert.ok(battle.log.some(l=>l.includes('|-enditem|p2')&&l.includes('|White Herb')));
 }finally{battle.destroy();}
});
test('modern Gale Wings wins priority at full HP; Brave Bird recoil removes that advantage next turn',()=>{
 const battle=fixture('Talonflame','Sharp Beak',['Brave Bird'],'Gale Wings','Electrode','Light Screen');
 try{
  const p=battle.p2.active[0];assert.ok(battle.p1.active[0].getStat('spe')>p.getStat('spe'));
  battle.makeChoices('move 1','move 1');assert.ok(p.hp<p.maxhp);const first=battle.log.filter(l=>l.startsWith('|move|'));assert.ok(first[0].startsWith('|move|p2'));
  const index=battle.log.length;battle.makeChoices('move 1','move 1');assert.ok(battle.log.slice(index).find(l=>l.startsWith('|move|'))!.startsWith('|move|p1'));
 }finally{battle.destroy();}
});
test('Thick Club doubles actual Alolan Marowak attack through the installed engine event',()=>{
 for(const [item,expected]of [['Thick Club',200],['',100]] as const){const battle=fixture('Marowak-Alola',item,['Shadow Bone'],'Lightning Rod');try{assert.equal(battle.runEvent('ModifyAtk',battle.p2.active[0],null,null,100),expected);}finally{battle.destroy();}}
});
test('Rock Head permits a landed Head Smash without recoil; Relicanth Psychic coverage remains usable against Toxicroak',()=>{
 const battle=fixture('Relicanth','Choice Band',['Head Smash'],'Rock Head');try{
  const p=battle.p2.active[0],hp=p.hp;battle.makeChoices('move 1','move 1');assert.ok(battle.log.some(l=>l.startsWith('|-damage|p1')));assert.equal(p.hp,hp);assert.equal(p.item,'choiceband');
 }finally{battle.destroy();}
 const coverage=fixture('Relicanth','Choice Band',['Head Smash','Waterfall','Earthquake','Zen Headbutt'],'Rock Head','Toxicroak','Bulk Up');
 try{
  const p=coverage.p2.active[0],own={ident:'p2a: Relicanth',details:'Relicanth, L50',condition:`${p.hp}/${p.maxhp}`,active:true,stats:{atk:p.getStat('atk'),def:p.getStat('def'),spa:p.getStat('spa'),spd:p.getStat('spd'),spe:p.getStat('spe')}};
  const actions=p.moveSlots.map((m,i)=>({command:`move ${i+1}`,label:m.move,estimatedDamage:estimateDamage(m.move,own,'Toxicroak')}));
  const choice=createNpcPolicy({tier:'expert',tactic:'bulk'}).choose({turn:1,ownTeam:[own],opponent:{species:'Toxicroak',condition:'100/100'},legalActions:actions});assert.equal(choice,'move 4');
  coverage.makeChoices('move 1',choice as string);assert.ok(coverage.log.some(l=>l.startsWith('|move|p2')&&l.includes('|Zen Headbutt|')));
 }finally{coverage.destroy();}
});
test('telemetry resolves public Alolan nicknames, excludes residuals from direct/Z KOs, and retains helmet credit',()=>{
 const log={teams:{p2:packTeam(['Marowak-Alola','Skarmory','Hawlucha'])},decisions:[],turns:3,publicProtocol:[
  '|switch|p2a: Marowak|Marowak-Alola, L50|100/100','|turn|1','|move|p2a: Marowak|Shadow Bone|p1a: A','|-damage|p1a: A|0 fnt','|faint|p1a: A',
  '|turn|2','|move|p1a: B|Tackle|p2a: Marowak','|-damage|p1a: B|0 fnt|[from] psn','|faint|p1a: B',
  '|switch|p2a: Skarmory|Skarmory, L50|100/100','|turn|3','|move|p1a: C|Tackle|p2a: Skarmory','|-damage|p1a: C|0 fnt|[from] item: Rocky Helmet|[of] p2a: Skarmory','|faint|p1a: C',
 ]} as unknown as BattleLog;
 const r=tuningTelemetry(log,{unburden:false,thickClub:false,galePriority:[]});assert.equal(r.pokemon['Marowak-Alola'].directKOs,1);assert.equal(r.pokemon['Marowak-Alola'].moves['Shadow Bone'],1);assert.equal(r.pokemon.Skarmory.residualKOs,1);assert.equal(r.z.directKOs,0);
});
test('audit event observer leaves actual battle output unchanged and always restores the installed method',async()=>{
 const options={teams:{p1:packTeam(starters),p2:packTeam(['Hawlucha','Talonflame','Marowak-Alola'],{}, {'Marowak-Alola':'Thick Club'})},seed:[1,2,3,4] as [number,number,number,number],rule:'basic' as const};
 const original=await runBattle({...options,player:new DamagePolicy(),opponent:new DamagePolicy()}),observer=mechanicObserver();
 try{const observed=await runBattle({...options,player:new DamagePolicy(),opponent:new DamagePolicy()});assert.deepEqual(battleEvents(observed.publicProtocol),battleEvents(original.publicProtocol));assert.deepEqual(observed.decisions,original.decisions);}finally{observer.restore();}
});
