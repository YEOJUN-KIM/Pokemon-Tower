// Previous fixed-team progression fixtures deliberately start with an already developed 6V collection.
// New 6Z recruitment behavior is tested separately with real persisted opponent IVs.
import {legacySets} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import type {TowerStore} from '../src/server/tower-store';
export function classicCollection(store:TowerStore,owner:string) {
  for(const [name,set] of Object.entries(legacySets)) {
    const profile=defaultProfile(name);profile.moves=[...set.moves];profile.ivs={...set.ivs};delete profile.statSystem;
    store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run(owner,name,JSON.stringify(profile));
  }
}
