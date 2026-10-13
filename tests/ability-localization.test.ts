import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {species} from '../src/web/catalog';
import {abilityNames} from '../src/web/pokedex-data';
import descriptions from '../src/data/ability-descriptions.json';

test('every ability exposed in the dex, form previews or battle catalogue has a Korean name and description',()=>{
 const used=new Set<string>();
 for(const entry of pokedexEntries()){
  for(const ability of Object.values(Showdown.Dex.species.get(entry.species).abilities))used.add(ability);
  used.add(entry.ability);for(const form of entry.forms??[])used.add(form.ability);
 }
 for(const name of Object.keys(species))for(const ability of Object.values(Showdown.Dex.species.get(name).abilities))used.add(ability);
 for(const ability of used){
  assert.match(abilityNames[ability]??'',/[가-힣]/,ability+' name');
  assert.match((descriptions as Record<string,string>)[ability]??'',/[가-힣]/,ability+' description');
  assert.ok(!/[a-z]/i.test(abilityNames[ability].replace('AR시스템','시스템')),ability+' untranslated name');
  assert.ok(!/[a-z]/i.test((descriptions as Record<string,string>)[ability].replace(/\b(?:HP|PP|Z)\b/g,'')),ability+' untranslated description');
 }
});
