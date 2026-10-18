import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {towerThemes} from '../src/data/tower-themes';
import {pokemonSets} from '../src/data/teams';
import {FORMAT} from '../src/battle/run';
import {isHeldItem} from '../src/data/held-items';
import {statKeys,type StatBlock,type TrainingProfile} from '../src/data/training';

const path='scripts/data/npc/normal-npc-samples.json';
const source=JSON.parse(readFileSync(path,'utf8'));
const config=towerThemes.kanto,ids=[...config.gyms,...config.elites,config.champion,config.final];
const ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;
const roles={physical:{hp:10,atk:32,def:0,spa:0,spd:0,spe:24},special:{hp:10,atk:0,def:0,spa:32,spd:0,spe:24},bulkySpecial:{hp:24,atk:0,def:10,spa:32,spd:0,spe:0},bulkyPhysical:{hp:24,atk:32,def:0,spa:0,spd:10,spe:0},wall:{hp:26,atk:0,def:24,spa:0,spd:16,spe:0},mixed:{hp:14,atk:26,def:0,spa:26,spd:0,spe:0}};
function member(species:string,ability:string,item:string,moves:string[],role:keyof typeof roles='physical'){
 return {species,item,gigantamax:false,profile:{ivs:{...ivs},evs:{...roles[role]},moves,ability,nature:'Serious',teraType:Showdown.Dex.species.get(species).types[0],statSystem:'points'} as TrainingProfile};
}
const m=member;
const gymRef='https://www.serebii.net/heartgoldsoulsilver/gym-rematch.shtml';
const pwtRef='https://www.serebii.net/black2white2/pwt/kanto.shtml';
const eliteRef='https://www.serebii.net/fireredleafgreen/elitefour.shtml';
type Plan={team:ReturnType<typeof member>[];reason:string;references:string[];selectionRules?:{atLeastOneOf?:string[];preferredLead?:string[];preferredLast?:string[]}};
const plans:Record<string,Plan>={
 'named-brock':{references:[gymRef,pwtRef],reason:'딱구리와 화석 중심 바위 파티. 중복 STAB와 Wring Out을 정리하고 물리·특수 화석의 역할을 나눈다.',team:[
  m('Golem','Sturdy','Sitrus Berry',['Earthquake','Rock Slide','Sucker Punch','Rock Polish']),
  m('Aerodactyl','Rock Head','Hard Stone',['Rock Slide','Aerial Ace','Earthquake','Ice Fang']),
  m('Omastar','Shell Armor','Mystic Water',['Surf','Ancient Power','Ice Beam','Shell Smash'],'special'),
  m('Kabutops','Battle Armor','Muscle Band',['Waterfall','Stone Edge','Aqua Jet','Swords Dance']),
  m('Relicanth','Rock Head','Leftovers',['Head Smash','Waterfall','Earthquake','Yawn'],'bulkyPhysical'),
  m('Rampardos','Mold Breaker','Expert Belt',['Rock Slide','Earthquake','Fire Punch','Crunch']),
 ]},
 'named-misty':{references:[gymRef],reason:'빠른 아쿠스타와 실제 HGSS 물 파트너. 전기 무효/흡수와 얼음 견제, 회복을 분담한다.',team:[
  m('Starmie','Natural Cure','Wise Glasses',['Surf','Psychic','Ice Beam','Recover'],'special'),
  m('Quagsire','Water Absorb','Leftovers',['Earthquake','Waterfall','Recover','Toxic'],'bulkyPhysical'),
  m('Lapras','Water Absorb','Sitrus Berry',['Surf','Ice Beam','Freeze-Dry','Body Slam'],'bulkySpecial'),
  m('Lanturn','Volt Absorb','Magnet',['Surf','Thunderbolt','Ice Beam','Volt Switch'],'bulkySpecial'),
  m('Floatzel','Water Veil','Mystic Water',['Waterfall','Ice Punch','Crunch','Aqua Jet']),
  m('Milotic','Marvel Scale','Lum Berry',['Surf','Ice Beam','Recover','Dragon Tail'],'bulkySpecial'),
 ]},
 'named-ltsurge':{references:[gymRef],reason:'빠른 전기 압박·마비·피벗. 전기 중복과 Focus Punch를 제거하고 에이스의 특수 배분을 맞춘다.',selectionRules:{atLeastOneOf:['Magnezone','Electivire','Manectric']},team:[
  m('Raichu','Static','Focus Sash',['Thunderbolt','Grass Knot','Focus Blast','Nasty Plot'],'special'),
  m('Electrode','Static','Light Clay',['Thunderbolt','Volt Switch','Thunder Wave','Reflect'],'special'),
  m('Magnezone','Sturdy','Magnet',['Thunderbolt','Flash Cannon','Volt Switch','Mirror Coat'],'special'),
  m('Electivire','Motor Drive','Expert Belt',['Thunder Punch','Ice Punch','Earthquake','Cross Chop']),
  m('Manectric','Lightning Rod','Wise Glasses',['Thunderbolt','Flamethrower','Volt Switch','Snarl'],'special'),
  m('Pachirisu','Volt Absorb','Sitrus Berry',['Nuzzle','Super Fang','Seed Bomb','Volt Switch'],'wall'),
 ]},
 'named-erika':{references:[gymRef,pwtRef],reason:'흡수·상태이상과 물리/특수 풀 공격. 날씨 시동자가 없으므로 엽록소를 날씨 파티로 오인하지 않는다.',team:[
  m('Vileplume','Effect Spore','Black Sludge',['Giga Drain','Sludge Bomb','Moonblast','Moonlight'],'bulkySpecial'),
  m('Tangrowth','Regenerator','Leftovers',['Power Whip','Earthquake','Knock Off','Sleep Powder'],'bulkyPhysical'),
  m('Victreebel','Chlorophyll','Expert Belt',['Leaf Blade','Poison Jab','Sucker Punch','Swords Dance']),
  m('Bellossom','Chlorophyll','Sitrus Berry',['Giga Drain','Moonblast','Quiver Dance','Strength Sap'],'special'),
  m('Shiftry','Chlorophyll','Black Glasses',['Leaf Blade','Knock Off','Sucker Punch','Swords Dance']),
  m('Roserade','Natural Cure','Wise Glasses',['Giga Drain','Sludge Bomb','Shadow Ball','Sleep Powder'],'special'),
 ]},
 'named-koga-kanto':{references:[eliteRef,'https://www.serebii.net/heartgoldsoulsilver/elitefour.shtml'],reason:'관동 또도가스 에이스와 독/교란. Belch·혼합 중복을 없애고 부유·상태이상·벌레/악 견제를 분담한다.',team:[
  m('Weezing','Levitate','Sitrus Berry',['Sludge Bomb','Flamethrower','Thunderbolt','Will-O-Wisp'],'bulkySpecial'),
  m('Muk','Sticky Hold','Black Sludge',['Poison Jab','Knock Off','Fire Punch','Shadow Sneak'],'bulkyPhysical'),
  m('Crobat','Inner Focus','Sharp Beak',['Brave Bird','Cross Poison','U-turn','Roost']),
  m('Venomoth','Tinted Lens','Focus Sash',['Bug Buzz','Sludge Bomb','Quiver Dance','Sleep Powder'],'special'),
  m('Toxicroak','Dry Skin','Black Belt',['Drain Punch','Poison Jab','Sucker Punch','Swords Dance']),
  m('Skuntank','Aftermath','Black Glasses',['Poison Jab','Crunch','Sucker Punch','Flamethrower'],'bulkyPhysical'),
 ]},
 'named-sabrina':{references:[gymRef],reason:'미래예지만 남던 후반 즉발 에스퍼 STAB 복구. 에이스와 실제 HGSS 후보, 보조 둘만 붙는 조합을 제외한다.',selectionRules:{atLeastOneOf:['Espeon','Jynx','Gallade']},team:[
  m('Alakazam','Magic Guard','Focus Sash',['Psychic','Shadow Ball','Focus Blast','Dazzling Gleam'],'special'),
  m('Espeon','Synchronize','Twisted Spoon',['Psychic','Shadow Ball','Dazzling Gleam','Calm Mind'],'special'),
  m('Mr. Mime','Soundproof','Light Clay',['Psychic','Dazzling Gleam','Reflect','Thunder Wave'],'special'),
  m('Jynx','Dry Skin','Never-Melt Ice',['Ice Beam','Psychic','Lovely Kiss','Nasty Plot'],'special'),
  m('Wobbuffet','Shadow Tag','Sitrus Berry',['Counter','Mirror Coat','Encore','Destiny Bond'],'wall'),
  m('Gallade','Steadfast','Expert Belt',['Psycho Cut','Close Combat','Leaf Blade','Swords Dance']),
 ]},
 'named-blaine':{references:[gymRef,pwtRef],reason:'불꽃 정체성을 유지하며 원작의 번개펀치/번개/와일드볼트/에너지볼 계열 견제를 분담한다. Drought는 추가하지 않는다.',selectionRules:{atLeastOneOf:['Ninetales','Magmortar','Rapidash']},team:[
  m('Arcanine','Intimidate','Sitrus Berry',['Flare Blitz','Extreme Speed','Wild Charge','Close Combat']),
  m('Ninetales','Flash Fire','Wise Glasses',['Flamethrower','Energy Ball','Nasty Plot','Will-O-Wisp'],'special'),
  m('Magmortar','Flame Body','Expert Belt',['Flamethrower','Thunderbolt','Focus Blast','Psychic'],'special'),
  m('Rapidash','Flash Fire','Muscle Band',['Flare Blitz','Wild Charge','High Horsepower','Morning Sun']),
  m('Houndoom','Flash Fire','Black Glasses',['Flamethrower','Dark Pulse','Sludge Bomb','Nasty Plot'],'special'),
  m('Magcargo','Flame Body','Leftovers',['Lava Plume','Power Gem','Earth Power','Recover'],'bulkySpecial'),
 ]},
 'named-giovanni-gym':{references:[pwtRef],reason:'로켓단 보스와 분리된 땅 관장. 니드킹 특수 coverage와 물리 땅 파트너로 중복 드릴라이너/역린을 정리한다.',team:[
  m('Nidoking','Sheer Force','Life Orb',['Earth Power','Sludge Wave','Ice Beam','Thunderbolt'],'special'),
  m('Nidoqueen','Sheer Force','Expert Belt',['Earth Power','Sludge Bomb','Ice Beam','Flamethrower'],'bulkySpecial'),
  m('Rhyperior','Solid Rock','Leftovers',['Earthquake','Rock Slide','Megahorn','Ice Punch'],'bulkyPhysical'),
  m('Dugtrio','Arena Trap','Focus Sash',['Earthquake','Stone Edge','Sucker Punch','Aerial Ace']),
  m('Golem','Sturdy','Sitrus Berry',['Earthquake','Rock Slide','Sucker Punch','Rock Polish']),
  m('Marowak','Rock Head','Soft Sand',['Earthquake','Fire Punch','Double-Edge','Rock Slide'],'bulkyPhysical'),
 ]},
 'named-lorelei':{references:[eliteRef],reason:'충분히 강한 기존 라프라스/루주라/맘모꾸리 공격 구성을 보존하고 원작 물/얼음/야도란 후보를 추가한다. 파르셀에게 껍질깨기 등 일괄 강화는 추가하지 않는다.',selectionRules:{atLeastOneOf:['Jynx','Slowbro','Mamoswine']},team:[
  m('Lapras','Water Absorb','Leftovers',['Surf','Ice Beam','Aqua Tail','Double-Edge'],'mixed'),
  m('Jynx','Oblivious','Never-Melt Ice',['Ice Beam','Future Sight','Psychic','Blizzard'],'special'),
  m('Mamoswine','Oblivious','Sitrus Berry',['Icicle Crash','Earthquake','Body Slam','Toxic']),
  m('Dewgong','Thick Fat','Lum Berry',['Surf','Ice Beam','Rest','Sleep Talk'],'bulkySpecial'),
  m('Cloyster','Skill Link','Muscle Band',['Icicle Spear','Rock Blast','Razor Shell','Ice Shard']),
  m('Slowbro','Regenerator','Mystic Water',['Surf','Psychic','Ice Beam','Slack Off'],'bulkySpecial'),
 ]},
 'named-bruno-kanto':{references:[eliteRef,'https://www.serebii.net/heartgoldsoulsilver/elitefour.shtml','https://www.serebii.net/letsgopikachueevee/elitefour.shtml'],reason:'기합펀치/Steel Roller/메가톤 계열을 즉발 STAB·선공·coverage로 정리. 원작 록/강철 파트너와 격투 분담.',team:[
  m('Machamp','No Guard','Sitrus Berry',['Dynamic Punch','Stone Edge','Knock Off','Poison Jab'],'bulkyPhysical'),
  m('Steelix','Sturdy','Leftovers',['Heavy Slam','Earthquake','Rock Slide','Toxic'],'bulkyPhysical'),
  m('Hitmonlee','Reckless','Wide Lens',['High Jump Kick','Blaze Kick','Knock Off','Mach Punch']),
  m('Hitmonchan','Iron Fist','Black Belt',['Drain Punch','Mach Punch','Ice Punch','Thunder Punch']),
  m('Poliwrath','Water Absorb','Mystic Water',['Waterfall','Drain Punch','Ice Punch','Bulk Up']),
  m('Lucario','Inner Focus','Expert Belt',['Close Combat','Meteor Mash','Extreme Speed','Swords Dance']),
 ]},
 'named-agatha':{references:[eliteRef,'https://www.serebii.net/letsgopikachueevee/elitefour.shtml'],reason:'기존 팬텀/크로뱃/무우마직의 핵심 기술을 유지한다. 실제 독 파트너를 복구하되 유령 고화력 포켓몬을 더 끼워 넣지 않는다. 진화형 무우마직은 기존 프로젝트 관례다.',team:[
  m('Gengar','Cursed Body','Leftovers',['Shadow Ball','Sludge Bomb','Will-O-Wisp','Energy Ball'],'special'),
  m('Crobat','Inner Focus','Poison Barb',['Cross Poison','Brave Bird','Toxic','Sludge Bomb'],'mixed'),
  m('Mismagius','Levitate','Sitrus Berry',['Shadow Ball','Future Sight','Will-O-Wisp','Dark Pulse'],'special'),
  m('Arbok','Intimidate','Black Sludge',['Gunk Shot','Crunch','Glare','Sucker Punch']),
  m('Weezing','Levitate','Wise Glasses',['Sludge Bomb','Flamethrower','Thunderbolt','Will-O-Wisp'],'bulkySpecial'),
 ]},
 'named-lance-kanto':{references:[eliteRef,'https://www.serebii.net/heartgoldsoulsilver/elitefour.shtml','https://www.serebii.net/letsgopikachueevee/elitefour.shtml'],reason:'물리 전술과 불일치하던 망나뇽/킹드라 기술을 정리한다. 성도 목호의 마지막 배치 규칙은 복사하지 않는다.',team:[
  m('Dragonite','Inner Focus','Lum Berry',['Dragon Claw','Fire Punch','Extreme Speed','Dragon Dance']),
  m('Gyarados','Intimidate','Leftovers',['Waterfall','Ice Fang','Earthquake','Dragon Dance']),
  m('Aerodactyl','Rock Head','Hard Stone',['Rock Slide','Aerial Ace','Earthquake','Roost']),
  m('Charizard','Blaze','Charcoal',['Flamethrower','Air Slash','Dragon Pulse','Roost'],'special'),
  m('Kingdra','Sniper','Mystic Water',['Surf','Dragon Pulse','Ice Beam','Focus Energy'],'special'),
  m('Salamence','Intimidate','Expert Belt',['Dragon Claw','Earthquake','Flamethrower','Dragon Dance']),
 ]},
 'named-blue':{references:[gymRef,eliteRef],reason:'피죤투 메가 특성에 맞는 특수 STAB를 복구하고 실제 그린의 혼합 파트너를 확장한다. 에이스 마지막 고정은 없다.',team:[
  m('Pidgeot','Keen Eye','Wise Glasses',['Hurricane','Heat Wave','U-turn','Roost'],'special'),
  m('Alakazam','Synchronize','Twisted Spoon',['Psychic','Shadow Ball','Focus Blast','Recover'],'special'),
  m('Arcanine','Intimidate','Muscle Band',['Flare Blitz','Extreme Speed','Close Combat','Will-O-Wisp']),
  m('Blastoise','Torrent','Mystic Water',['Surf','Ice Beam','Dark Pulse','Aqua Jet'],'bulkySpecial'),
  m('Exeggutor','Chlorophyll','Sitrus Berry',['Giga Drain','Psychic','Sleep Powder','Leech Seed'],'bulkySpecial'),
  m('Machamp','No Guard','Leftovers',['Dynamic Punch','Stone Edge','Knock Off','Bullet Punch'],'bulkyPhysical'),
 ]},
 'named-red-kanto':{references:['https://www.serebii.net/heartgoldsoulsilver/red.shtml'],reason:'기존 피카츄 거다이맥스와 3마리 핵심 기술을 보존하고 실제 HGSS 6마리를 후보화한다. 미지원 전기구슬을 추가하지 않고 기존 자석과 기믹 도구의 교체를 관찰한다.',team:[
  m('Pikachu','Static','Magnet',['Thunderbolt','Grass Knot','Volt Switch','Quick Attack'],'special'),
  m('Charizard','Blaze','Heavy-Duty Boots',['Flamethrower','Air Slash','Dragon Pulse','Roost'],'special'),
  m('Lapras','Water Absorb','Expert Belt',['Surf','Ice Beam','Thunderbolt','Sing'],'bulkySpecial'),
  m('Venusaur','Overgrow','Black Sludge',['Giga Drain','Sludge Bomb','Earth Power','Sleep Powder'],'bulkySpecial'),
  m('Blastoise','Torrent','Mystic Water',['Surf','Ice Beam','Dark Pulse','Aqua Jet'],'bulkySpecial'),
  m('Snorlax','Thick Fat','Leftovers',['Body Slam','Crunch','Earthquake','Rest'],'bulkyPhysical'),
 ]},
};
assert.deepEqual(Object.keys(plans).sort(),[...ids].sort(),'Plans must exactly match the live Kanto theme.');
const validator=new Showdown.TeamValidator(FORMAT);
const validationErrors:string[]=[];
const reviewed=ids.map(id=>{
 const original=source.samples.find((r:any)=>r.id===id),plan=plans[id];assert.ok(original,id);
 assert.ok(plan.team.length>=5&&plan.team.length<=6);assert.equal(new Set(plan.team.map(p=>p.item)).size,plan.team.length,id+' duplicate items');
 for(const p of plan.team){assert.ok(isHeldItem(p.item),p.species+': '+p.item);const errors=validator.validateSet({...structuredClone(pokemonSets[p.species]),moves:p.profile.moves,ability:p.profile.ability,item:p.item},{});if(errors)validationErrors.push(`${id}/${p.species}: ${errors.join('; ')}`);}
 const carrier=plan.team.find(p=>p.species===original.signature.species);assert.ok(carrier,id+' carrier');
 if(original.signature.rule==='tera')carrier.profile.teraType=original.team.find((p:any)=>p.species===carrier.species).profile.teraType;
 return {id,name:original.name,generation:original.generation,title:original.title,role:original.role,ace:original.ace,signature:original.signature,stage:original.role==='champion'?'first-gate':'leaders-early',allFloors:true,select:true,required:[original.ace],...(plan.selectionRules?{selectionRules:plan.selectionRules}:{}),gimmickEnabled:true,team:plan.team};
});
assert.deepEqual(validationErrors,[],'All reviewed builds must be legal before writing.');
const inserted=new Set<string>(),byId=new Map(reviewed.map(row=>[row.id,row]));
source.samples=source.samples.flatMap((row:any)=>{const replacement=byId.get(row.id);if(!replacement)return [row];if(inserted.has(row.id))return [];inserted.add(row.id);return [replacement];});
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(readFileSync(path,'utf8')),source);
else writeFileSync(path,JSON.stringify(source,null,2)+'\n');
if(!process.argv.includes('--check'))writeFileSync('artifacts/experiments/balance/kanto-completion-20261018/design-review.json',JSON.stringify(Object.entries(plans).map(([id,plan])=>({id,reason:plan.reason,references:plan.references})),null,2)+'\n');
console.log(`Reviewed ${reviewed.length} Kanto NPCs; ${source.samples.length} total templates.`);
