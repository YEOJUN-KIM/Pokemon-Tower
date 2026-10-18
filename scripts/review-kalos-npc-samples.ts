import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import design from './data/npc/kalos-design.json' with {type:'json'};
import {kalosTrainers} from '../src/data/kalos-trainers';
import {pokemonSets} from '../src/data/teams';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
import {isHeldItem} from '../src/data/held-items';
import {megaStones} from '../src/data/gimmicks';
import {FORMAT} from '../src/battle/run';

const path='scripts/data/npc/normal-npc-samples.json';
const source=JSON.parse(readFileSync(path,'utf8'));
const validator=new Showdown.TeamValidator(FORMAT);
const builds:Record<string,{ability:string;item:string;moves:string[]}>=design.builds;
// Scoped set adjustments must not change partners shared with other trainers.
const overrides:Record<string,Record<string,Partial<(typeof builds)[string]>>>=design.overrides;
const utility=new Set(['toxic','willowisp','thunderwave','leechseed','dragondance','swordsdance','nastyplot','calmmind','bulkup','quiverdance','shellsmash','recover','roost','slackoff']);
const rows=[];
for(const t of kalosTrainers){
 const signature=t.mega?{rule:'mega',species:t.mega,item:Object.keys(megaStones).find(item=>megaStones[item].species===t.mega)!}:null;
 const team=t.entries.map(species=>{
  const b=structuredClone(builds[species]);assert.ok(b,species);
  Object.assign(b,structuredClone(overrides[t.id]?.[species]??{}));
  // The installed National Dex validator rejects Power Gem for both species.
  if(species==='Aurorus'||species==='Cradily')b.moves=b.moves.map(m=>m==='Power Gem'?'Ancient Power':m);
  // The requested optional Megas are ordinary partners unless explicitly assigned.
  if(megaStones[b.item])b.item='Leftovers';
  if(species===t.mega)b.item=signature!.item;
  if(t.id==='named-viola'&&species==='Scizor')b.item='Metal Coat';
  if(t.id==='named-siebold'&&species==='Gyarados')b.item='Lum Berry';
  if(t.category==='grunt'&&['Houndoom','Manectric','Mightyena','Scrafty','Liepard'].includes(species))b.item='Sitrus Berry';
  if(t.id==='flare-executive-aliana'&&species==='Houndoom')b.item='Expert Belt';
  const attacks=b.moves.map(m=>Showdown.Dex.moves.get(m)).filter(m=>m.category!=='Status');
  const physical=attacks.filter(m=>m.category==='Physical').length>attacks.filter(m=>m.category==='Special').length;
  const fast=Showdown.Dex.species.get(species).baseStats.spe>=80;
  const evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};evs[physical?'atk':'spa']=32;evs[fast?'spe':'hp']=26;evs[fast?'hp':'spd']=8;
  if(species==='Avalugg')Object.assign(evs,{atk:0,def:32,hp:26,spd:8});
  const nature=species==='Avalugg'?'Impish':physical?'Adamant':'Modest';
  assert.ok(isCollectibleSpecies(species),`Unavailable ${species}`);assert.ok(isHeldItem(b.item),b.item);
  assert.equal(validator.validateSet({...structuredClone(pokemonSets[species]),ability:b.ability,item:b.item,moves:b.moves},{}),null,`${t.id}/${species}`);
  for(const move of b.moves){const m=Showdown.Dex.moves.get(move);assert.ok(m.exists,move);if(m.category==='Status')assert.ok(utility.has(m.id),`Unsupported utility ${species}/${move}`);}
  return {species,item:b.item,gigantamax:false,role:`${physical?'Physical':'Special'} ${Showdown.Dex.species.get(species).types.join('/')} / ${b.moves.filter(m=>Showdown.Dex.moves.get(m).category==='Status').join(', ')||'coverage'}`,profile:{statSystem:'points',ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs,nature,ability:b.ability,moves:b.moves}};
 });
 for(const id of t.category==='boss'?[t.id,'named-lysandre']:[t.id])rows.push({id,name:t.name,generation:6,title:t.power,role:['grunt','executive','boss'].includes(t.category)?'villain':t.category,ace:t.ace,signature,stage:'leaders-early',allFloors:true,select:true,gimmickEnabled:!!signature,concept:t.concept,powerTier:t.power,team});
}
const pending=new Map(rows.map(r=>[r.id,r]));
source.samples=source.samples.flatMap((r:{id:string})=>{if(!rows.some(n=>n.id===r.id))return [r];const replacement=pending.get(r.id);pending.delete(r.id);return replacement?[replacement]:[];});
source.samples.push(...pending.values());
writeFileSync(path,JSON.stringify(source,null,2)+'\n');
console.log(`Reviewed ${kalosTrainers.length} Kalos NPCs (${rows.length} runtime rows).`);
