import type {TrainingProfile,TrainingView} from '../data/training';

export function profileForForm(entry:TrainingView,species:string):TrainingProfile {
 const form=entry.formOptions?.find(option=>option.species===species);
 if(!form)throw Error('Unknown selectable form');
 const settings=form.settings??form;
 // Shared training comes from the current draft; never load it from another form.
 const profile:TrainingProfile={...entry.profile,moves:[...settings.moves],ability:settings.ability,teraType:settings.teraType as TrainingProfile['teraType']};
 delete profile.forme;if(species!==entry.species)profile.forme=species;
 return profile;
}
