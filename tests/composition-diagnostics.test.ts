import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile} from '../src/server/training';
import {compositionSnapshot,compositionChanges} from '../scripts/lib/composition-diagnostics';

test('actual move replacement records paired-screen loss without claiming all screens disappeared',()=>{
 const profiles={Espeon:defaultProfile('Espeon'),Gyarados:defaultProfile('Gyarados'),Scizor:defaultProfile('Scizor')};
 profiles.Espeon.moves=['Psychic','Reflect','Light Screen','Baton Pass'];
 const before=compositionSnapshot(Object.keys(profiles),profiles);
 profiles.Espeon.moves=['Psychic','Reflect','Shadow Ball','Baton Pass'];
 const after=compositionSnapshot(Object.keys(profiles),profiles);
 assert.deepEqual(compositionChanges(before,after).lostRoles,['pairedScreens']);
 assert(before.profiles.Espeon.moves.includes('Light Screen'));
});
test('party selection distinguishes collection coverage from selected coverage',()=>{
 const profiles={Espeon:defaultProfile('Espeon'),Gyarados:defaultProfile('Gyarados'),Scizor:defaultProfile('Scizor'),Torkoal:defaultProfile('Torkoal')};
 profiles.Espeon.moves=['Psychic'];profiles.Gyarados.moves=['Waterfall'];profiles.Scizor.moves=['Bullet Punch'];profiles.Torkoal.moves=['Flamethrower'];
 const before=compositionSnapshot(['Espeon','Gyarados','Torkoal'],profiles),after=compositionSnapshot(['Espeon','Gyarados','Scizor'],profiles);
 const change=compositionChanges(before,after);
 assert(change.lostShedinjaAnswer&&change.answerLeftInReserve);
 assert.deepEqual(after.reserveShedinjaAnswers,['Torkoal']);
});
test('Trick Room carrier needs a separate slow ally and uses current run bonuses',()=>{
 const profiles={Slowbro:defaultProfile('Slowbro'),Snorlax:defaultProfile('Snorlax'),Garchomp:defaultProfile('Garchomp')};
 profiles.Slowbro.moves=['Trick Room','Psychic'];profiles.Snorlax.runBonuses={spe:200};
 assert(!compositionSnapshot(Object.keys(profiles),profiles).roles.roomWithSlowAlly);
 profiles.Snorlax.runBonuses={spe:0};assert(compositionSnapshot(Object.keys(profiles),profiles).roles.roomWithSlowAlly);
});
