import type {Battle} from 'pokemon-showdown';

// Installed 0.11.11 has the correct forme/stats but the old placeholder ability.
// Upstream: smogon/pokemon-showdown 490b7fb, data/pokedex.ts:14530.
// Only the new opt-in format calls this. Shared Dex and old saved formats stay
// untouched; normal Golisopod retains Emergency Exit.
export function installGolisopodMega(battle:Battle){
 const base=battle.dex,local=Object.create(base) as typeof base;
 const species=Object.create(base.species) as typeof base.species;
 const native=base.species.get('Golisopod-Mega');
 const corrected=Object.assign(Object.create(Object.getPrototypeOf(native)),native,{abilities:{...native.abilities,0:'Tough Claws'}}) as typeof native;
 species.get=(name:Parameters<typeof base.species.get>[0])=>{const result=base.species.get(name);return result.id==='golisopodmega'?corrected:result;};
 Object.defineProperty(local,'species',{value:species});battle.dex=local;
}
