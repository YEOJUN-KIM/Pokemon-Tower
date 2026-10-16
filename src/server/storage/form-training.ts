import type {DatabaseSync} from 'node:sqlite';
import type {FormTrainingSettings,TrainingProfile} from '../../data/training';
import {familyForms} from '../../data/selectable-forms';
import {defaultProfile} from '../training';

export function formTrainingSettings(profile:TrainingProfile):FormTrainingSettings {
 return {moves:[...profile.moves],ability:profile.ability,teraType:profile.teraType!};
}

// Only these settings belong to the form. Stats, nature, gender and shiny stay
// on the family's shared training record and are composed when read.
export function trainingFormProfile(db:DatabaseSync,owner:string,base:string,shared:TrainingProfile,species=shared.forme??base):TrainingProfile {
 if(!familyForms(base).length)return shared;
 const forme=species===base?undefined:species;
 const row=db.prepare('SELECT settings FROM pokemon_form_training WHERE player_id=? AND form_species=?').get(owner,species) as {settings:string}|undefined;
 const settings:FormTrainingSettings=row?JSON.parse(row.settings):formTrainingSettings(forme===shared.forme?shared:defaultProfile(base,forme));
 const profile={...shared,...settings,moves:[...settings.moves]};
 delete profile.forme;if(forme)profile.forme=forme;
 return profile;
}

export function saveTrainingForm(db:DatabaseSync,owner:string,base:string,profile:TrainingProfile,overwrite=true){
 if(!familyForms(base).length)return;
 const values=[owner,profile.forme??base,base,JSON.stringify(formTrainingSettings(profile))];
 if(overwrite)db.prepare('INSERT INTO pokemon_form_training VALUES (?,?,?,?) ON CONFLICT(player_id,form_species) DO UPDATE SET settings=excluded.settings').run(...values);
 else db.prepare('INSERT OR IGNORE INTO pokemon_form_training VALUES (?,?,?,?)').run(...values);
}
