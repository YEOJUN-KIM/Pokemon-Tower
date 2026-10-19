import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {TowerStore} from '../src/server/tower-store';
import {defaultProfile,validateProfile} from '../src/server/training';
import {packTeam} from '../src/data/teams';
import {FORMAT} from '../src/data/battle-rules';
import {megaStones} from '../src/data/gimmicks';
import {megaAbilityCorrections} from '../src/data/mega-abilities';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('Bloodmoon Ursaluna is adjacent, independently owned/trained and usable in battle',async()=>{
 const entries=pokedexEntries(),index=entries.findIndex(p=>p.species==='Ursaluna'),blood=entries[index+1];
 assert.equal(blood.species,'Ursaluna-Bloodmoon');assert.equal(blood.name,'다투곰');assert.equal(blood.region,'붉은달');
 assert.equal(blood.nationalId,901);assert.equal(blood.generation,9);assert.equal(blood.battleReady,true);
 assert.deepEqual(blood.baseStats,Showdown.Dex.species.get(blood.species).baseStats);assert.equal(blood.ability,"Mind's Eye");
 const profile=defaultProfile(blood.species);assert.ok(profile.moves.includes('Blood Moon'));validateProfile(blood.species,profile);
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('bloodmoon');store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('bloodmoon',blood.species);
  assert.ok(!store.view('bloodmoon').unlocked.includes('Ursaluna'));
  const training=store.trainingCollection('bloodmoon').find(p=>p.species===blood.species)!;
  assert.ok(!training.formOptions?.length);assert.equal(training.profile.ability,"Mind's Eye");
  const teams={p1:packTeam([blood.species,'Blastoise','Venusaur']),p2:packTeam(['Unown','Luvdisc','Delibird'])};
  assert.equal(new Showdown.TeamValidator(FORMAT).validateTeam(Showdown.Teams.unpack(teams.p1)!),null);
  const log=await runBattle({teams,rule:'basic',player:new DamagePolicy(),opponent:new DamagePolicy()});
  assert.ok(log.winner);assert.ok(log.publicProtocol.some(line=>line.includes('Ursaluna-Bloodmoon')));
 }finally{store.close();}
});

test('confirmed new Mega abilities replace outdated preview data',()=>{
 const forms=pokedexEntries().flatMap(p=>p.forms??[]);
 for(const [species,ability] of Object.entries(megaAbilityCorrections)){
  assert.equal(forms.find(p=>p.species===species)?.ability,ability);
  assert.equal(Object.values(megaStones).some(stone=>stone.forme===species),species==='Golisopod-Mega','Only the explicitly versioned Golisopod opt-in may become playable');
 }
});

test('every playable Mega changes to its native Mega ability in the battle engine',()=>{
 for(const [item,stone] of Object.entries(megaStones)){
  const battle=new Showdown.Battle({formatid:FORMAT});try{
   battle.setPlayer('p1',{name:'Player',team:Showdown.Teams.unpack(packTeam([stone.species,'Blastoise','Venusaur'],{},{[stone.species]:item}))!});
   battle.setPlayer('p2',{name:'Opponent',team:Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!});
   battle.makeChoices('team 123','team 123');
   const pokemon=battle.p1.active[0];if(item==='Zygardite'){pokemon.formeChange('Zygarde-Complete',battle.dex.abilities.get('Power Construct'),true);pokemon.canMegaEvo=battle.actions.canMegaEvo(pokemon);}assert.ok(battle.actions.runMegaEvo(pokemon),stone.forme);
   const expected=Showdown.toID(Showdown.Dex.species.get(stone.forme).abilities[0]);
   assert.equal(pokemon.species.name,stone.forme);assert.equal(pokemon.baseAbility,expected,stone.forme);
   // Trace immediately copies the opposing Snorlax's Immunity after gaining Trace.
   assert.equal(pokemon.ability,expected==='trace'?'immunity':expected,stone.forme);
  }finally{battle.destroy();}
 }
});
