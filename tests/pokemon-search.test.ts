import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {matchesPokemonName,createPokemonNameIndex,matchesPokemonNameIndex,preparePokemonNameQuery} from '../src/web/pokemon-search';

test('Korean names accept partial syllables, initial consonants, mixed input and Korean keyboard keys',()=>{
  for(const query of ['피카츄','피','피카','ㅍㅋㅊ','ㅍㅋ','vlzkcb','vlzk','Pikachu','PIKACHU','pika',' 피카츄 ','피ㅋ','ᄑᄏᄎ','피카츄'.normalize('NFD')])assert.ok(matchesPokemonName('피카츄','Pikachu',query),query);
  for(const query of ['전기','1세대','번개','raichu'])assert.equal(matchesPokemonName('피카츄','Pikachu',query),false,query);
  assert.ok(matchesPokemonName('쥬피썬더','Jolteon','피'));
  for(const [name,english,query] of [['잠만보','Snorlax','ㅈㅁㅂ'],['꼬부기','Squirtle','Rhqnrl'],['이상해꽃','Venusaur','dl'],['한카리아스','Garchomp','ㅎㅋㄹㅇㅅ']])assert.ok(matchesPokemonName(name,english,query));
});

test('future species support punctuation, accents, spaces, gender signs, digits and data-supplied name aliases',()=>{
  for(const [name,english,query] of [['마임맨','Mr. Mime','mrmime'],['파오리',"Farfetch’d",'farfetchd'],['플라베베','Flabébé','flabebe'],['타입:널','Type: Null','type null'],['폴리곤Z','Porygon-Z','porygonz'],['칠색조','Ho-Oh','hooh'],['니드런♀','Nidoran-F','nidoranf'],['니드런♂','Nidoran-M','♂'],['폴리곤2','Porygon2','2']])assert.ok(matchesPokemonName(name,english,query),query);
  assert.ok(matchesPokemonName('니드런♀','Nidoran-F','Nidoran♀',['Nidoran♀']));
  assert.equal(matchesPokemonName('니드런♀','Nidoran-F','♂'),false);
});

test('a precomputed index works for every species and form in the engine without species-specific search rules',()=>{
  const species=Showdown.Dex.species.all().filter(entry=>entry.num>0);
  assert.ok(species.length>1000);
  for(const entry of species) {
    const index=createPokemonNameIndex(entry.name,entry.name);
    assert.ok(matchesPokemonNameIndex(index,preparePokemonNameQuery(entry.name.toUpperCase())),entry.name);
  }
});
